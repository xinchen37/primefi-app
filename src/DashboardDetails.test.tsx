import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import IsolatedDashboard from './IsolatedDashboard';
import { initial } from './model';
import { initialIsolated } from './isolated';

it('links both core action tables to reserve pages without requiring a wallet', () => {
  const html = renderToStaticMarkup(<MemoryRouter><Dashboard portfolio={initial} connected={false} onConnect={() => {}} onAction={() => {}} onCollateral={() => {}} /></MemoryRouter>);
  for (const symbol of ['USDG', 'ETH', 'NVDA', 'SPY']) {
    expect(html.match(new RegExp(`aria-label="View ${symbol} details" href="/markets/${symbol.toLowerCase()}"`, 'g'))).toHaveLength(2);
  }
});

it('links both isolated action tables to the matching collateral market', () => {
  const html = renderToStaticMarkup(<MemoryRouter><IsolatedDashboard portfolio={initialIsolated} connected={false} usdgWallet={0} onConnect={() => {}} onAction={() => {}} /></MemoryRouter>);
  for (const symbol of ['PONS', 'CASHCAT', 'AI']) {
    expect(html.match(new RegExp(`aria-label="View ${symbol} market details" href="/markets/isolated/${symbol.toLowerCase()}"`, 'g'))).toHaveLength(2);
  }
});
