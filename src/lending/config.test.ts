import { afterEach, expect, it, vi } from 'vitest';
import { loadLendingConfig, validateConfig } from './config';

afterEach(() => vi.unstubAllGlobals());

it('defaults display precision to two without changing chain decimals', async () => {
  const config = await loadLendingConfig(46630);
  expect(config.markets[0].assets[1]).toMatchObject({ decimals: 18, displayDecimals: 2 });
  config.markets[0].assets[1].displayDecimals = 6;
  expect(validateConfig(config, 46630).markets[0].assets[1].displayDecimals).toBe(6);
  config.markets[0].assets[1].displayDecimals = -1;
  expect(() => validateConfig(config, 46630)).toThrow('Invalid asset display decimals');
});

it('loads local pools without fetching and preserves token display metadata', async () => {
  const fetch = vi.fn(() => { throw new Error('Offline'); });
  vi.stubGlobal('fetch', fetch);
  const config = await loadLendingConfig(46630);
  expect(config.markets.map(m => m.id)).toEqual(['stable', 'stock']);
  expect(config.markets[0].assets[0]).toEqual(config.markets[1].assets[0]);
  expect(config.markets[0].assets[1]).toMatchObject({ symbol: 'WETH', iconSymbol: 'ETH', name: 'Wrapped Ether', previewPath: '/markets/eth' });
  expect(fetch).not.toHaveBeenCalled();
  await expect(loadLendingConfig(4663)).rejects.toThrow('No lending deployment');
});

it('does not expose mutable registry objects through the loader', async () => {
  const config = await loadLendingConfig(46630);
  config.markets[0].assets[0].decimals = 2;
  expect((await loadLendingConfig(46630)).markets[0].assets[0].decimals).toBe(6);
});

it('rejects duplicate pools and conflicting shared tokens', async () => {
  const config = await loadLendingConfig(46630);
  const duplicate = structuredClone(config);
  duplicate.markets[1].pool = duplicate.markets[0].pool;
  expect(() => validateConfig(duplicate, 46630)).toThrow('Duplicate pool');
  config.markets[1].assets[0].decimals = 18;
  expect(() => validateConfig(config, 46630)).toThrow('Inconsistent shared token');
});

it('rejects duplicate symbols and external preview links', async () => {
  const config = await loadLendingConfig(46630);
  config.markets[0].assets[1].symbol = 'USDG';
  expect(() => validateConfig(config, 46630)).toThrow('Invalid asset');
  const unsafe = await loadLendingConfig(46630);
  unsafe.markets[0].assets[0].previewPath = 'https://example.com';
  expect(() => validateConfig(unsafe, 46630)).toThrow('Invalid market preview');
});
