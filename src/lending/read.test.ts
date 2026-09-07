import { expect, it } from 'vitest';
import { availableAmount, type AssetSnapshot, type PoolSnapshot } from './read';
import { loadLendingConfig } from './config';

it('keeps precise balances and uses only the selected pool borrowing power', async () => {
  const asset = (await loadLendingConfig(46630)).markets[0].assets[0];
  const row: AssetSnapshot = { asset, wallet: 5_000_001n, supplied: 8_000_000n, debt: 4_000_000n, liquidity: 7_000_000n,
    price: 100_000_000n, supplyApy: 1, borrowApy: 2, ltv: 75, active: true, frozen: false, paused: false, borrowing: true };
  const pool: PoolSnapshot = { assets: [row], collateral: 0n, debt: 0n, available: 200_000_000n, health: 0n, unit: 100_000_000n };
  expect(availableAmount('supply', row, pool)).toBe(5_000_001n);
  expect(availableAmount('repay', row, pool)).toBe(4_000_000n);
  expect(availableAmount('withdraw', row, pool)).toBe(7_000_000n);
  expect(availableAmount('borrow', row, pool)).toBe(2_000_000n);
  expect(availableAmount('borrow', row, { ...pool, available: 0n })).toBe(0n);
  expect(availableAmount('borrow', { ...row, price: 0n }, pool)).toBe(0n);
});
