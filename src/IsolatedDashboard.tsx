import { formatNumber } from './utils/formatNumber';
import { Link } from 'react-router-dom';
import { Health, Note, Token, TokenPair, DetailLink } from './components';
import { money, number, type Action } from './model';
import { isolatedMarkets, isolatedMaximum, isolatedTotals, type IsolatedMarket, type IsolatedPortfolio } from './isolated';

export default function IsolatedDashboard({ portfolio, connected, usdgWallet, onConnect, onAction }: {
  portfolio: IsolatedPortfolio; connected: boolean; usdgWallet: number; onConnect: () => void;
  onAction: (market: IsolatedMarket, action: Action) => void;
}) {
  const rows = isolatedMarkets.map(m => {
    const p = connected ? portfolio[m.symbol] : { wallet: 0, supplied: 0, debt: 0 };
    return { m, p, t: isolatedTotals(m, p) };
  });
  const supplies = rows.filter(r => r.p.supplied > 0), borrows = rows.filter(r => r.p.debt > 0);
  const collateral = rows.reduce((sum, r) => sum + r.t.collateral, 0), debt = rows.reduce((sum, r) => sum + r.p.debt, 0);
  function action(m: IsolatedMarket, type: Action) { if (connected) onAction(m, type); else onConnect(); }
  function identity(m: IsolatedMarket, pair = false) {
    return <Link className="asset-name" to={`/markets/isolated/${m.symbol.toLowerCase()}`}>{pair ? <TokenPair primary="USDG" secondary={m.symbol} /> : <Token symbol={m.symbol} />}<span><strong>{pair ? 'USDG' : m.symbol}</strong><small>{pair ? `Against ${m.symbol}` : 'Isolated collateral'}</small></span></Link>;
  }
  function empty(text: string) { return <div className="empty"><p>{connected ? text : 'Connect your wallet to view your isolated positions.'}</p>{!connected && <button className="secondary" onClick={onConnect}>Connect wallet</button>}</div>; }
  function availableAction(m: IsolatedMarket, type: 'supply' | 'borrow', disabled: boolean) {
    return <div className="row-actions">
      <button className={type === 'supply' ? 'primary' : 'secondary'} disabled={disabled} onClick={() => action(m, type)}>{type === 'supply' ? 'Supply' : 'Borrow'}</button>
      <DetailLink to={`/markets/isolated/${m.symbol.toLowerCase()}`} label={`View ${m.symbol} market details`} />
    </div>;
  }
  return <>
    <div className="section-heading"><div><h2>Your positions</h2><p>Manage isolated collateral and USDG debt across three independent markets.</p></div></div>
    <Note>Balances are aggregated for display only. Each market has its own borrowing power and health factor; collateral cannot be combined.</Note>
    <div className="position-grid isolated-position-grid">
      <section className="panel"><div className="panel-title"><h3>Your supplies</h3></div>
        <div className="panel-stats"><div><small>Total collateral value</small><strong>{money(collateral)}</strong></div><div><small>Active markets</small><strong>{supplies.length}</strong></div></div>
        {supplies.length ? <div className="table-wrap"><table><thead><tr><th>Asset</th><th>Balance</th><th>Collateral</th><th /></tr></thead><tbody>{supplies.map(({ m, p, t }) => <tr key={m.symbol}><td>{identity(m)}</td><td><strong>{number(p.supplied)}</strong><small>{money(t.collateral)}</small></td><td><span className="tag">Isolated</span></td><td><button className="secondary" disabled={isolatedMaximum('withdraw', m, p, usdgWallet) <= 0} onClick={() => action(m, 'withdraw')}>Withdraw</button></td></tr>)}</tbody></table></div> : empty('Supply an asset below to open an isolated position.')}
      </section>
      <section className="panel"><div className="panel-title"><h3>Your borrows</h3></div>
        <div className="panel-stats"><div><small>Total USDG debt</small><strong>{money(debt)}</strong></div><div><small>Risk assessment</small><strong className="isolated-risk-label">Per market</strong></div></div>
        {borrows.length ? <div className="table-wrap"><table><thead><tr><th>Borrow / collateral</th><th>Debt / APY</th><th>Health factor</th><th /></tr></thead><tbody>{borrows.map(({ m, p, t }) => <tr key={m.symbol}><td>{identity(m, true)}</td><td><strong>{number(p.debt)} USDG</strong><small>{formatNumber(m.borrowApy, { decimals: 2 })}% APY</small></td><td><Health value={t.hf} /></td><td><button className="secondary" disabled={isolatedMaximum('repay', m, p, usdgWallet) <= 0} onClick={() => action(m, 'repay')}>Repay</button></td></tr>)}</tbody></table></div> : empty('Supply isolated collateral to start borrowing USDG.')}
        <div className="table-foot">Each position may be liquidated independently when its health factor falls below 1.</div>
      </section>
    </div>
    <div className="position-grid asset-panels">
      <section className="panel"><div className="panel-title"><h3>Assets to supply</h3><span className="subtle">Available balance</span></div>
        <div className="table-wrap"><table><thead><tr><th>Asset</th><th>Wallet balance</th><th>Max LTV</th><th /></tr></thead><tbody>{rows.map(({ m, p }) => <tr key={m.symbol}><td>{identity(m)}</td><td><strong>{connected ? number(p.wallet) : '—'}</strong><small>{connected ? money(p.wallet * m.price) : 'Connect to view'}</small></td><td>{formatNumber((m.ltv * 100), { decimals: 0 })}%</td><td>{availableAction(m, 'supply', connected && p.wallet <= 0)}</td></tr>)}</tbody></table></div>
        <div className="table-foot">These assets are collateral only and do not earn lending interest. No supply cap applies.</div>
      </section>
      <section className="panel"><div className="panel-title"><h3>Assets to borrow</h3><span className="subtle">USDG only</span></div>
        <div className="table-wrap"><table><thead><tr><th>Borrow / collateral</th><th>Available</th><th>Borrow APY</th><th /></tr></thead><tbody>{rows.map(({ m, p }) => { const max = connected ? isolatedMaximum('borrow', m, p, usdgWallet) : 0; return <tr key={m.symbol}><td>{identity(m, true)}</td><td><strong>{connected ? number(max) : '—'}</strong><small>{connected ? 'USDG' : 'Connect to view'}</small></td><td>{formatNumber(m.borrowApy, { decimals: 2 })}%</td><td>{availableAction(m, 'borrow', connected && max <= 0)}</td></tr>; })}</tbody></table></div>
        <div className="table-foot">Available amounts depend on the matching collateral, remaining debt ceiling and USDG liquidity.</div>
      </section>
    </div>
  </>;
}
