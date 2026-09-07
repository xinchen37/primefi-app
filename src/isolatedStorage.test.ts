import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initialIsolated, isolatedMarkets, isolatedMaximum, isolatedStorageKey, isolatedTotals, loadIsolated, sampleIsolated } from './isolated';

describe('isolated sample positions', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
  });
  afterEach(() => vi.unstubAllGlobals());
  it('seeds three healthy positions with working action limits', () => {
    expect(loadIsolated()).toEqual(sampleIsolated);
    for (const m of isolatedMarkets) {
      const p = sampleIsolated[m.symbol];
      expect(isolatedTotals(m, p).hf).toBeGreaterThan(1.5);
      for (const action of ['supply', 'borrow', 'repay', 'withdraw'] as const) expect(isolatedMaximum(action, m, p, 1000)).toBeGreaterThan(0);
    }
  });
  it('upgrades untouched legacy empty positions once', () => {
    localStorage.setItem('orbit-isolated-v1', JSON.stringify(initialIsolated));
    expect(loadIsolated()).toEqual(sampleIsolated);
    localStorage.setItem(isolatedStorageKey, JSON.stringify(initialIsolated));
    expect(loadIsolated()).toEqual(initialIsolated);
  });
  it('preserves previously edited positions', () => {
    const edited = structuredClone(initialIsolated);
    edited.PONS.wallet -= 100; edited.PONS.supplied = 100;
    localStorage.setItem('orbit-isolated-v1', JSON.stringify(edited));
    expect(loadIsolated()).toEqual(edited);
  });
});
