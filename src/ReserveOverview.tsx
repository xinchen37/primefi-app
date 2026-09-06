import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Check, Wallet } from 'lucide-react';
import { assets, compact, money, number, reserve, maximum, totals, type Asset, type Action, type Portfolio } from './model';
import { Token, Health, Note } from './components';
import RateChart from './RateChart';
import { robinhood } from './wallet';
import robinhoodIcon from './images/icon/robinhood.png';

function CapSummary({ amount, cap, asset, borrow = false }: { amount: number; cap: number; asset: Asset; borrow?: boolean }) {
  const percent = cap ? amount / cap * 100 : 0;
  return <div className="reserve-cap-summary">
    <div className="cap-ring" role="img" aria-label={`${percent.toFixed(2)}% of ${borrow ? 'borrow' : 'supply'} cap used`}>
      <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="43" className="ring-track" /><circle cx="50" cy="50" r="43" className="ring-fill" pathLength="100" strokeDasharray={`${Math.min(100, Math.max(0, percent))} 100`} /></svg>
      <strong>{percent.toFixed(2)}%</strong>
    </div>
    <div><span>Total {borrow ? 'borrowed' : 'supplied'}</span><strong>{compact(amount)} <em>of</em> {compact(cap)} <small>{asset.symbol}</small></strong><small title={`${money(amount * asset.price)} of ${money(cap * asset.price)}`}>${compact(amount * asset.price)} of ${compact(cap * asset.price)}</small></div>
    <div><span>{borrow ? 'APY, variable' : 'Supply APY'}</span><strong className={borrow ? '' : 'apy'}>{(borrow ? asset.borrowApy : asset.supplyApy).toFixed(2)}%</strong></div>
    {borrow && <div><span>Borrow cap</span><strong>{compact(cap)} <small>{asset.symbol}</small></strong><small title={money(cap * asset.price)}>${compact(cap * asset.price)}</small></div>}
  </div>;
}

function YourInfo({ asset, portfolio, connected, onConnect, onAction }: Props & { asset: Asset }) {
  const position = portfolio[asset.symbol];
  const supply = maximum('supply', asset, portfolio);
  const borrow = maximum('borrow', asset, portfolio);
  return <aside className="reserve-account panel"><h2>Your info</h2>
    {!connected ? <div className="reserve-connect"><Wallet size={30} /><p>Connect your wallet to view your balance and manage your position.</p><button className="primary" onClick={onConnect}>Connect wallet</button></div> : <>
      <div className="reserve-wallet"><Wallet size={24} /><div><span>Wallet balance</span><strong>{number(position.wallet)} {asset.symbol}</strong><small>{money(position.wallet * asset.price)}</small></div></div>
      {(['supply', 'borrow'] as const).map(action => {
        const value = action === 'supply' ? supply : borrow;
        return <div className="reserve-account-action" key={action}><div><span>Available to {action}</span><strong>{number(value)} {asset.symbol}</strong><small>{money(value * asset.price)}</small></div><button className={action === 'supply' ? 'primary' : 'secondary'} disabled={value <= 0 || (action === 'borrow' && !asset.borrowCap)} onClick={() => onAction(asset, action)}>{action === 'supply' ? 'Supply' : 'Borrow'}</button></div>;
      })}
      {!position.wallet && <Note>Transfer {asset.symbol} to your wallet to start supplying.</Note>}
      {asset.borrowCap > 0 && borrow <= 0 && <Note>Supply assets and enable collateral to increase your borrowing power.</Note>}
      <div className="reserve-position"><h3>Your position</h3><div><span>Supplied</span><strong>{number(position.supplied)} {asset.symbol}</strong></div><div><span>Borrowed</span><strong>{number(position.debt)} {asset.symbol}</strong></div><div><span>Collateral</span><strong>{position.supplied > 0 && position.collateral ? 'Enabled' : 'Not enabled'}</strong></div><div><span>Health factor</span><Health value={totals(portfolio).hf} /></div>
        <div className="reserve-position-actions"><button className="secondary" disabled={maximum('withdraw', asset, portfolio) <= 0} onClick={() => onAction(asset, 'withdraw')}>Withdraw</button><button className="secondary" disabled={maximum('repay', asset, portfolio) <= 0} onClick={() => onAction(asset, 'repay')}>Repay</button></div>
      </div>
    </>}
  </aside>;
}

interface Props { portfolio: Portfolio; connected: boolean; onConnect: () => void; onAction: (asset: Asset, action: Action) => void }
export default function ReserveOverview(props: Props) {
  const { symbol } = useParams();
  const asset = assets.find(a => a.symbol.toLowerCase() === symbol?.toLowerCase());
  if (!asset) return <section className="empty not-found"><h1>Asset not found</h1><p>This asset is not available in this market.</p><Link to="/markets" className="primary">Back to markets</Link></section>;
  const r = reserve(asset, props.portfolio);
  return <div className="reserve-page">
    <div className="reserve-breadcrumb"><Link className="secondary" to="/markets"><ArrowLeft size={16} />Go back</Link><span><img src={robinhoodIcon} width="24" height="24" alt="" />{robinhood.name}</span></div>
    <section className="reserve-heading" aria-label="Reserve overview"><div className="reserve-identity"><Token symbol={asset.symbol} /><div><span>{asset.symbol}</span><h1>{asset.name}</h1></div></div><dl className="reserve-metrics">
      {[['Reserve size', `$${compact(r.total * asset.price)}`], ['Available liquidity', `$${compact(Math.max(0, r.total - r.borrowed) * asset.price)}`], ['Utilization rate', `${(r.total ? r.borrowed / r.total * 100 : 0).toFixed(2)}%`], ['Oracle price', money(asset.price)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl></section>
    <div className="reserve-layout"><article className="reserve-config panel"><h2>Reserve status & configuration</h2>
      <section className="reserve-section"><h3>Supply Info</h3><div className="reserve-section-body"><CapSummary amount={r.total} cap={asset.supplyCap} asset={asset} /><RateChart key={`${asset.symbol}-supply`} label="Supply APY" rate={asset.supplyApy} />
        <div className="collateral-title"><h4>Collateral usage</h4><span><Check size={17} />Can be collateral</span></div>
        <dl className="reserve-parameters">{[['Max LTV', `${(asset.ltv * 100).toFixed(2)}%`, 'Maximum borrowing power as a percentage of collateral value.'], ['Liquidation threshold', `${(asset.threshold * 100).toFixed(2)}%`, 'Collateral weighting used to calculate your health factor.'], ['Liquidation penalty', `${asset.penalty.toFixed(2)}%`, 'Additional collateral charged when a position is liquidated.']].map(([label, value, description]) => <div key={label}><dt title={description}>{label} ⓘ</dt><dd>{value}</dd></div>)}</dl>
        {asset.symbol === 'NVDA' && <Note>Tokenized stock collateral is exposed to market closures and price gaps. Monitor your health factor when borrowing.</Note>}
      </div></section>
      <section className="reserve-section"><h3>Borrow info</h3><div className="reserve-section-body">{asset.borrowCap > 0 ? <><CapSummary amount={r.borrowed} cap={asset.borrowCap} asset={asset} borrow /><RateChart key={`${asset.symbol}-borrow`} label="Borrow APY, variable" rate={asset.borrowApy} borrow />
        <section className="collector-info" aria-label="Collector Info">
          <h4>Collector Info</h4>
          <dl className="reserve-parameters">
            <div><dt title="Share of borrowing interest allocated to the protocol reserve.">Reserve factor ⓘ</dt><dd>{asset.reserveFactor.toFixed(2)}%</dd></div>
            <div><dt>Collector Contract</dt><dd><button className="collector-contract" disabled title="Contract address is not available yet." aria-label="View contract, address not available">View contract <ArrowUpRight size={16} /></button></dd></div>
          </dl>
        </section>
      </> : <div className="reserve-unavailable"><h4>Borrowing is not available</h4><p>{asset.symbol} can be supplied and used as collateral to borrow other assets in this market.</p><Link className="text-button" to="/markets">Explore borrowable assets →</Link></div>}</div></section>
    </article><YourInfo {...props} asset={asset} /></div>
  </div>;
}
