import { expect, it, vi } from 'vitest';
import { parseAbi, type Address } from 'viem';
import { batchReader } from './batchRead';
const abi = parseAbi(['function balanceOf(address account) view returns (uint256)']);
const account = '0x1111111111111111111111111111111111111111' as Address;
const call = (i: number) => ({ address: ('0x' + i.toString(16).padStart(40, '0')) as Address, abi, functionName: 'balanceOf', args: [account] });
it('deduplicates, groups and chunks concurrent contract reads', async () => {
  const multicall = vi.fn(async (calls: unknown[]) => calls.map(() => ({ status: 'success' as const, result: 7n })));
  const io = batchReader({ multicall, read: vi.fn() });
  const values = await Promise.all([...Array.from({ length: 40 }, (_, i) => io.read(call(i + 1))), io.read(call(1))]);
  expect(values).toEqual(Array(41).fill(7n));
  expect(multicall.mock.calls.map(([calls]) => calls.length)).toEqual([32, 8]);
  await io.read(call(1));
  expect(multicall).toHaveBeenCalledTimes(2);
});
it('does not turn a failed result into zero or fan out to individual reads', async () => {
  const read = vi.fn();
  const io = batchReader({ multicall: async () => [{ status: 'failure', error: new Error('reverted') }], read });
  await expect(io.read(call(1))).rejects.toThrow('reverted');
  expect(read).not.toHaveBeenCalled();
});
it('uses bounded individual reads only when multicall is unavailable', async () => {
  let active = 0, peak = 0;
  const read = vi.fn(async () => { active++; peak = Math.max(peak, active); await new Promise(resolve => setTimeout(resolve, 1)); active--; return 1n; });
  const multicall = vi.fn();
  const io = batchReader({ read, multicall }, {}, false);
  await Promise.all(Array.from({ length: 12 }, (_, i) => io.read(call(i + 1))));
  expect(peak).toBeLessThanOrEqual(4);
  expect(multicall).not.toHaveBeenCalled();
});
