import MissingValue from '../MissingValue';
import { reservePath } from './marketSelection';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Token, DetailLink } from '../components';
import type { LendingMarket } from './config';
import styles from './LendingSkeleton.module.css';

export function Skeleton({ large = false }: { large?: boolean }) {
  return <span aria-hidden="true" className={`${styles.skeleton} ${large ? styles.large : ''}`} />;
}

export function PendingPanel({ title, action, market, connected, loading, retry }: {
  title: string; action: 'withdraw' | 'repay' | 'supply' | 'borrow'; market?: LendingMarket;
  connected: boolean; loading: boolean; retry: () => void;
}) {
  const personal = action === 'withdraw' || action === 'repay';
  const pending = loading && (!personal || connected);
  const cell = () => loading ? <Skeleton /> : <MissingValue />;
  return <section className="panel" aria-busy={pending} aria-label={title}>
    <div className="panel-title"><span className="inline">{personal && (action === 'withdraw' ? <ArrowDownLeft size={19} /> : <ArrowUpRight size={19} />)}<h3>{title}</h3></span><span className="subtle">{personal ? market?.name : action === 'supply' ? 'Available balance' : 'Variable rates'}</span></div>
    {personal && <div className="panel-stats"><div><small>{action === 'withdraw' ? 'Supply balance' : 'Borrow balance'}</small><strong>{pending ? <Skeleton large /> : <MissingValue />}</strong></div><div><small>{action === 'withdraw' ? 'Weighted supply APY' : 'Health factor'}</small><strong>{pending ? <Skeleton /> : <MissingValue />}</strong></div></div>}
    {personal ? <div className="empty">{!connected ? 'Connect your wallet to view your positions.' : loading ? <span role="status">Loading your positions…</span> : <span>Unable to load positions. <button className="text-button" onClick={retry}>Retry</button></span>}</div> : <>
      <div className="table-wrap"><table><thead><tr><th>Asset</th><th>{action === 'supply' ? 'Balance' : 'Available'}</th><th>{action === 'supply' ? 'Supply APY' : 'Borrow APY'}</th><th /></tr></thead><tbody>
        {market?.assets.map(asset => <tr key={asset.address}><td><div className="asset-name"><Token symbol={asset.iconSymbol ?? asset.symbol} /><span><strong>{asset.symbol}</strong><small>{asset.name ?? asset.symbol}</small></span></div></td><td>{connected ? cell() : <MissingValue />}<small>{connected ? cell() : <MissingValue />}</small></td><td>{cell()}</td><td><div className="row-actions"><button className={action === 'supply' ? 'primary' : 'secondary'} disabled>{action === 'supply' ? 'Supply' : 'Borrow'}</button>{<DetailLink to={reservePath(asset.symbol, market.id === 'stock')} label={`View ${asset.symbol} details`} />}</div></td></tr>)}
      </tbody></table></div>
      <div className="table-foot">{loading ? <span role="status">Loading market data…</span> : <span>Market data unavailable. <button className="text-button" onClick={retry}>Retry</button></span>}</div>
    </>}
  </section>;
}
