import { formatNumber } from './utils/formatNumber';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Search } from 'lucide-react';
import { TokenPair, Note } from './components';
import { compact } from './model';
import { isolatedMarkets, isolatedTotals, type IsolatedPortfolio } from './isolated';

export default function IsolatedMarkets({ portfolio }: { portfolio: IsolatedPortfolio }) {
  const [search, setSearch] = useState('');
  const markets = isolatedMarkets.filter(m => `${m.symbol} ${m.name} USDG`.toLowerCase().includes(search.trim().toLowerCase()));
  return <>
    <div className="section-heading"><div><h2>Isolated markets</h2><p>One collateral asset. USDG borrowing. Independent risk limits.</p></div><label className="search"><Search size={17} /><input aria-label="Search isolated markets" placeholder="Search markets" value={search} onChange={e => setSearch(e.target.value)} /></label></div>
    <Note>Each position uses a single collateral asset to borrow USDG. Collateral and borrowing power cannot be combined with the core market or another isolated market.</Note>
    <section className="panel table-wrap isolated-table"><table><thead><tr><th>Collateral → Borrow</th><th>Total collateral</th><th>Max LTV</th><th>Borrow APY</th><th>Debt ceiling used</th><th>Available to borrow</th><th /></tr></thead><tbody>
      {markets.map(m => { const t = isolatedTotals(m, portfolio[m.symbol]); return <tr key={m.symbol}>
        <td><Link className="asset-name" to={`/markets/isolated/${m.symbol.toLowerCase()}`}><TokenPair primary={m.symbol} secondary="USDG" /><span><strong>{m.symbol}</strong><small>Borrow USDG</small></span></Link></td>
        <td><strong>${compact(t.totalCollateral * m.price)}</strong><small>{compact(t.totalCollateral)} {m.symbol}</small></td><td>{formatNumber((m.ltv * 100), { decimals: 0 })}%</td><td>{formatNumber(m.borrowApy, { decimals: 2 })}%</td>
        <td><strong>${compact(t.totalDebt)} / ${compact(m.debtCeiling)}</strong><div className="progress"><i style={{ width: `${Math.min(100, t.totalDebt / m.debtCeiling * 100)}%` }} /></div><small>{formatNumber((t.totalDebt / m.debtCeiling * 100), { decimals: 1 })}% used</small></td><td>${compact(Math.min(t.remaining, t.liquidity))} USDG</td>
        <td><Link className="icon-button" to={`/markets/isolated/${m.symbol.toLowerCase()}`} aria-label={`View ${m.symbol} market`}><ArrowUpRight size={18} /></Link></td>
      </tr>; })}
    </tbody></table>{!markets.length && <div className="empty">No matching markets</div>}</section>
  </>;
}
