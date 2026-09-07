import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import IsolatedDashboard from './IsolatedDashboard';
import { PositionTabs } from './MarketNavigation';
import { initialIsolated, type IsolatedPortfolio } from './isolated';

function render(connected: boolean, portfolio: IsolatedPortfolio = initialIsolated) {
  return renderToStaticMarkup(<MemoryRouter><PositionTabs selected="isolated" /><IsolatedDashboard connected={connected} portfolio={portfolio} usdgWallet={100} onConnect={() => {}} onAction={() => {}} /></MemoryRouter>);
}
describe('four-panel isolated dashboard', () => {
  it('uses two top-level categories and renders all four sections', () => {
    const html = render(false);
    for (const text of ['Core Market', 'Isolated Markets', 'Your supplies', 'Your borrows', 'Assets to supply', 'Assets to borrow']) expect(html).toContain(text);
    expect(html).toContain('/dashboard?category=isolated');
    expect(html).not.toContain('/dashboard/isolated/pons');
    expect(html).not.toContain('10,000');
  });
  it('shows three borrowing sources even when there are no positions', () => {
    const html = render(true);
    for (const text of ['Against PONS', 'Against CASHCAT', 'Against AI']) expect(html).toContain(text);
    expect(html.match(/disabled=""/g)).toHaveLength(3);
  });
  it('keeps debts and health factors separate for multiple positions', () => {
    const portfolio = structuredClone(initialIsolated);
    portfolio.PONS = { wallet: 100, supplied: 1000, debt: 100 };
    portfolio.AI = { wallet: 100, supplied: 1000, debt: 50 };
    const html = render(true, portfolio);
    expect(html).toContain('4.40');
    expect(html).toContain('3.50');
    expect(html).toContain('$150.00');
    expect(html.match(/>Repay</g)).toHaveLength(2);
    expect(html.match(/>Withdraw</g)).toHaveLength(2);
    expect(html.match(/class="token token-pair"/g)).toHaveLength(5);
    expect(html).not.toContain('role="switch"');
  });
});
