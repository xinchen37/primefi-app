import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Token } from './components';

it.each(['PONS', 'CASHCAT', 'AI'] as const)('renders the supplied %s image in both sizes', (symbol) => {
  for (const small of [false, true]) {
    const html = renderToStaticMarkup(<Token symbol={symbol} small={small} />);
    expect(html).toContain('<img');
    expect(html).toContain(`/src/images/icon/${symbol.toLowerCase()}.${symbol === 'PONS' ? 'jpeg' : 'png'}`);
    expect(html).not.toContain('token-letter');
    expect(html).toContain('token-framed');
  }
});
