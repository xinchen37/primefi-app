import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ReserveOverview from './ReserveOverview';
import { initial } from './model';

vi.mock('./wallet', () => ({ robinhood: { name: 'Robinhood Chain Testnet' } }));

function render(symbol: string, connected = false) {
  return renderToStaticMarkup(<MemoryRouter initialEntries={[`/markets/${symbol}`]}><Routes><Route path="/markets/:symbol" element={<ReserveOverview portfolio={initial} connected={connected} onConnect={() => {}} onAction={() => {}} />} /></Routes></MemoryRouter>);
}
describe('reserve overview', () => {
  it('renders reserve sections and keeps account information private when disconnected', () => {
    const html = render('eth');
    for (const label of ['Supply Info', 'Borrow info', 'Your info', 'Connect wallet', 'Liquidation threshold', 'Supply APY', 'Borrow APY, variable']) expect(html).toContain(label);
    expect(html).not.toContain('Wallet balance');
    expect(html).toContain('href="/markets"');
    expect(html).toContain('Collector Info');
    expect(html).toContain('Reserve factor');
    expect(html).toContain('25.00');
    expect(html).toContain('Collector Contract');
    expect(html).not.toContain('Interest rate</dt>');
  });
  it('renders connected balances and position actions', () => {
    const html = render('usdg', true);
    for (const label of ['Wallet balance', '8,540', 'Available to supply', 'Available to borrow', 'Withdraw', 'Repay', 'Health factor']) expect(html).toContain(label);
  });
  it('does not render borrow history for non-borrowable stock', () => {
    const html = render('nvda');
    expect(html).toContain('Borrowing is not available');
    expect(html).not.toContain('Borrow APY, variable');
    expect(html).not.toContain('NaN');
  });
  it('handles unknown assets and case-insensitive direct routes', () => {
    expect(render('unknown')).toContain('Asset not found');
    expect(render('ETH')).toContain('Ethereum');
  });
});
