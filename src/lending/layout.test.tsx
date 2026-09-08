import { expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import LendingDashboard from './LendingDashboard';
const queries = vi.hoisted(() => [] as { queryKey: unknown[]; enabled?: boolean }[]);

vi.mock('wagmi', () => ({ useAccount: () => ({ address: '0x1111111111111111111111111111111111111111', isConnected: true }) }));
vi.mock('./LendingTransaction', () => ({ default: () => null }));
vi.mock('./client', () => ({ lendingClient: {}, lendingError: String }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({}), useQuery: (options: { queryKey: unknown[]; enabled?: boolean }) => { queries.push(options); return ({
  data: options.queryKey[0] === 'lending-config' ? { markets: [{ id: 'stable', name: 'Stable Pool', pool: '0x1111111111111111111111111111111111111111' }, { id: 'stock', name: 'Stock Pool', pool: '0x3333333333333333333333333333333333333333' }] } : {
    assets: [{ asset: { symbol: 'USDG', name: 'Global Dollar', iconSymbol: 'USDG', previewPath: '/markets/usdg', address: '0x2222222222222222222222222222222222222222', decimals: 6 }, wallet: 5000000n, supplied: 10000000n, debt: 2000000n, liquidity: 50000000n, price: 100000000n, supplyApy: 4, borrowApy: 6, active: true, frozen: false, paused: false, borrowing: true, collateral: true }],
    collateral: 1000000000n, debt: 200000000n, available: 500000000n, health: 4000000000000000000n, unit: 100000000n,
  }, isError: false, isPending: false, isFetching: false, refetch: vi.fn(),
}); } }));

it('restores the overview, four panels, read-only collateral and detail links around live actions', () => {
  const html = renderToStaticMarkup(<MemoryRouter><LendingDashboard onConnect={() => {}} beforeSubmit={async () => {}} onHelp={() => {}} /></MemoryRouter>);
  for (const text of ['overview-stats', 'orbit-art', 'Core Market', 'Isolated Markets', 'Stable Pool', 'Your positions', 'Your supplies', 'Your borrows', 'Assets to supply', 'Assets to borrow', 'Weighted supply APY', 'health-bar', 'Borrow power used', 'row-actions']) expect(html).toContain(text);
  expect(html).toContain('$8.00'); // supplied minus debt, not collateral minus debt from another pool
  expect(html).toContain('3.50'); // (10 * 4 - 2 * 6) / 8
  expect(html).toContain('collateral status (read only)');
  expect(html).toContain('data-disabled');
  expect(html.match(/href="\/markets\/usdg"/g)).toHaveLength(2);
});

it.each(['/dashboard?category=isolated', '/dashboard?pool=stock'])('maps %s directly to the live Stock pool without a submenu', (url) => {
  queries.length = 0;
  const html = renderToStaticMarkup(<MemoryRouter initialEntries={[url]}><LendingDashboard onConnect={() => {}} beforeSubmit={async () => {}} onHelp={() => {}} /></MemoryRouter>);
  expect(html).toContain('Stock Pool');
  expect(html).toContain('Isolated market');
  expect(html).not.toContain('Not deployed');
  expect(html).not.toContain('aria-label="Lending pools"');
  expect(html.match(/<nav/g)).toHaveLength(1);
  const query = queries.find(q => q.queryKey[0] === 'lending-pool');
  expect(query?.enabled).toBe(true);
  expect(query?.queryKey[2]).toBe('0x3333333333333333333333333333333333333333');
});
