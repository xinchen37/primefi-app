import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { MarketCategoryTabs } from '../MarketNavigation';
import { isIsolatedMarket, marketPath, reservePath } from './marketSelection';

it('keeps pool context across dashboard, markets and details', () => {
  for (const search of ['?category=isolated', '?pool=stock']) {
    const selected = isIsolatedMarket(search);
    expect(marketPath('/dashboard', selected)).toBe('/dashboard?category=isolated');
    expect(marketPath('/markets', selected)).toBe('/markets?category=isolated');
    expect(reservePath('USDG', selected)).toBe('/markets/usdg?category=isolated');
  }
  expect(reservePath('WETH', isIsolatedMarket(''))).toBe('/markets/weth');
});
it('shares category labels and omits counts on both pages', () => {
  for (const base of ['/dashboard', '/markets']) {
    const html = renderToStaticMarkup(<MemoryRouter><MarketCategoryTabs isolated base={base} /></MemoryRouter>);
    expect(html).toContain('Core Market');
    expect(html).toContain('Isolated Markets');
    expect(html).toContain(`href="${base}?category=isolated"`);
    expect(html).not.toContain('assets</');
    expect(html).not.toContain('markets</');
  }
});
