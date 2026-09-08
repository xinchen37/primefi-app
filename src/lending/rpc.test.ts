import { expect, it } from 'vitest';
import { createPublicClient, http, zeroAddress } from 'viem';
import { getRobinhoodChain } from '../network';
import { loadLendingConfig } from './config';
import { readPool } from './read';
import { readMarket } from './marketRead';
import { batchReader } from './batchRead';
import type { Call } from './service';

// Opt-in, read-only integration check. No account, wallet, or transactions required.
const rpcCheck = (globalThis as typeof globalThis & { process?: { env: Record<string, string | undefined> } }).process?.env.LENDING_RPC_CHECK;
it.skipIf(!rpcCheck)('reads both deployed testnet pools', async () => {
  const chain = getRobinhoodChain('dev');
  const client = createPublicClient({ chain, transport: http(chain.rpcUrls.default.http[0], { timeout: 15000, retryCount: 0 }) });
  expect(await client.getChainId()).toBe(46630);
  for (const market of (await loadLendingConfig(46630)).markets) {
    const blockNumber = await client.getBlockNumber({ cacheTime: 0 });
    expect(await client.getBytecode({ address: chain.contracts.multicall3.address, blockNumber })).not.toBe('0x');
    let batches = 0, singles = 0;
    const direct = { read: (call: Call) => client.readContract({ ...call, blockNumber }) };
    const batch = batchReader({
      multicall: contracts => { batches++; return client.multicall({ contracts, blockNumber, allowFailure: true, batchSize: 4096 }); },
      read: call => { singles++; return direct.read(call); },
    });
    const reference = await readMarket(direct, market);
    expect(await readMarket(batch, market)).toEqual(reference);
    expect(batches).toBe(2);
    expect(singles).toBe(0);
    expect(await readPool(batch, market, zeroAddress)).toEqual(await readPool(direct, market, zeroAddress));
    expect(batches).toBe(4);
    console.info(market.id, 'public + account snapshot:', batches, 'multicalls,', singles, 'fallback reads');
    const data = await readPool({ read: call => client.readContract(call) }, market, zeroAddress);
    expect(data.assets).toHaveLength(2);
    expect(data.unit).toBeGreaterThan(0n);
    const overview = await readMarket({ read: call => client.readContract(call) }, market);
    expect(overview.reserves).toHaveLength(market.assets.length);
    expect(overview.supplied).toBeGreaterThan(0n);
    expect(overview.liquidity).toBeGreaterThanOrEqual(0n);
    for (const asset of data.assets) { expect(asset.price).toBeGreaterThan(0n); expect(asset.active).toBe(true); }
  }
}, 60000);
