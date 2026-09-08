import MissingValue from '../MissingValue';
import { poolSnapshot } from './snapshots';
import { MarketCategoryTabs } from '../MarketNavigation';
import { isIsolatedMarket, reservePath } from './marketSelection';
import { formatNumber, formatBaseValue, formatAssetAmount } from '../utils/formatNumber';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { formatUnits } from 'viem';
import { Token, Note, Health, Toggle, DetailLink } from '../components';
import { ArrowDownLeft, ArrowUpRight, ShieldCheck } from 'lucide-react';
import InfoTip from '../InfoTip';
import chainIcon from '../images/icon/robinhood.png';
import { type Action } from '../model';
import { robinhood } from '../network';
import { getLendingConfig, loadLendingConfig } from './config';
import { lendingError } from './client';
import { availableAmount, type AssetSnapshot } from './read';
import LendingTransaction from './LendingTransaction';
import { PendingPanel, Skeleton } from './LendingSkeleton';

export default function LendingDashboard({ onConnect, beforeSubmit, onHelp }: { onConnect: () => void; beforeSubmit: () => Promise<void>; onHelp: () => void }) {
  const { address, isConnected } = useAccount();
  const cache = useQueryClient();
  const [params] = useSearchParams();
  const isolated = isIsolatedMarket(params);
  const selected = isolated ? 'stock' : 'stable';
  const categoryName = isolated ? 'Isolated Markets' : 'Core Market';
  const [transaction, setTransaction] = useState<{ row: AssetSnapshot; action: Action }>();
  const deployment = useQuery({ queryKey: ['lending-config', robinhood.id], queryFn: () => loadLendingConfig(robinhood.id), initialData: () => { try { return getLendingConfig(robinhood.id); } catch { return undefined; } }, retry: false, staleTime: Infinity, networkMode: 'always' });
  const market = deployment.data?.markets.find(m => m.id === selected);
  const account = isConnected ? address : undefined;
  useEffect(() => { setTransaction(undefined); }, [account]);
  const result = useQuery({ queryKey: ['lending-pool', robinhood.id, market?.pool, account, market],
    queryFn: () => poolSnapshot(cache, market!, account), enabled: !!market,
    retry: 1, staleTime: 10_000, refetchInterval: 20_000,
  });
  const data = result.data;
  const initialLoading = !data && !deployment.error && !result.error && (deployment.isPending || (!!market && result.isPending));
  const personalLoading = initialLoading && !!account;
  const retry = () => { void deployment.refetch(); if (market) void result.refetch(); };
  const value = (n: bigint) => data && account ? formatBaseValue(n, data.unit, { currencySymbol: '$' }) : <MissingValue />;
  const baseValue = (row: AssetSnapshot, n: bigint) => n * row.price / 10n ** BigInt(row.asset.decimals);
  const supplied = data?.assets.reduce((n, row) => n + baseValue(row, row.supplied), 0n) ?? 0n;
  const debt = data?.debt ?? 0n;
  const weightedSupply = data?.assets.reduce((n, row) => n + Number(baseValue(row, row.supplied)) * row.supplyApy, 0) ?? 0;
  const weightedBorrow = data?.assets.reduce((n, row) => n + Number(baseValue(row, row.debt)) * row.borrowApy, 0) ?? 0;
  const netApy = supplied > debt ? (weightedSupply - weightedBorrow) / Number(supplied - debt) : undefined;
  const hf = data?.debt ? Number(formatUnits(data.health, 18)) : undefined;
  const powerUsed = data && data.debt + data.available > 0n ? Number(data.debt) / Number(data.debt + data.available) * 100 : 0;
  const amount = (row: AssetSnapshot, n: bigint) => formatAssetAmount(formatUnits(n, row.asset.decimals), row.asset);
  function act(row: AssetSnapshot, action: Action) { if (!account) onConnect(); else setTransaction({ row, action }); }
  function identity(row: AssetSnapshot) { return <div className="asset-name"><Token symbol={row.asset.iconSymbol ?? row.asset.symbol} /><span><strong>{row.asset.symbol}</strong><small>{row.asset.name ?? row.asset.symbol}</small></span></div>; }
  function table(title: string, action: Action) {
    if (!data) return <PendingPanel title={title} action={action} market={market} connected={!!account} loading={initialLoading} retry={retry} />;
    const personal = action === 'withdraw' || action === 'repay';
    const rows = data?.assets.filter(r => !personal || (action === 'withdraw' ? r.supplied : r.debt) > 0n) ?? [];
    return <section className="panel"><div className="panel-title"><span className="inline">{personal && (action === 'withdraw' ? <ArrowDownLeft size={19} /> : <ArrowUpRight size={19} />)}<h3>{title}</h3></span><span className="subtle">{personal ? market?.name : action === 'supply' ? 'Available balance' : 'Variable rates'}</span></div>
      {personal && <div className="panel-stats"><div><small>{action === 'withdraw' ? 'Supply balance' : 'Borrow balance'}</small><strong>{value(action === 'withdraw' ? supplied : debt)}</strong></div><div><small>{action === 'withdraw' ? 'Weighted supply APY' : 'Health factor'}</small><strong>{action === 'withdraw' ? (account && supplied > 0n ? `${formatNumber((weightedSupply / Number(supplied)), { decimals: 2 })}%` : <MissingValue />) : hf === undefined ? <MissingValue /> : <Health value={hf} />}</strong></div></div>}
      {action === 'repay' && hf !== undefined && <div className="health-strip"><div><span className={hf >= 1.5 ? 'healthy' : 'danger'}>● {hf >= 1.5 ? 'Healthy position' : 'Position at risk'}</span><span>Liquidation below 1.00</span></div><div className="health-bar"><i style={{ left: `${Math.max(0, Math.min(96, hf / 6 * 100))}%` }} /></div></div>}
      {rows.length ? <div className="table-wrap"><table><thead><tr><th>Asset</th><th>{action === 'withdraw' ? 'Balance / APY' : action === 'repay' ? 'Debt balance' : action === 'supply' ? 'Balance' : 'Available'}</th><th>{action === 'withdraw' ? 'Collateral' : action === 'supply' ? 'Supply APY' : 'Borrow APY'}</th><th /></tr></thead><tbody>{rows.map(row => {
        const available = availableAmount(action, row, data!);
        const balance = action === 'withdraw' ? row.supplied : action === 'repay' ? row.debt : available;
        const disabled = result.isError || !row.active || row.paused || ((action === 'supply' || action === 'borrow') && row.frozen) || (action === 'borrow' && !row.borrowing) || (!!account && available <= 0n);
        return <tr key={row.asset.address}><td>{identity(row)}</td><td><strong title={formatUnits(balance, row.asset.decimals)}>{account ? amount(row, balance) : <MissingValue />}</strong><small>{action === 'withdraw' ? `${formatNumber(row.supplyApy, { decimals: 2 })}%` : value(baseValue(row, balance))}</small></td><td>{action === 'withdraw' ? <span title="On-chain collateral status (read only)"><Toggle checked={!!row.collateral} disabled onChange={() => {}} label={`${row.asset.symbol} collateral status (read only)`} /></span> : `${formatNumber((action === 'supply' ? row.supplyApy : row.borrowApy), { decimals: 2 })}%`}</td><td><div className="row-actions"><button className={action === 'supply' ? 'primary' : 'secondary'} disabled={disabled} onClick={() => act(row, action)}>{action[0].toUpperCase() + action.slice(1)}</button>{!personal && <DetailLink to={reservePath(row.asset.symbol, isolated)} label={`View ${row.asset.symbol} details`} />}</div></td></tr>;
      })}</tbody></table></div> : <div className="empty">{account ? 'No positions in this pool yet.' : 'Connect your wallet to view your positions.'}</div>}
      {action === 'repay' && account && <div className="panel-bottom"><span>Borrow power used</span><strong>{formatNumber(powerUsed, { decimals: 2 })}%</strong><div className="progress"><i style={{ width: `${Math.min(100, powerUsed)}%` }} /></div></div>}
      {!personal && <div className="table-foot">{action === 'supply' ? 'Supply assets to earn interest in this pool. Collateral status is managed by the protocol.' : 'Borrow limits depend on this pool’s collateral, reserve caps and available liquidity.'}</div>}
    </section>;
  }
  return <>
    <section className="overview"><div className="market-eyebrow"><img className="chain-icon large" src={chainIcon} alt="" width={30} height={30} /><span>{robinhood.name.toUpperCase()}</span><span className="live-dot" /><span className="subtle">{categoryName}</span></div>
      <div className="overview-heading"><h1>Your assets. More possibilities.</h1><button className="text-button" onClick={onHelp}>How lending works <ArrowUpRight size={16} /></button></div>
      <div className="overview-stats"><div><span>{isolated ? 'Isolated market' : 'Core market'} net worth</span><strong>{personalLoading ? <Skeleton large /> : value(supplied - debt)}</strong></div><div><span>Net APY <InfoTip label="Net APY" /></span><strong>{personalLoading ? <Skeleton /> : account && netApy !== undefined ? <>{formatNumber(netApy, { decimals: 2 })}<em>%</em></> : <MissingValue />}<span className="stat-tag">Variable yield</span></strong></div><div><span>Available borrow power</span><strong>{personalLoading ? <Skeleton large /> : data ? value(data.available) : <MissingValue />}</strong></div></div>
      <div className="orbit-art" aria-hidden="true"><div /><div /><div /><span>✦</span></div>
    </section>
    <div className="content lending-dashboard">
    <div className="lending-category-toolbar"><MarketCategoryTabs isolated={isolated} base="/dashboard" /></div>
      <div className="section-heading"><div><h2>Your positions</h2><p>Earn on your assets. Unlock liquidity from your holdings.</p></div><span className="subtle inline"><ShieldCheck size={15} /> Your assets, your control</span></div>
      {(deployment.error || result.error) && <div className="lending-notice error" role="alert">{lendingError(deployment.error || result.error)} <button className="secondary" onClick={retry}>Retry</button></div>}
      {result.isPaused && <p className="subtle" role="status">Connection unavailable. Updates will resume when you are online.</p>}
      <>
        <div className="position-grid">{table('Your supplies', 'withdraw')}{table('Your borrows', 'repay')}</div><div className="position-grid asset-panels">{table('Assets to supply', 'supply')}{table('Assets to borrow', 'borrow')}</div>
      </>
    {transaction && market && data && account && <LendingTransaction key={`${account}:${market.pool}:${transaction.row.asset.address}:${transaction.action}`} market={market} row={data.assets.find(row => row.asset.address === transaction.row.asset.address) ?? transaction.row} pool={data} account={account} action={transaction.action} beforeSubmit={beforeSubmit} onClose={() => setTransaction(undefined)} />}
  </div></>;
}
