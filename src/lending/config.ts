import { getAddress, isAddress, zeroAddress, type Address } from 'viem';
import { localLendingConfigs } from './local-config';
import { appEnvironment, environmentChainIds, type AppEnvironment } from '../environment';
import { DEFAULT_ASSET_DISPLAY_DECIMALS, type AssetDisplayConfig } from '../utils/formatNumber';

export interface LendingAsset extends AssetDisplayConfig { symbol: string; address: Address; decimals: number; name?: string; iconSymbol?: string; previewPath?: string }
export interface LendingMarket { id: string; name: string; pool: Address; oracle: Address; assets: LendingAsset[] }
export interface LendingConfig { chainId: number; markets: LendingMarket[] }

function address(value: unknown): Address {
  if (typeof value !== 'string' || !isAddress(value, { strict: false }) || value.toLowerCase() === zeroAddress) throw new Error('Invalid deployment address.');
  return getAddress(value.toLowerCase());
}
export function validateConfig(value: unknown, chainId: number): LendingConfig {
  const v = value as LendingConfig;
  if (!v || v.chainId !== chainId || !Array.isArray(v.markets) || !v.markets.length) throw new Error('No lending deployment is configured for this network.');
  const ids = new Set<string>();
  const pools = new Set<Address>();
  const sharedTokens = new Map<Address, LendingAsset>();
  return { chainId, markets: v.markets.map(m => {
    if (!m || typeof m.id !== 'string' || !m.id.trim() || typeof m.name !== 'string' || !m.name.trim() || ids.has(m.id) || !Array.isArray(m.assets) || !m.assets.length) throw new Error('Invalid market configuration.');
    ids.add(m.id);
    const pool = address(m.pool);
    if (pools.has(pool)) throw new Error('Duplicate pool configuration.');
    pools.add(pool);
    const tokens = new Set<string>();
    const symbols = new Set<string>();
    return { id: m.id, name: m.name, pool, oracle: address(m.oracle), assets: m.assets.map(a => {
      if (!a || typeof a.symbol !== 'string' || !a.symbol.trim()) throw new Error('Invalid asset configuration.');
      const token = address(a.address);
      const displayDecimals = a.displayDecimals ?? DEFAULT_ASSET_DISPLAY_DECIMALS;
      if (!Number.isInteger(displayDecimals) || displayDecimals < 0 || displayDecimals > 100) throw new Error('Invalid asset display decimals.');
      if (!Number.isInteger(a.decimals) || a.decimals < 0 || a.decimals > 36 || tokens.has(token) || symbols.has(a.symbol)) throw new Error('Invalid asset configuration.');
      for (const field of [a.name, a.iconSymbol]) if (field !== undefined && (typeof field !== 'string' || !field.trim())) throw new Error('Invalid asset display configuration.');
      if (a.previewPath !== undefined && (typeof a.previewPath !== 'string' || !/^\/markets\/[a-z0-9/-]+$/.test(a.previewPath))) throw new Error('Invalid market preview path.');
      const shared = sharedTokens.get(token);
      if (shared && (shared.decimals !== a.decimals || shared.symbol !== a.symbol)) throw new Error('Inconsistent shared token configuration.');
      sharedTokens.set(token, a);
      tokens.add(token);
      symbols.add(a.symbol);
      return { symbol: a.symbol, address: token, decimals: a.decimals, displayDecimals, name: a.name, iconSymbol: a.iconSymbol, previewPath: a.previewPath };
    }) };
  }) };
}
// Promise-compatible for existing consumers; no fetch or remote source is used.
export async function loadLendingConfig(chainId: number) {
  return getLendingConfig(chainId);
}

export function getLendingConfig(chainId: number, environment: AppEnvironment = appEnvironment) {
  if (chainId !== environmentChainIds[environment]) throw new Error('No lending deployment is configured for this network in the current environment.');
  return validateConfig(localLendingConfigs[environment], chainId);
}
