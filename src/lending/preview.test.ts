import { expect, it } from 'vitest';
import { previewPosition } from './preview';
import { getLendingConfig } from './config';
import type { AssetSnapshot, PoolSnapshot } from './read';

const unit = 100000000n, wad = 10n ** 18n;
const row: AssetSnapshot = { asset: getLendingConfig(46630).markets[0].assets[0], wallet: 1000000000n, supplied: 1000000000n, debt: 400000000n, liquidity: 1000000000n, price: unit, supplyApy: 3, borrowApy: 4, ltv: 75, liquidationThreshold: 8000, collateral: true, active: true, frozen: false, paused: false, borrowing: true };
const pool: PoolSnapshot = { assets: [row], collateral: 1000n * unit, debt: 400n * unit, available: 350n * unit, health: 2n * wad, unit, eMode: 0, liquidationThreshold: 8000n };

it('projects each operation against current prices and collateral threshold', () => {
  expect(previewPosition('borrow', 100000000n, row, pool)).toMatchObject({ debt: 500n * unit, health: 16n * wad / 10n });
  expect(previewPosition('repay', 200000000n, row, pool)).toMatchObject({ debt: 200n * unit, health: 4n * wad });
  expect(previewPosition('supply', 100000000n, row, pool).health).toBe(22n * wad / 10n);
  expect(previewPosition('withdraw', 100000000n, row, pool).health).toBe(18n * wad / 10n);
});

it('handles no debt and the first borrow without treating uint max as a health value', () => {
  expect(previewPosition('repay', row.debt, row, pool).health).toBeNull();
  expect(previewPosition('borrow', 100000000n, row, { ...pool, debt: 0n }).health).toBe(8n * wad);
  expect(previewPosition('supply', 0n, row, { ...pool, debt: 0n }).health).toBeNull();
});

it('does not assume automatic collateral activation or eMode thresholds', () => {
  expect(previewPosition('supply', 1000000n, { ...row, collateral: false }, pool).health).toBeUndefined();
  expect(previewPosition('withdraw', 1000000n, row, { ...pool, eMode: 1 }).health).toBeUndefined();
  expect(previewPosition('withdraw', 1000000n, { ...row, collateral: false }, pool).health).toBe(pool.health);
});

it('caps repayment at the selected reserve debt without repaying another asset', () => {
  expect(previewPosition('repay', 900000000n, row, { ...pool, debt: 500n * unit }).debt).toBe(100n * unit);
});
