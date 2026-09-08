import { QueryClient } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { parseAbi } from 'viem';
import { getLendingConfig } from './config';
import { marketQuery, poolSnapshot } from './snapshots';

const rpc = vi.hoisted(() => ({
  getChainId: vi.fn(async () => 46630),
  getBlockNumber: vi.fn(async () => 123n),
  getBytecode: vi.fn(async () => '0x1234'),
  multicall: vi.fn(async () => [{ status: 'success', result: 9n }]),
  readContract: vi.fn(),
}));
vi.mock('./client', () => ({ lendingClient: rpc }));
vi.mock('./marketRead', () => ({ readMarket: async (io: { read: (call: unknown) => Promise<unknown> }, market: { pool: string }) => {
  await io.read({ address: market.pool, abi: parseAbi(['function value() view returns (uint256)']), functionName: 'value' });
  return { reserves: [], unit: 1n, supplied: 9n, borrowed: 0n, liquidity: 9n };
} }));
vi.mock('./read', () => ({ readPool: async (io: { read: (call: unknown) => Promise<unknown> }, market: { pool: string }) => io.read({ address: market.pool, abi: parseAbi(['function value() view returns (uint256)']), functionName: 'value' }) }));
beforeEach(() => { vi.clearAllMocks(); rpc.getChainId.mockResolvedValue(46630); });
it('shares public snapshots, pins reads, and refreshes after invalidation', async () => {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const market = getLendingConfig(46630).markets[0];
  await Promise.all([cache.fetchQuery(marketQuery(market)), poolSnapshot(cache, market)]);
  await poolSnapshot(cache, market);
  expect(rpc.multicall).toHaveBeenCalledTimes(1);
  expect(rpc.multicall).toHaveBeenCalledWith(expect.objectContaining({ blockNumber: 123n }));
  await cache.invalidateQueries({ queryKey: ['lending-market'] });
  await poolSnapshot(cache, market);
  expect(rpc.multicall).toHaveBeenCalledTimes(2);
  cache.clear();
});
it('rejects RPC chain mismatch before reading contract data', async () => {
  rpc.getChainId.mockResolvedValue(4663);
  await expect(marketQuery(getLendingConfig(46630).markets[0]).queryFn()).rejects.toThrow('RPC network mismatch');
  expect(rpc.multicall).not.toHaveBeenCalled();
});
