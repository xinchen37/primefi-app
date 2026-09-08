import { expect, it } from 'vitest';
import { createPublicClient, http, zeroAddress } from 'viem';
import { getRobinhoodChain } from '../network';
import { loadLendingConfig } from './config';
import { readPool } from './read';
import { readMarket } from './marketRead';

// Opt-in, read-only integration check. No account, wallet, or transactions required.
const rpcCheck = (globalThis as typeof globalThis & { process?: { env: Record<string, string | undefined> } }).process?.env.LENDING_RPC_CHECK;
it.skipIf(!rpcCheck)('reads both deployed testnet pools', async () => {
  const chain = getRobinhoodChain('dev');
  const client = createPublicClient({ chain, transport: http(chain.rpcUrls.default.http[0], { timeout: 15000, retryCount: 0 }) });
  expect(await client.getChainId()).toBe(46630);
  for (const market of (await loadLendingConfig(46630)).markets) {
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
