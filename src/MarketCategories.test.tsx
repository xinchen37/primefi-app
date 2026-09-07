import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Markets from './Markets';
import IsolatedOverview from './IsolatedOverview';
import { initial } from './model';
import { initialIsolated } from './isolated';
vi.mock('./wallet', () => ({ robinhood: { name: 'Robinhood Chain Testnet' } }));
function page(url: string, connected = false) {
  return renderToStaticMarkup(<MemoryRouter initialEntries={[url]}><Routes>
    <Route path="/markets" element={<Markets portfolio={initial} isolatedPortfolio={initialIsolated} />} />
    <Route path="/markets/isolated/:symbol" element={<IsolatedOverview portfolio={initialIsolated} connected={connected} usdgWallet={8540} onConnect={() => {}} onAction={() => {}} />} />
    <Route path="/dashboard/isolated/:symbol" element={<IsolatedOverview dashboard portfolio={initialIsolated} connected={connected} usdgWallet={8540} onConnect={() => {}} onAction={() => {}} />} />
  </Routes></MemoryRouter>);
}
describe('market category routing', () => {
  it('shows four core assets without isolated collateral or supply caps', () => {
    const html = page('/markets');
    expect(html).toContain('SPY'); expect(html).toContain('Core Market');
    expect(html).not.toContain('Supply cap used'); expect(html).not.toContain('PONS');
  });
  it('supports direct isolated tab links and all three markets', () => {
    const html = page('/markets?category=isolated');
    for (const symbol of ['PONS', 'CASHCAT', 'AI']) expect(html).toContain(symbol);
    expect(html).toContain('/markets/isolated/pons');
    expect(html).toContain('Debt ceiling used');
    expect(html).toContain('<strong>PONS</strong><small>Borrow USDG</small>');
    expect(html.match(/class="token token-pair"/g)).toHaveLength(3);
  });
  it('shows only USDG borrowing and hides disconnected balances', () => {
    const html = page('/markets/isolated/pons');
    expect(html).toContain('USDG only'); expect(html).toContain('150K');
    expect(html).toContain('Connect wallet'); expect(html).not.toContain('10,000');
  });
  it('keeps a connected empty isolated position at zero borrowing power', () => {
    const html = page('/dashboard/isolated/pons', true);
    expect(html).toContain('Position markets'); expect(html).toContain('Supply PONS first');
    expect(html).toContain('10,000');
  });
  it('handles invalid market routes', () => expect(page('/markets/isolated/eth')).toContain('Market not found'));
  it.each(['pons', 'cashcat', 'ai'])('shows paired icons in the %s market heading', (symbol) => {
    const html = page(`/markets/isolated/${symbol}`);
    expect(html).toContain('class="reserve-identity"><span class="token token-pair"');
    expect(html).toContain('token-pair-badge');
    expect(html).toContain(`${symbol.toUpperCase()} / USDG`);
  });
});
