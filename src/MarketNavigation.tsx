import { Link } from 'react-router-dom';
import styles from './MarketNavigation.module.css';
import { marketPath } from './lending/marketSelection';

export function MarketCategoryTabs({ isolated, base = '/markets' }: { isolated: boolean; base?: string }) {
  return <nav className={`market-tabs ${styles.tabs}`} aria-label="Market categories">
    <Link to={marketPath(base, false)} aria-current={!isolated ? 'page' : undefined}>Core Market</Link>
    <Link to={marketPath(base, true)} aria-current={isolated ? 'page' : undefined}>Isolated Markets</Link>
  </nav>;
}
export function PositionTabs({ selected = 'core' }: { selected?: string }) {
  return <nav className="market-tabs" aria-label="Position markets">
    <Link to="/dashboard" aria-current={selected === 'core' ? 'page' : undefined}>Core Market</Link>
    <Link to="/dashboard?category=isolated" aria-current={selected !== 'core' ? 'page' : undefined}>Isolated Markets</Link>
  </nav>;
}
