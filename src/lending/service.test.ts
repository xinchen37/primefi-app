import { describe, expect, it, vi } from 'vitest';
import { encodeFunctionData, zeroAddress, type Address, type Hash } from 'viem';
import { loadLendingConfig, validateConfig } from './config';
import { borrow, supply, withdraw, repay, parseAmount, poolCall, ReceiptPendingError, type Call, type LendingIO } from './service';

const account = '0x1111111111111111111111111111111111111111' as Address;
const hash = `0x${'1'.repeat(64)}` as Hash;
async function setup() {
  const config = await loadLendingConfig(46630), market = config.markets[0], asset = market.assets[0];
  let allowance = 0n;
  const read = vi.fn<LendingIO['read']>(async (call: Call) => {
    if (call.functionName === 'getReserveData') return { aTokenAddress: account, variableDebtTokenAddress: account };
    if (call.functionName === 'decimals') return 6;
    if (call.functionName === 'balanceOf') return 100_000_000n;
    if (call.functionName === 'allowance') return allowance;
    throw new Error('Unexpected read');
  });
  const send = vi.fn(async (call: Call) => { if (call.functionName === 'approve') allowance = call.args![1] as bigint; return hash; });
  const session = vi.fn(async () => ({ address: account, chainId: 46630, connector: 'test' }));
  const io: LendingIO = { read, send, session, wait: vi.fn(async () => ({ status: 'success', transactionHash: hash })) };
  return { io, read, send, session, request: { chainId: 46630, account, market, asset, amount: '1.234567' }, setAllowance: (v: bigint) => { allowance = v; } };
}
describe('deployment configuration', () => {
  it('keeps the USDG reserve scoped to two different pools', async () => {
    const c = await loadLendingConfig(46630);
    expect(c.markets[0].pool).not.toBe(c.markets[1].pool);
    expect(c.markets.map(m => m.assets.map(a => a.symbol))).toEqual([['USDG', 'WETH'], ['USDG', 'NVDA']]);
  });
  it('fails closed on mainnet and invalid backend responses', async () => {
    await expect(loadLendingConfig(4663)).rejects.toThrow('No lending deployment');
    expect(() => validateConfig({ chainId: 46630, markets: [{ id: 'bad', name: 'Bad', pool: zeroAddress, assets: [] }] }, 46630)).toThrow();
  });
});
describe('lending operations', () => {
  it('encodes all four operations with the supplied deployment ABI', async () => {
    const { request } = await setup();
    for (const action of ['supply', 'repay', 'borrow', 'withdraw'] as const) {
      expect(encodeFunctionData(poolCall(action, request.market, request.asset, 1n, account))).toMatch(/^0x[0-9a-f]+$/);
    }
  });
  it('parses exact token units without rounding or scientific notation', () => {
    expect(parseAmount('1.234567', 6)).toBe(1234567n);
    expect(parseAmount('0.000000000000000001', 18)).toBe(1n);
    for (const s of ['0', '-1', 'NaN', '1e2', '1.0000001', 'Infinity', '']) expect(() => parseAmount(s, 6)).toThrow();
  });
  it('approves only the supply amount and then supplies to the selected pool', async () => {
    const { io, send, request } = await setup();
    await supply(io, request);
    expect(send.mock.calls.map(c => c[0].functionName)).toEqual(['approve', 'supply']);
    expect(send.mock.calls[0][0].args).toEqual([request.market.pool, 1234567n]);
    expect(send.mock.calls[1][0].args).toEqual([request.asset.address, 1234567n, account, 0]);
  });
  it('repays variable debt without reapproving an adequate allowance', async () => {
    const { io, send, request, setAllowance } = await setup(); setAllowance(2_000_000n);
    await repay(io, request);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].args).toEqual([request.asset.address, 1234567n, 2n, account]);
  });
  it('resets insufficient nonzero approvals before authorizing', async () => {
    const { io, send, request, setAllowance } = await setup(); setAllowance(1n);
    await repay(io, request);
    expect(send.mock.calls.map(c => c[0].functionName)).toEqual(['approve', 'approve', 'repay']);
    expect(send.mock.calls[0][0].args![1]).toBe(0n);
  });
  it('borrows variable debt and withdraws to the connected account without approval', async () => {
    const { io, send, request } = await setup();
    await borrow(io, request); await withdraw(io, request);
    expect(send.mock.calls[0][0].args).toEqual([request.asset.address, 1234567n, 2n, 0, account]);
    expect(send.mock.calls[1][0].args).toEqual([request.asset.address, 1234567n, account]);
  });
  it('stops on reverted approval', async () => {
    const { io, send, request } = await setup(); io.wait = async () => ({ status: 'reverted', transactionHash: hash });
    await expect(supply(io, request)).rejects.toThrow('reverted'); expect(send).toHaveBeenCalledTimes(1);
  });
  it('does not retry an uncertain submitted transaction', async () => {
    const { io, send, request } = await setup(); io.wait = async () => { throw new Error('timeout'); };
    await expect(borrow(io, request)).rejects.toBeInstanceOf(ReceiptPendingError); expect(send).toHaveBeenCalledTimes(1);
  });
  it('rejects chain changes and precision mismatches before sending', async () => {
    const { io, send, request } = await setup(); io.session = async () => ({ address: account, chainId: 1, connector: 'test' });
    await expect(supply(io, request)).rejects.toThrow('changed'); expect(send).not.toHaveBeenCalled();
  });
  it('rejects a wallet change between approval and the pool operation', async () => {
    const { io, send, request, session } = await setup();
    io.wait = async () => { session.mockResolvedValue({ address: zeroAddress, chainId: 46630, connector: 'test' }); return { status: 'success', transactionHash: hash }; };
    await expect(supply(io, request)).rejects.toThrow('changed'); expect(send).toHaveBeenCalledTimes(1);
  });
  it('does not proceed after token precision validation fails', async () => {
    const { io, read, send, request } = await setup(); const original = read.getMockImplementation()!;
    read.mockImplementation(call => call.functionName === 'decimals' ? Promise.resolve(18) : original(call));
    await expect(supply(io, request)).rejects.toThrow('decimals'); expect(send).not.toHaveBeenCalled();
  });
  it('does not report success after wallet rejection or simulation failure', async () => {
    const { io, send, request } = await setup(); send.mockRejectedValue(new Error('User rejected request'));
    await expect(borrow(io, request)).rejects.toThrow('User rejected'); expect(io.wait).not.toHaveBeenCalled();
  });
  it('blocks duplicate submissions while a receipt is pending', async () => {
    const { io, request } = await setup();
    let finish!: () => void;
    let started!: () => void;
    const ready = new Promise<void>(resolve => { started = resolve; });
    io.wait = () => { started(); return new Promise(resolve => { finish = () => resolve({ status: 'success', transactionHash: hash }); }); };
    const first = borrow(io, request); await ready;
    await expect(borrow(io, request)).rejects.toThrow('already pending'); finish(); await first;
  });
});
