import { expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import LendingReserve from './LendingReserve';
import { getLendingConfig } from './config';
import type { MarketReserve } from './marketRead';

vi.mock('wagmi', () => ({ useAccount: () => ({ isConnected: false }) }));
vi.mock('./client', () => ({ lendingClient: {}, lendingError: String }));
vi.mock('./LendingTransaction', () => ({ default: () => null }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: undefined, isPending: false, refetch: vi.fn() }) }));
const market = getLendingConfig(46630).markets[1], asset = market.assets[0];
const reserve: MarketReserve = { asset, supplied: 300000000n, borrowed: 50000000n, liquidity: 250000000n, price: 100000000n, supplyApy: .12, borrowApy: .98, borrowCap: 350000000000n, supplyCap: 500000000000n, ltv: 80, threshold: 85, penalty: 5, reserveFactor: 10, active: true, paused: false, frozen: false, borrowing: true };
const render = (r?: MarketReserve) => renderToStaticMarkup(<MemoryRouter><LendingReserve market={market} asset={asset} reserve={r} unit={100000000n} loading={!r} stale={false} isolated onConnect={() => {}} beforeSubmit={async () => {}} /></MemoryRouter>);
it('restores overview, supply and borrow charts, collateral parameters and sidebar', () => {
  const html = render(reserve);
  for (const text of ['reserve-layout', 'Your info', 'Supply Info', 'Borrow info', 'Collector Info', 'Max LTV', '16.66%', 'Mock history', '1w', '6m', '1y', '/markets?category=isolated']) expect(html).toContain(text);
  expect(html).toContain('Connect wallet');
  expect(html).not.toContain('8,540');
});
it('does not mock chain values on initial loading, and explains paused state', () => {
  expect(render()).toContain('skeleton');
  expect(render()).not.toContain('Mock history');
  expect(render({ ...reserve, paused: true })).toContain('Transactions are unavailable');
});
