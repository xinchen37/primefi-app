import { poolSnapshot } from './snapshots';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatUnits, isAddress, parseAbi, zeroAddress } from 'viem';
import { ArrowLeft, ArrowUpRight, Check, Wallet } from 'lucide-react';
import { Token, Note } from '../components';
import InfoTip from '../InfoTip';
import RateChart from '../RateChart';
import chainIcon from '../images/icon/robinhood.png';
import { formatAssetAmount, formatBaseValue, formatNumber } from '../utils/formatNumber';
import { robinhood } from '../network';
import type { Action } from '../model';
import type { LendingAsset, LendingMarket } from './config';
import { reserveValue, type MarketReserve } from './marketRead';
import { lendingClient, lendingError } from './client';
import { reserveData } from './service';
import { reserveAvailable } from './reserveAvailability';
import { marketPath } from './marketSelection';
import LendingTransaction from './LendingTransaction';
import { Skeleton } from './LendingSkeleton';

const treasuryAbi = parseAbi(['function RESERVE_TREASURY_ADDRESS() view returns (address)']);
export default function LendingReserve({ market, asset, reserve: r, unit, loading, stale, isolated, onConnect, beforeSubmit }: {
  market: LendingMarket; asset: LendingAsset; reserve?: MarketReserve; unit?: bigint; loading: boolean; stale: boolean; isolated: boolean; onConnect: () => void; beforeSubmit: () => Promise<void>;
}) {
  const { address, isConnected } = useAccount();
  const cache = useQueryClient();
  const account = isConnected ? address : undefined;
  const [action, setAction] = useState<Action>();
  useEffect(() => setAction(undefined), [account, market.pool, asset.address]);
  const personal = useQuery({ queryKey: ['lending-pool', robinhood.id, market.pool, account, market], enabled: !!account, staleTime: 10_000, refetchInterval: 20_000, retry: 1,
    queryFn: () => poolSnapshot(cache, market, account),
  });
  const treasury = useQuery({ queryKey: ['reserve-treasury', robinhood.id, market.pool, asset.address], staleTime: 300_000, retry: 1,
    queryFn: async () => {
      if (await lendingClient.getChainId() !== robinhood.id) throw new Error('RPC network mismatch');
      const reserve = await reserveData({ read: call => lendingClient.readContract(call) }, market, asset);
      const value = await lendingClient.readContract({ address: reserve.aTokenAddress, abi: treasuryAbi, functionName: 'RESERVE_TREASURY_ADDRESS' });
      if (!isAddress(value) || value === zeroAddress) throw new Error('Collector address unavailable');
      return value;
    },
  });
  const row = personal.data?.assets.find(a => a.asset.address === asset.address);
  const amount = (n: bigint) => `${formatAssetAmount(formatUnits(n, asset.decimals), asset)} ${asset.symbol}`;
  const short = (n: bigint) => formatNumber(formatUnits(n, asset.decimals), { compact: true, decimals: asset.displayDecimals ?? 2, trimZeros: true });
  const usd = (n: bigint, compact = true) => unit ? formatBaseValue(n, unit, { currencySymbol: '$', compact }) : '—';
  const worth = (n: bigint, compact = true) => r ? usd(reserveValue(r, n), compact) : '—';
  const pct = (n: number) => `${formatNumber(n)}%`;
  const available = (operation: Action) => row && personal.data && r ? reserveAvailable(operation, row, personal.data, r) : 0n;
  const blocked = (operation: Action) => !row || !r || stale || personal.isError || available(operation) <= 0n;
  const value = (n: bigint | undefined) => n === undefined ? personal.isPending ? <Skeleton /> : '—' : amount(n);
  const utilization = r && r.borrowed + r.liquidity > 0n ? formatBaseValue(r.borrowed * 10_000n / (r.borrowed + r.liquidity), 100n) + '%' : '0.00%';
  const historyKey = `${robinhood.id}:${market.pool}:${asset.address}`;
  function summary(borrow = false) {
    if (!r) return loading ? <Skeleton large /> : <p>Reserve data unavailable.</p>;
    const total = borrow ? r.borrowed : r.supplied, cap = borrow ? r.borrowCap : r.supplyCap;
    const used = cap > 0n ? Number(total * 10_000n / cap) / 100 : 0;
    return <div className="reserve-cap-summary">
      {cap > 0n && <div className="cap-ring" role="img" aria-label={`${pct(used)} of ${borrow ? 'borrow' : 'supply'} cap used`}><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="43" className="ring-track" /><circle cx="50" cy="50" r="43" className="ring-fill" pathLength="100" strokeDasharray={`${Math.min(100, Math.max(0, used))} 100`} /></svg><strong>{pct(used)}</strong></div>}
      <div><span>Total {borrow ? 'borrowed' : 'supplied'} <InfoTip label={borrow ? 'Total borrowed' : 'Total supplied'} /></span><strong>{short(total)} <small>{asset.symbol}</small></strong><small>{worth(total)}</small></div>
      <div className="reserve-stat-divider"><span>{borrow ? 'APY, variable' : 'Supply APY'}</span><strong className={borrow ? '' : 'apy'}>{pct(borrow ? r.borrowApy : r.supplyApy)}</strong></div>
      <div className="reserve-stat-divider"><span>{borrow ? 'Borrow cap' : 'Supply cap'}</span><strong>{cap === 0n ? 'No limit' : short(cap)}</strong>{cap > 0n && <small>{asset.symbol} · {worth(cap)}</small>}</div>
    </div>;
  }
  return <div className="reserve-page">
    <div className="reserve-breadcrumb"><Link className="secondary" to={marketPath('/markets', isolated)}><ArrowLeft size={16} />Go back</Link><span><img src={chainIcon} width="24" height="24" alt="" />{robinhood.name} · {isolated ? 'Isolated Markets' : 'Core Market'}</span></div>
    <section className="reserve-heading" aria-label="Reserve overview"><div className="reserve-identity"><Token symbol={asset.iconSymbol ?? asset.symbol} /><div><span>{asset.symbol}</span><h1>{asset.name ?? asset.symbol}</h1></div></div>
      <dl className="reserve-metrics">{[['Reserve size', r ? worth(r.supplied) : '—'], ['Available liquidity', r ? worth(r.liquidity) : '—'], ['Utilization rate', r ? utilization : '—'], ['Oracle price', r ? usd(r.price, false) : '—']].map(([label, text]) => <div key={label}><dt>{label}</dt><dd>{loading ? <Skeleton /> : text}</dd></div>)}</dl>
    </section>
    {r && (!r.active || r.paused || r.frozen) && <Note>{!r.active ? 'This reserve is inactive.' : r.paused ? 'This reserve is paused. Transactions are unavailable.' : 'This reserve is frozen. Only withdraw and repay remain available, subject to contract checks.'}</Note>}
    <div className="reserve-layout"><article className="reserve-config panel"><h2>Reserve status &amp; configuration</h2>
      <section className="reserve-section"><h3>Supply Info</h3><div className="reserve-section-body">{summary()}
        {r && <RateChart key={historyKey + ':supply'} sourceKey={historyKey + ':supply'} label="Supply APY" rate={r.supplyApy} />}
        <div className="collateral-title"><h4>Collateral usage</h4><span>{r ? r.ltv > 0 ? <><Check size={17} />Can be collateral</> : 'Not enabled in standard mode' : '—'}</span></div>
        <dl className="reserve-parameters">{(['Max LTV', 'Liquidation threshold', 'Liquidation penalty'] as const).map((label, i) => <div key={label}><dt>{label} <InfoTip label={label} /></dt><dd>{loading ? <Skeleton /> : r ? pct([r.ltv, r.threshold, r.penalty][i]) : '—'}</dd></div>)}</dl>
      </div></section>
      <section className="reserve-section"><h3>Borrow info</h3><div className="reserve-section-body">{summary(true)}
        {r && !r.borrowing && <Note>New borrowing is disabled for this asset. Existing debt can still be repaid when the reserve is not paused.</Note>}
        {r && <RateChart key={historyKey + ':borrow'} sourceKey={historyKey + ':borrow'} label="Borrow APY, variable" rate={r.borrowApy} borrow />}
        <section className="collector-info" aria-label="Collector Info"><h4>Collector Info</h4><dl className="reserve-parameters">
          <div><dt>Reserve factor <InfoTip label="Reserve factor" /></dt><dd>{loading ? <Skeleton /> : r ? pct(r.reserveFactor) : '—'}</dd></div>
          <div><dt>Collector Contract</dt><dd>{treasury.data ? <a className="collector-contract" href={`${robinhood.blockExplorers.default.url}/address/${treasury.data}`} target="_blank" rel="noreferrer">View contract <ArrowUpRight size={16} /></a> : treasury.isPending ? <Skeleton /> : <button className="collector-contract" onClick={() => void treasury.refetch()}>Unavailable · Retry</button>}</dd></div>
        </dl></section>
      </div></section>
    </article>
    <aside className="reserve-account panel"><h2>Your info</h2>
      {!account ? <div className="reserve-connect"><Wallet size={30} /><p>Connect your wallet to view your balance and manage your position.</p><button className="primary" onClick={onConnect}>Connect wallet</button></div> : <>
        {personal.error && <p role="alert" className="error">{lendingError(personal.error)} <button onClick={() => void personal.refetch()}>Retry</button></p>}
        <div className="reserve-wallet"><Wallet size={24} /><div><span>Wallet balance</span><strong>{value(row?.wallet)}</strong><small>{row ? worth(row.wallet, false) : '—'}</small></div></div>
        {(['supply', 'borrow'] as const).map(operation => <div className="reserve-account-action" key={operation}><div><span>Available to {operation}</span><strong>{row && r ? amount(available(operation)) : value(undefined)}</strong><small>{row && r ? worth(available(operation), false) : '—'}</small></div><button className={operation === 'supply' ? 'primary' : 'secondary'} disabled={blocked(operation)} onClick={() => setAction(operation)}>{operation === 'supply' ? 'Supply' : 'Borrow'}</button></div>)}
        <div className="reserve-position"><h3>Your position</h3><div><span>Supplied</span><strong>{value(row?.supplied)}</strong></div><div><span>Borrowed</span><strong>{value(row?.debt)}</strong></div><div><span>Collateral</span><strong>{row ? row.collateral ? 'Enabled' : 'Not enabled' : '—'}</strong></div><div><span>Health factor</span><strong>{personal.data ? personal.data.debt === 0n ? '∞' : formatBaseValue(personal.data.health, 10n ** 18n) : '—'}</strong></div>
          <div className="reserve-position-actions">{(['withdraw', 'repay'] as const).map(operation => <button key={operation} className="secondary" disabled={blocked(operation)} onClick={() => setAction(operation)}>{operation === 'withdraw' ? 'Withdraw' : 'Repay'}</button>)}</div>
        </div>
      </>}
    </aside></div>
    {action && row && personal.data && account && <LendingTransaction key={`${account}:${market.pool}:${asset.address}:${action}`} market={market} row={row} pool={personal.data} account={account} action={action} beforeSubmit={beforeSubmit} onClose={() => setAction(undefined)} />}
  </div>;
}
