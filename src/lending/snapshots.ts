import type { Address } from 'viem';
import type { QueryClient } from '@tanstack/react-query';
import { robinhood } from '../network';
import { lendingClient } from './client';
import type { LendingMarket } from './config';
import { batchReader, callKey } from './batchRead';
import { readMarket } from './marketRead';
import { readPool } from './read';
import type { Call } from './service';

const decimalsCache = new Map<string, { value: unknown; expires: number }>();

export function marketQuery(market: LendingMarket) {
  return {
    queryKey: ['lending-market', robinhood.id, market.pool, market],
    staleTime: 10_000,
    queryFn: async () => {
      if (await lendingClient.getChainId() !== robinhood.id) throw new Error('RPC network mismatch.');
      const blockNumber = await lendingClient.getBlockNumber({ cacheTime: 0 });
      const address = robinhood.contracts.multicall3.address;
      // Absence of deployed Multicall code is the only supported fallback condition.
      const code = await lendingClient.getBytecode({ address, blockNumber });
      const multicall = !!code && code !== '0x';
      const io = fixedReader(blockNumber, {}, multicall);
      const data = await readMarket(io, market);
      return { ...data, blockNumber, readings: io.values, multicall };
    },
  };
}

function fixedReader(blockNumber: bigint, seed: Record<string, unknown>, multicall: boolean) {
  const reader = batchReader({
    multicall: contracts => lendingClient.multicall({ contracts, blockNumber, allowFailure: true, batchSize: 4096 }),
    read: call => lendingClient.readContract({ ...call, blockNumber }),
  }, seed, multicall);
  return {
    values: reader.values,
    read: async (call: Call) => {
      const key = callKey(call);
      const cached = call.functionName === 'decimals' ? decimalsCache.get(key) : undefined;
      if (cached && cached.expires > Date.now()) {
        reader.values[key] = cached.value;
        return cached.value;
      }
      const value = await reader.read(call);
      if (call.functionName === 'decimals') {
        if (decimalsCache.size >= 256) decimalsCache.clear();
        decimalsCache.set(key, { value, expires: Date.now() + 300_000 });
      }
      return value;
    },
  };
}

export async function poolSnapshot(cache: QueryClient, market: LendingMarket, account?: Address) {
  // Shared public state: market list, details and dashboard reuse one cached query.
  const publicState = await cache.fetchQuery(marketQuery(market));
  const io = fixedReader(publicState.blockNumber, publicState.readings, publicState.multicall);
  return readPool(io, market, account);
}
