import { parseUnits, maxUint256, zeroAddress, type Abi, type Address, type Hash } from 'viem';
import poolJson from '../abi/Pool.json';
import tokenJson from '../abi/IERC20.json';
import type { Action } from '../model';
import type { LendingAsset, LendingMarket } from './config';

export const poolAbi = poolJson.abi as Abi;
export const tokenAbi = tokenJson.abi as Abi;
export interface Call { address: Address; abi: Abi; functionName: string; args?: readonly unknown[] }
export interface Session { address: Address; chainId: number; connector: string }
export interface LendingIO {
  read: (call: Call) => Promise<unknown>;
  send: (call: Call) => Promise<Hash>;
  wait: (hash: Hash) => Promise<{ status: string; transactionHash: Hash }>;
  session: () => Promise<Session>;
}
export interface ReserveData {
  id: number;
  configuration: { data: bigint }; aTokenAddress: Address; variableDebtTokenAddress: Address;
  currentLiquidityRate: bigint; currentVariableBorrowRate: bigint;
}
export function parseAmount(input: string, decimals: number) {
  if (!/^\d+(\.\d+)?$/.test(input) || (input.split('.')[1]?.length ?? 0) > decimals) throw new Error(`Enter a positive amount with at most ${decimals} decimals.`);
  const value = parseUnits(input, decimals);
  if (value <= 0n || value >= maxUint256) throw new Error('Enter a positive amount within the supported range.');
  return value;
}
export async function reserveData(io: Pick<LendingIO, 'read'>, market: LendingMarket, asset: LendingAsset) {
  const r = await io.read({ address: market.pool, abi: poolAbi, functionName: 'getReserveData', args: [asset.address] }) as ReserveData;
  if (!r?.aTokenAddress || r.aTokenAddress === zeroAddress || !r.variableDebtTokenAddress || r.variableDebtTokenAddress === zeroAddress) throw new Error('Asset is not listed in this pool.');
  const decimals = await io.read({ address: asset.address, abi: tokenAbi, functionName: 'decimals' });
  if (Number(decimals) !== asset.decimals) throw new Error('Token decimals do not match the deployment configuration.');
  return r;
}
export function poolCall(action: Action, market: LendingMarket, asset: LendingAsset, amount: bigint, account: Address): Call {
  const args = action === 'supply' ? [asset.address, amount, account, 0]
    : action === 'borrow' ? [asset.address, amount, 2n, 0, account]
    : action === 'repay' ? [asset.address, amount, 2n, account]
    : [asset.address, amount, account];
  return { address: market.pool, abi: poolAbi, functionName: action, args };
}
export type Progress = { message: string; hash?: Hash };
export class ReceiptPendingError extends Error {
  constructor(public hash: Hash) { super('Transaction submitted, but confirmation is not available yet. Check the explorer before trying again.'); }
}
const locks = new Set<string>();
export async function executeLending(io: LendingIO, request: {
  chainId: number; account: Address; market: LendingMarket; asset: LendingAsset; action: Action; amount: string;
  onProgress?: (progress: Progress) => void;
}) {
  const { chainId, account, market, asset, action, onProgress = () => {} } = request;
  const amount = parseAmount(request.amount, asset.decimals);
  if (!market.assets.some(a => a.address === asset.address && a.decimals === asset.decimals)) throw new Error('Asset does not belong to this market.');
  const original = await io.session();
  const check = async () => {
    const current = await io.session();
    if (current.chainId !== chainId || current.address.toLowerCase() !== account.toLowerCase() || current.connector !== original.connector) throw new Error('Wallet account or network changed. Review the transaction again.');
  };
  await check();
  const key = `${chainId}:${account.toLowerCase()}`;
  if (locks.has(key)) throw new Error('A lending transaction is already pending.');
  locks.add(key);
  try {
    await reserveData(io, market, asset);
    const confirmed = async (call: Call, label: string) => {
      await check();
      onProgress({ message: `${label}: confirm in your wallet` });
      const hash = await io.send(call);
      onProgress({ message: `${label}: waiting for confirmation`, hash });
      const receipt = await io.wait(hash).catch(() => { throw new ReceiptPendingError(hash); });
      if (receipt.status !== 'success') throw new Error(`${label} reverted. No position update was applied.`);
      return receipt.transactionHash;
    };
    if (action === 'supply' || action === 'repay') {
      const allowanceCall: Call = { address: asset.address, abi: tokenAbi, functionName: 'allowance', args: [account, market.pool] };
      const balance = await io.read({ address: asset.address, abi: tokenAbi, functionName: 'balanceOf', args: [account] }) as bigint;
      if (balance < amount) throw new Error('Insufficient token balance.');
      const allowance = await io.read(allowanceCall) as bigint;
      if (allowance < amount) {
        // Reset non-zero allowances for tokens that require zero-before-approve.
        if (allowance > 0n) await confirmed({ address: asset.address, abi: tokenAbi, functionName: 'approve', args: [market.pool, 0n] }, 'Reset approval');
        await confirmed({ address: asset.address, abi: tokenAbi, functionName: 'approve', args: [market.pool, amount] }, 'Approve');
        if (await io.read(allowanceCall) as bigint < amount) throw new Error('Token approval was not applied.');
      }
    }
    return await confirmed(poolCall(action, market, asset, amount, account), action[0].toUpperCase() + action.slice(1));
  } finally { locks.delete(key); }
}
export type LendingRequest = Omit<Parameters<typeof executeLending>[1], 'action'>;
export const supply = (io: LendingIO, request: LendingRequest) => executeLending(io, { ...request, action: 'supply' });
export const repay = (io: LendingIO, request: LendingRequest) => executeLending(io, { ...request, action: 'repay' });
export const borrow = (io: LendingIO, request: LendingRequest) => executeLending(io, { ...request, action: 'borrow' });
export const withdraw = (io: LendingIO, request: LendingRequest) => executeLending(io, { ...request, action: 'withdraw' });
