import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowUpRight, Search } from 'lucide-react';
import { formatUnits } from 'viem';
import { Token, DetailLink } from '../components';
import { MarketCategoryTabs } from '../MarketNavigation';
import { robinhood } from '../network';
import chainIcon from '../images/icon/robinhood.png';
import { formatBaseValue, formatNumber } from '../utils/formatNumber';
import { Skeleton } from './LendingSkeleton';
import { useMarket } from './useMarket';
import { reserveValue, type MarketReserve } from './marketRead';
import { lendingError } from './client';
import { reservePath } from './marketSelection';
import LendingReserve from './LendingReserve';

export default function LendingMarkets({ onHelp, onConnect, beforeSubmit }: { onHelp: () => void; onConnect: () => void; beforeSubmit: () => Promise<void> }) {
  const { isolated, market, result, error, loading, retry } = useMarket();
  const { symbol } = useParams();
  const [search, setSearch] = useState('');
  const data = result.data;
  const usd = (value: bigint) => data ? formatBaseValue(value, data.unit, { currencySymbol: '$', compact: true, trimZeros: true }) : '—';
  const quantities = (r: MarketReserve, amount: bigint) => formatNumber(formatUnits(amount, r.asset.decimals), { compact: true, decimals: r.asset.displayDecimals ?? 2, trimZeros: true });
  const assets = (market?.assets ?? []).filter(a => `${a.symbol} ${a.name ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  const selected = market?.assets.find(a => a.symbol.toLowerCase() === symbol?.toLowerCase() || (symbol?.toLowerCase() === 'eth' && a.symbol === 'WETH'));
  return <>
    {!symbol && <section className="overview"><div className="market-eyebrow"><img className="chain-icon large" src={chainIcon} alt="" /><span>{robinhood.name.toUpperCase()}</span><span className="live-dot" /><span className="subtle">{isolated ? 'Isolated markets' : 'Core market'}</span></div>
      <div className="overview-heading"><h1>{isolated ? 'Isolated lending markets.' : 'Core lending market.'}</h1><button className="text-button" onClick={onHelp}>How lending works <ArrowUpRight size={16} /></button></div>
      <div className="overview-stats">{(['supplied', 'borrowed', 'liquidity'] as const).map((key, i) => <div key={key}><span>{['Total market size', 'Total borrowed', 'Available liquidity'][i]}</span><strong>{loading ? <Skeleton large /> : data ? usd(data[key]) : '—'}</strong></div>)}</div>
      <div className="orbit-art" aria-hidden="true"><div /><div /><div /><span>✦</span></div>
    </section>}
    <div className="content lending-dashboard">
      {!symbol && <MarketCategoryTabs isolated={isolated} />}
      {error && <div className="lending-notice error" role="alert">{lendingError(error)} <button className="secondary" onClick={retry}>Retry</button></div>}
      {result.isPaused && <p role="status">Connection unavailable. Updates will resume when you are online.</p>}
      {symbol ? selected && market ? <LendingReserve market={market} asset={selected} reserve={data?.reserves.find(r => r.asset.address === selected.address)} unit={data?.unit} loading={loading} stale={!!error} isolated={isolated} onConnect={onConnect} beforeSubmit={beforeSubmit} /> : !loading && <div className="empty">Asset is not configured in this pool.</div> : <>
        <div className="section-heading"><div><h2>{isolated ? 'Isolated markets' : 'Core market'}</h2><p>Explore assets and lending conditions in {market?.name ?? 'this pool'}.</p></div><label className="search"><Search size={17} /><input aria-label="Search assets" placeholder="Search assets" value={search} onChange={e => setSearch(e.target.value)} /></label></div>
        <section className="panel market-table table-wrap" aria-busy={loading}><table><thead><tr>{['Asset', 'Total supplied', 'Supply APY', 'Total borrowed', 'Borrow APY', 'Utilization', 'Borrow cap', ''].map((h, i) => <th key={i}>{h}</th>)}</tr></thead><tbody>
          {assets.map(asset => {
            const r = data?.reserves.find(row => row.asset.address === asset.address);
            const to = reservePath(asset.symbol, isolated);
            const utilization = r && r.borrowed + r.liquidity > 0n ? formatBaseValue(r.borrowed * 10_000n / (r.borrowed + r.liquidity), 100n) : '0.00';
            return <tr key={asset.address}><td><Link to={to}><div className="asset-name"><Token symbol={asset.iconSymbol ?? asset.symbol} /><span><strong>{asset.symbol}</strong><small>{asset.name}</small>{r && (!r.active || r.paused || r.frozen) && <small>{!r.active ? 'Inactive' : r.paused ? 'Paused' : 'Frozen'}</small>}</span></div></Link></td>
              {r ? <><td><strong>{usd(reserveValue(r, r.supplied))}</strong><small>{quantities(r, r.supplied)} {asset.symbol}</small></td><td className="apy">{formatNumber(r.supplyApy)}%</td><td><strong>{usd(reserveValue(r, r.borrowed))}</strong><small>{quantities(r, r.borrowed)} {asset.symbol}</small></td><td>{r.borrowing ? `${formatNumber(r.borrowApy)}%` : <span className="tag">Not borrowable</span>}</td><td>{utilization}%</td><td>{r.borrowCap === 0n ? 'No limit' : <><strong>{usd(reserveValue(r, r.borrowCap))}</strong><small>{quantities(r, r.borrowCap)} {asset.symbol}</small></>}</td></> : Array.from({ length: 6 }, (_, i) => <td key={i}>{loading ? <Skeleton /> : '—'}</td>)}
              <td><DetailLink to={to} label={`View ${asset.symbol} details`} /></td></tr>;
          })}
        </tbody></table>{!assets.length && !error && <div className="empty">No matching assets</div>}</section>
        <div className="market-notes"><div><span>01 / ASSET-SPECIFIC RISK</span><h3>Different assets. Different limits.</h3><p>Collateral requirements and supply and borrow limits vary by asset. Open an asset to view its current parameters.</p></div><div><span>02 / VARIABLE RATES</span><h3>Rates respond to market demand.</h3><p>Interest rates change with utilization. Available borrowing also depends on your collateral and pool liquidity.</p></div></div>
      </>}
    </div>
  </>;
}
