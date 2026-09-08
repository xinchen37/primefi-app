import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import LendingMarkets from './LendingMarkets';
import { getLendingConfig } from './config';
import type { MarketSnapshot } from './marketRead';

const state = vi.hoisted(() => ({ data: undefined as MarketSnapshot | undefined, error: null as Error | null }));
vi.mock('wagmi', () => ({ useAccount: () => ({ isConnected: false }) }));
vi.mock('./LendingTransaction', () => ({ default: () => null }));
vi.mock('./client', () => ({ lendingClient: {}, lendingError: String }));
vi.mock('@tanstack/react-query', () => ({ useQuery: (options: { queryKey: unknown[]; initialData?: () => unknown }) => options.queryKey[0] === 'lending-config'
  ? { data: options.initialData?.(), refetch: vi.fn() }
  : { data: state.data, error: state.error, refetch: vi.fn() },
}));
beforeEach(() => { state.data = undefined; state.error = null; });
const render = (url = '/markets') => renderToStaticMarkup(<MemoryRouter initialEntries={[url]}><LendingMarkets onHelp={() => {}} onConnect={() => {}} beforeSubmit={async () => {}} /></MemoryRouter>);
it('shows configured assets and skeletons without preview balances', () => {
  const html = render();
  expect(html).toContain('WETH');
  expect(html).toContain('skeleton');
  expect(html).not.toContain('SPY');
  expect(html).not.toContain('11.47M');
  expect(html).not.toContain('Market preview');
  expect(html).not.toContain('$0.00');
});
it('uses stock configuration and preserves that pool in detail links', () => {
  const html = render('/markets?category=isolated');
  expect(html).toContain('NVDA');
  expect(html).not.toContain('PONS');
  expect(html).toContain('/markets/usdg?category=isolated');
  expect(html).toContain('/markets/nvda?category=isolated');
});
it('shows RPC failure and retry instead of mock data', () => {
  state.error = new Error('RPC unavailable');
  const html = render();
  expect(html).toContain('RPC unavailable');
  expect(html).toContain('Retry');
  expect(html).not.toContain('skeleton');
  expect(html).not.toContain('$0.00');
});
it('renders chain-derived totals and unlimited caps', () => {
  state.data = { unit: 100n, supplied: 12345n, borrowed: 2345n, liquidity: 10000n, reserves: [{
    asset: getLendingConfig(46630).markets[0].assets[0], supplied: 123450000n, borrowed: 23450000n, liquidity: 100000000n, price: 100n,
    supplyApy: 1.23, borrowApy: 2.34, borrowCap: 0n, supplyCap: 0n, ltv: 80, threshold: 85, penalty: 5, reserveFactor: 10,
    active: true, paused: false, frozen: false, borrowing: true,
  }] };
  const html = render();
  expect(html).toContain('$123.45');
  expect(html).toContain('1.23%');
  expect(html).toContain('No limit');
  expect(html).toContain('18.99%');
  expect(html).not.toContain('—%');
});
