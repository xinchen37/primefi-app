import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import LendingDashboard from './LendingDashboard';
import { getLendingConfig } from './config';
import type { PoolSnapshot } from './read';

const state = vi.hoisted(() => ({ connected: true, pending: true, fetching: true, error: null as Error | null, data: undefined as PoolSnapshot | undefined }));
vi.mock('wagmi', () => ({ useAccount: () => ({ address: '0x1111111111111111111111111111111111111111', isConnected: state.connected }) }));
vi.mock('./LendingTransaction', () => ({ default: () => null }));
vi.mock('./client', () => ({ lendingClient: {}, lendingError: String }));
vi.mock('@tanstack/react-query', () => ({ useQuery: (options: { queryKey: unknown[]; initialData?: () => unknown }) => options.queryKey[0] === 'lending-config'
  ? { data: options.initialData?.(), isPending: false, refetch: vi.fn() }
  : { data: state.data, error: state.error, isError: !!state.error, isPending: state.pending, isFetching: state.fetching, refetch: vi.fn() },
}));
beforeEach(() => { Object.assign(state, { connected: true, pending: true, fetching: true, error: null, data: undefined }); });
const render = () => renderToStaticMarkup(<MemoryRouter><LendingDashboard onConnect={() => {}} beforeSubmit={async () => {}} onHelp={() => {}} /></MemoryRouter>);

it('shows all panels and configured tokens while initial balances are pending', () => {
  const html = render();
  for (const title of ['Your supplies', 'Your borrows', 'Assets to supply', 'Assets to borrow', 'USDG', 'WETH', 'Wrapped Ether']) expect(html).toContain(title);
  expect(html.match(/aria-busy="true"/g)).toHaveLength(4);
  expect(html).toContain('skeleton');
  expect(html).not.toContain('$0.00');
  expect(html).not.toContain('No positions');
  expect(html).toMatch(/disabled="">Borrow/);
  expect(html).toMatch(/disabled="">Supply/);
});

it('shows wallet guidance instead of loading personal balances while disconnected', () => {
  state.connected = false;
  const html = render();
  expect(html).toContain('Connect your wallet to view your positions.');
  expect(html).not.toContain('Loading your positions');
  expect(html.match(/aria-busy="true"/g)).toHaveLength(2);
});

it('replaces initial skeletons with retry states on error, never empty positions', () => {
  Object.assign(state, { pending: false, fetching: false, error: new Error('RPC unavailable') });
  const html = render();
  expect(html).toContain('RPC unavailable');
  expect(html).toContain('Unable to load positions');
  expect(html).toContain('Retry');
  expect(html).not.toContain('skeleton');
  expect(html).not.toContain('No positions');
  expect(html).not.toContain('$0.00');
});

it('keeps previous balances visible during refetch and refetch errors', () => {
  state.pending = false;
  state.data = { assets: [{ asset: getLendingConfig(46630).markets[0].assets[0], wallet: 1000000n, supplied: 2000000n, debt: 0n, liquidity: 10000000n, price: 100000000n, supplyApy: 3, borrowApy: 4, ltv: 80, active: true, paused: false, frozen: false, borrowing: true }], collateral: 200000000n, debt: 0n, available: 160000000n, health: 0n, unit: 100000000n };
  expect(render()).not.toContain('Refreshing');
  expect(render()).not.toMatch(/>Refresh<\/button>/);
  expect(render()).toContain('$2.00');
  expect(render()).not.toContain('skeleton');
  state.error = new Error('Refresh failed');
  expect(render()).toContain('$2.00');
  expect(render()).toContain('Refresh failed');
  expect(render()).toMatch(/disabled="">Supply/);
});
