import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { TokenPair, Health, Note } from './components';
import { money, number, compact, type Action } from './model';
import { isolatedMarkets, isolatedTotals, isolatedMaximum, type IsolatedMarket, type IsolatedPortfolio } from './isolated';
import { PositionTabs } from './MarketNavigation';
import InfoTip from './InfoTip';
import RateChart from './RateChart';

export default function IsolatedOverview({ portfolio, connected, usdgWallet, dashboard = false, onConnect, onAction }: {
  portfolio: IsolatedPortfolio; connected: boolean; usdgWallet: number; dashboard?: boolean;
  onConnect: () => void; onAction: (market: IsolatedMarket, action: Action) => void;
}) {
  const { symbol } = useParams();
  const m = isolatedMarkets.find(m => m.symbol.toLowerCase() === symbol?.toLowerCase());
  if (!m) return <section className="empty not-found"><h1>Market not found</h1><Link to="/markets?category=isolated" className="primary">Back to isolated markets</Link></section>;
  const p = connected ? portfolio[m.symbol] : { wallet: 0, supplied: 0, debt: 0 };
  const t = isolatedTotals(m, portfolio[m.symbol]), personal = isolatedTotals(m, p);
  return <div className="reserve-page">
    {dashboard ? <PositionTabs selected={m.symbol} /> : <div className="reserve-breadcrumb"><Link className="secondary" to="/markets?category=isolated"><ArrowLeft size={16} />Go back</Link><span>Isolated Market</span></div>}
    <section className="reserve-heading"><div className="reserve-identity"><TokenPair primary={m.symbol} secondary="USDG" /><div><span>Isolated Market</span><h1>{m.symbol} / USDG</h1></div></div><dl className="reserve-metrics">
      {(dashboard ? [['Your collateral', money(personal.collateral)], ['Your debt', money(p.debt)], ['Health factor', connected && p.debt ? personal.hf.toFixed(2) : '—'], ['Borrowing power', money(connected ? isolatedMaximum('borrow', m, p, usdgWallet) : 0)]] : [['Total collateral', `$${compact(t.totalCollateral * m.price)}`], ['Total borrowed', `$${compact(t.totalDebt)}`], ['Debt ceiling', `$${compact(m.debtCeiling)}`], ['Collateral price', money(m.price)]]).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl></section>
    <Note>{m.symbol} is collateral only. Borrow USDG against this asset in an independent position. Collateral cannot be combined across markets.</Note>
    <div className="reserve-layout isolated-layout"><article className="reserve-config panel"><h2>Market status & configuration</h2>
      <section className="reserve-section"><h3>Collateral info</h3><div className="reserve-cap-summary"><div><span>Total supplied</span><strong>{compact(t.totalCollateral)} {m.symbol}</strong><small>${compact(t.totalCollateral * m.price)}</small></div><div className="reserve-stat-divider"><span>Supply cap</span><strong>No limit</strong></div><div className="reserve-stat-divider"><span>Borrowable asset</span><strong>USDG only</strong></div></div>
        <div className="collateral-title"><h4>Collateral usage</h4><span>Isolated collateral</span></div><dl className="reserve-parameters">{([['Max LTV', m.ltv * 100], ['Liquidation threshold', m.threshold * 100], ['Liquidation penalty', m.penalty]] as const).map(([label, value]) => <div key={label}><dt>{label} <InfoTip label={label} /></dt><dd>{value.toFixed(2)}%</dd></div>)}</dl>
      </section>
      <section className="reserve-section"><h3>Borrow info · USDG</h3><div className="debt-ceiling"><div><span>Debt ceiling used</span><strong>${compact(t.totalDebt)} of ${compact(m.debtCeiling)}</strong></div><span>{(t.totalDebt / m.debtCeiling * 100).toFixed(2)}%</span><div className="progress"><i style={{ width: `${Math.min(100, t.totalDebt / m.debtCeiling * 100)}%` }} /></div></div>
        <p className="subtle">Across all users, borrowing against {m.symbol} is limited to ${compact(m.debtCeiling)} USDG. Remaining market capacity: ${compact(Math.min(t.remaining, t.liquidity))}.</p>
        <RateChart label="Borrow APY, variable" rate={m.borrowApy} borrow />
        <section className="collector-info"><h4>Collector Info</h4><dl className="reserve-parameters"><div><dt>Reserve factor <InfoTip label="Reserve factor" /></dt><dd>{m.reserveFactor.toFixed(2)}%</dd></div><div><dt>Collector Contract</dt><dd><button className="collector-contract" disabled title="Contract address is not available yet.">View contract ↗</button></dd></div></dl></section>
      </section>
    </article><aside className="reserve-account panel"><h2>Your info</h2>{!connected ? <div className="reserve-connect"><p>Connect your wallet to manage this isolated position.</p><button className="primary" onClick={onConnect}>Connect wallet</button></div> : <>
      <div className="reserve-position"><div><span>{m.symbol} wallet</span><strong>{number(p.wallet)}</strong></div><div><span>USDG wallet</span><strong>{number(usdgWallet)}</strong></div><div><span>Collateral supplied</span><strong>{number(p.supplied)} {m.symbol}</strong></div><div><span>USDG debt</span><strong>{number(p.debt)}</strong></div><div><span>Health factor</span><Health value={personal.hf} /></div></div>
      {(['supply', 'borrow', 'repay', 'withdraw'] as const).map(action => { const max = isolatedMaximum(action, m, p, usdgWallet); return <div className="reserve-account-action" key={action}><div><span>Available to {action}</span><strong>{number(max)} {action === 'borrow' || action === 'repay' ? 'USDG' : m.symbol}</strong></div><button className={action === 'supply' ? 'primary' : 'secondary'} disabled={max <= 0} onClick={() => onAction(m, action)}>{action[0].toUpperCase() + action.slice(1)}</button></div>; })}
      {!p.supplied && <Note>Supply {m.symbol} first to unlock USDG borrowing in this market.</Note>}
    </>}</aside></div>
  </div>;
}
