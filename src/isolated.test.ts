import { describe, expect, it } from 'vitest';
import { isolatedMarkets, initialIsolated, isolatedMaximum, isolatedPreview, isolatedTotals, isolatedValidate } from './isolated';
import { assets, initial, maximum, totals } from './model';

describe('isolated market risk boundaries', () => {
  const m = isolatedMarkets[0];
  it('requires its own collateral despite funded core positions', () => {
    expect(totals(initial).limit).toBeGreaterThan(0);
    expect(isolatedMaximum('borrow', m, initialIsolated.PONS, initial.USDG.wallet)).toBe(0);
  });
  it('does not alter another market when supplying or borrowing', () => {
    const p = isolatedPreview('supply', initialIsolated.PONS, 1000);
    expect(isolatedMaximum('borrow', m, p, 0)).toBeCloseTo(320);
    expect(initialIsolated.CASHCAT.supplied).toBe(0);
    expect(initialIsolated.PONS.supplied).toBe(0);
  });
  it('enforces the global ceiling independently of collateral', () => {
    const p = { wallet: 1000, supplied: 1e7, debt: 0 };
    expect(isolatedMaximum('borrow', { ...m, totalDebt: m.debtCeiling - 7 }, p, 0)).toBe(7);
    expect(isolatedMaximum('borrow', { ...m, totalDebt: m.debtCeiling }, p, 0)).toBe(0);
  });
  it('limits borrowing to available USDG liquidity', () => {
    expect(isolatedMaximum('borrow', { ...m, liquidity: 3 }, { wallet: 0, supplied: 1e6, debt: 0 }, 0)).toBe(3);
  });
  it('uses asset-specific LTV and liquidation thresholds', () => {
    for (const asset of isolatedMarkets) {
      const p = { wallet: 0, supplied: 1000, debt: 10 };
      expect(isolatedTotals(asset, p).limit).toBeCloseTo(1000 * asset.price * asset.ltv);
      expect(isolatedTotals(asset, p).hf).toBeCloseTo(1000 * asset.price * asset.threshold / 10);
    }
  });
  it('protects withdrawal health and allows repayment at the ceiling', () => {
    const p = { wallet: 0, supplied: 1000, debt: 300 };
    const max = isolatedMaximum('withdraw', m, p, 0);
    expect(isolatedTotals(m, isolatedPreview('withdraw', p, max)).hf).toBeCloseTo(1.01);
    expect(isolatedValidate('withdraw', m, p, 0, max + 1)).toBeTruthy();
    expect(isolatedValidate('repay', { ...m, totalDebt: m.debtCeiling }, p, 300, 300)).toBe('');
  });
  it('caps repayments by shared wallet balance and rejects invalid inputs', () => {
    const p = { wallet: 100, supplied: 1000, debt: 100 };
    expect(isolatedMaximum('repay', m, p, 5)).toBe(5);
    for (const amount of [0, -1, NaN, Infinity, 101]) expect(isolatedValidate('supply', m, p, 0, amount)).toBeTruthy();
  });
  it('allows risk-reducing repayment and deposits when health is already low', () => {
    const p = { wallet: 100, supplied: 100, debt: 100 };
    expect(isolatedTotals(m, p).hf).toBeLessThan(1);
    expect(isolatedValidate('supply', m, p, 10, 1)).toBe('');
    expect(isolatedValidate('repay', m, p, 10, 1)).toBe('');
    expect(isolatedValidate('borrow', m, p, 10, 1)).not.toBe('');
    expect(isolatedValidate('withdraw', m, p, 10, 1)).not.toBe('');
  });
  it('supports a supply-borrow-repay-withdraw round trip', () => {
    const p = initialIsolated.PONS;
    const supplied = isolatedPreview('supply', p, 1000);
    const borrowed = isolatedPreview('borrow', supplied, 100);
    const repaid = isolatedPreview('repay', borrowed, 100);
    expect(isolatedPreview('withdraw', repaid, 1000)).toEqual(p);
  });
  it('has no supply caps and expresses core borrow caps in token units', () => {
    for (const a of assets) expect(maximum('supply', a, initial)).toBe(initial[a.symbol].wallet);
    expect(assets[2].borrowCap * assets[2].price).toBe(250000);
    expect(assets[3].borrowCap * assets[3].price).toBeCloseTo(300000);
  });
});
