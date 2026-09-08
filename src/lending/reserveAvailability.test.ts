import { expect, it } from 'vitest';
import { getLendingConfig } from './config';
import { reserveAvailable } from './reserveAvailability';
import { mockReserveHistory } from './reserveHistory';
import type { MarketReserve } from './marketRead';
import type { AssetSnapshot, PoolSnapshot } from './read';

const asset = getLendingConfig(46630).markets[0].assets[0];
const row: AssetSnapshot = { asset, wallet: 100n, supplied: 100n, debt: 30n, liquidity: 90n, price: 1n, supplyApy: 1, borrowApy: 2, ltv: 80, active: true, frozen: false, paused: false, borrowing: true };
const pool: PoolSnapshot = { assets: [row], collateral: 100n, debt: 30n, available: 100n, health: 4n, unit: 1n };
const reserve: MarketReserve = { ...row, borrowed: 30n, borrowCap: 40n, supplyCap: 110n, threshold: 85, penalty: 5, reserveFactor: 10 };
it('restricts displayed availability by remaining caps and flags', () => {
  expect(reserveAvailable('supply', row, pool, reserve)).toBe(10n);
  expect(reserveAvailable('borrow', row, pool, reserve)).toBe(10n);
  expect(reserveAvailable('borrow', row, pool, { ...reserve, borrowing: false })).toBe(0n);
  expect(reserveAvailable('supply', row, pool, { ...reserve, frozen: true })).toBe(0n);
  expect(reserveAvailable('repay', row, pool, { ...reserve, frozen: true })).toBe(30n);
  expect(reserveAvailable('withdraw', row, pool, { ...reserve, paused: true })).toBe(0n);
  expect(reserveAvailable('supply', row, pool, { ...reserve, supplyCap: 0n })).toBe(100n);
  expect(reserveAvailable('borrow', row, pool, { ...reserve, borrowCap: 20n })).toBe(0n);
});
it('keeps display-only mock histories deterministic and scoped, with working periods', () => {
  const now = Date.UTC(2026, 8, 8);
  const history = mockReserveHistory('pool:asset:supply', 2, '1m', now);
  expect(history).toEqual(mockReserveHistory('pool:asset:supply', 2, '1m', now));
  expect(history).not.toEqual(mockReserveHistory('other:asset:supply', 2, '1m', now));
  expect(history[47].value).toBe(2);
  expect(history[47].timestamp - history[0].timestamp).toBe(30 * 86400000);
  expect(mockReserveHistory('pool:asset:supply', 2, '1w', now)[0].timestamp).toBe(now - 7 * 86400000);
});
