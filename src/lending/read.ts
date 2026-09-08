import { parseAbi, zeroAddress, type Address } from 'viem';
import { poolAbi, tokenAbi, reserveData, type LendingIO } from './service';
import type { LendingAsset, LendingMarket } from './config';

const oracleAbi = parseAbi(['function getAssetPrice(address asset) view returns (uint256)', 'function BASE_CURRENCY_UNIT() view returns (uint256)', 'function BASE_CURRENCY() view returns (address)']);
export interface AssetSnapshot {
  asset: LendingAsset; wallet: bigint; supplied: bigint; debt: bigint; liquidity: bigint;
  price: bigint; supplyApy: number; borrowApy: number; ltv: number; liquidationThreshold?: number; active: boolean; frozen: boolean; paused: boolean; borrowing: boolean; collateral?: boolean;
}
export interface PoolSnapshot { assets: AssetSnapshot[]; collateral: bigint; debt: bigint; available: bigint; health: bigint; unit: bigint; liquidationThreshold?: bigint; eMode?: number }
export async function readPool(io: Pick<LendingIO, 'read'>, market: LendingMarket, account?: Address): Promise<PoolSnapshot> {
  const unit = await io.read({ address: market.oracle, abi: oracleAbi, functionName: 'BASE_CURRENCY_UNIT' }) as bigint;
  const currency = await io.read({ address: market.oracle, abi: oracleAbi, functionName: 'BASE_CURRENCY' });
  if (currency !== zeroAddress) throw new Error('This dashboard requires a USD-denominated oracle.');
  if (unit <= 0n) throw new Error('Invalid oracle base unit.');
  const data = account ? await io.read({ address: market.pool, abi: poolAbi, functionName: 'getUserAccountData', args: [account] }) as readonly bigint[] : [0n, 0n, 0n, 0n, 0n, 0n];
  const userConfig = account ? await io.read({ address: market.pool, abi: poolAbi, functionName: 'getUserConfiguration', args: [account] }) as { data: bigint } : { data: 0n };
  const eMode = account ? Number(await io.read({ address: market.pool, abi: poolAbi, functionName: 'getUserEMode', args: [account] })) : 0;
  const assets = await Promise.all(market.assets.map(async asset => {
    const r = await reserveData(io, market, asset);
    const balance = async (token: Address) => account ? await io.read({ address: token, abi: tokenAbi, functionName: 'balanceOf', args: [account] }) as bigint : 0n;
    const [wallet, supplied, debt, liquidity, price] = await Promise.all([
      balance(asset.address), balance(r.aTokenAddress), balance(r.variableDebtTokenAddress),
      io.read({ address: asset.address, abi: tokenAbi, functionName: 'balanceOf', args: [r.aTokenAddress] }) as Promise<bigint>,
      io.read({ address: market.oracle, abi: oracleAbi, functionName: 'getAssetPrice', args: [asset.address] }) as Promise<bigint>,
    ]);
    const bits = r.configuration.data;
    return { asset, wallet, supplied, debt, liquidity, price, collateral: !!(userConfig.data & (1n << BigInt(2 * r.id + 1))),
      supplyApy: (Math.expm1(Number(r.currentLiquidityRate) / 1e27)) * 100,
      borrowApy: (Math.expm1(Number(r.currentVariableBorrowRate) / 1e27)) * 100,
      ltv: Number(bits & 65535n) / 100,
      liquidationThreshold: Number((bits >> 16n) & 65535n),
      active: !!(bits & (1n << 56n)), frozen: !!(bits & (1n << 57n)), borrowing: !!(bits & (1n << 58n)), paused: !!(bits & (1n << 60n)),
    };
  }));
  return { assets, collateral: data[0], debt: data[1], available: data[2], health: data[5], unit, liquidationThreshold: data[3], eMode };
}
export function availableAmount(action: 'supply' | 'borrow' | 'repay' | 'withdraw', row: AssetSnapshot, pool: PoolSnapshot) {
  const min = (a: bigint, b: bigint) => a < b ? a : b;
  if (action === 'supply') return row.wallet;
  if (action === 'repay') return min(row.wallet, row.debt);
  if (action === 'withdraw') return min(row.supplied, row.liquidity);
  return row.price > 0n ? min(pool.available * 10n ** BigInt(row.asset.decimals) / row.price, row.liquidity) : 0n;
}
