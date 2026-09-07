import { Link } from 'react-router-dom';

export function MarketCategoryTabs({ isolated }: { isolated: boolean }) {
  return <nav className="market-tabs" aria-label="Market categories">
    <Link to="/markets" aria-current={!isolated ? 'page' : undefined}>Core Market <small>4 assets</small></Link>
    <Link to="/markets?category=isolated" aria-current={isolated ? 'page' : undefined}>Isolated Markets <small>3 markets</small></Link>
  </nav>;
}
export function PositionTabs({ selected = 'core' }: { selected?: string }) {
  return <nav className="market-tabs" aria-label="Position markets">
    <Link to="/dashboard" aria-current={selected === 'core' ? 'page' : undefined}>Core Market</Link>
    <Link to="/dashboard?category=isolated" aria-current={selected !== 'core' ? 'page' : undefined}>Isolated Markets</Link>
  </nav>;
}
