import { expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import TransactionDetails from './TransactionDetails';
import { getLendingConfig } from './config';
import type { AssetSnapshot, PoolSnapshot } from './read';
vi.mock('./client', () => ({ lendingClient: {} }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ isLoading: false }) }));
const market = getLendingConfig(46630).markets[0];
const row: AssetSnapshot = { asset: market.assets[0], wallet: 0n, supplied: 0n, debt: 0n, liquidity: 0n, price: 100000000n, supplyApy: 3.25, borrowApy: 4.5, ltv: 75, active: true, frozen: false, paused: false, borrowing: true };
const pool: PoolSnapshot = { assets: [row], collateral: 0n, debt: 0n, available: 0n, health: 0n, unit: 100000000n };
it.each(['supply', 'withdraw', 'borrow', 'repay'] as const)('renders the %s review rows without mock values', action => {
  const html = renderToStaticMarkup(<TransactionDetails action={action} amount={0n} row={row} pool={pool} market={market} account="0x1111111111111111111111111111111111111111" busy={false} />);
  for (const label of ['Health factor (estimated)', 'Total debt after transaction (estimated)', 'Network fee (estimated)']) expect(html).toContain(label);
  expect(html).toContain(action === 'supply' || action === 'withdraw' ? '3.25%' : '4.50%');
  expect(html).toContain('∞');
  expect(html).not.toContain('4.30');
  if (action === 'supply') expect(html).toContain('Set by protocol');
});
