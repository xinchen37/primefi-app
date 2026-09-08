import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import { Token } from '../components';
import { formatAssetAmount, formatBaseValue, formatNumber } from '../utils/formatNumber';
import { robinhood } from '../network';
import type { Action } from '../model';
import type { LendingAsset, LendingMarket } from './config';
import type { MarketReserve } from './marketRead';
import { lendingClient, lendingError } from './client';
import { availableAmount, readPool } from './read';
import LendingTransaction from './LendingTransaction';
import { Skeleton } from './LendingSkeleton';

export default function LendingReserve({ market, asset, reserve: r, unit, loading, stale, onConnect, beforeSubmit }: {
  market: LendingMarket; asset: LendingAsset; reserve?: MarketReserve; unit?: bigint; loading: boolean; stale: boolean; isolated: boolean; onConnect: () => void; beforeSubmit: () => Promise<void>;
}) {
  const { address, isConnected } = useAccount();
  const account = isConnected ? address : undefined;
  const [action, setAction] = useState<Action>();
  useEffect(() => setAction(undefined), [account, market.pool, asset.address]);
  const personal = useQuery({ queryKey: ['lending-pool', robinhood.id, market.pool, account, market], enabled: !!account, staleTime: 10_000, refetchInterval: 20_000, retry: 1,
    queryFn: async () => {
      if (await lendingClient.getChainId() !== robinhood.id) throw new Error('RPC network mismatch');
      return readPool({ read: call => lendingClient.readContract(call) }, market, account);
    },
  });
  const row = personal.data?.assets.find(a => a.asset.address === asset.address);
  const amount = (n: bigint) => `${formatAssetAmount(formatUnits(n, asset.decimals), asset)} ${asset.symbol}`;
  const usd = (n: bigint) => unit ? formatBaseValue(n, unit, { currencySymbol: '$', compact: true }) : '—';
  const metrics = r ? [
    ['Total supplied', amount(r.supplied)], ['Total borrowed', amount(r.borrowed)], ['Available liquidity', amount(r.liquidity)], ['Oracle price', usd(r.price)],
    ['Supply APY', `${formatNumber(r.supplyApy)}%`], ['Variable borrow APY', `${formatNumber(r.borrowApy)}%`],
    ['Max LTV', `${formatNumber(r.ltv)}%`], ['Liquidation threshold', `${formatNumber(r.threshold)}%`], ['Liquidation penalty', `${formatNumber(r.penalty)}%`], ['Reserve factor', `${formatNumber(r.reserveFactor)}%`],
    ['Supply cap', r.supplyCap === 0n ? 'No limit' : amount(r.supplyCap)], ['Borrow cap', r.borrowCap === 0n ? 'No limit' : amount(r.borrowCap)],
    ['Borrowing', r.borrowing ? 'Enabled' : 'Disabled'], ['Reserve status', !r.active ? 'Inactive' : r.paused ? 'Paused' : r.frozen ? 'Frozen' : 'Active'],
  ] : [];
  return <>
    <div className="section-heading"><div className="asset-name"><Token symbol={asset.iconSymbol ?? asset.symbol} /><div><h1>{asset.symbol}</h1><p>{asset.name} · {market.name}</p></div></div></div>
    <div className="position-grid"><section className="panel"><div className="panel-title"><h3>Reserve status &amp; configuration</h3></div><div style={{ padding: '0 24px 24px' }}>{loading ? <Skeleton large /> : metrics.map(([label, value]) => <div className="detail-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}{!loading && !r && <p>Reserve data unavailable.</p>}</div></section>
      <section className="panel" style={{ alignSelf: 'start' }}><div className="panel-title"><h3>Your position</h3></div><div style={{ padding: '0 24px 24px' }}>
        {personal.error && <p role="alert" className="error">{lendingError(personal.error)} <button onClick={() => void personal.refetch()}>Retry</button></p>}
        {(['wallet', 'supplied', 'debt'] as const).map((key, i) => <div className="detail-row" key={key}><span>{['Wallet balance', 'Supplied', 'Borrowed'][i]}</span><strong>{!account ? '—' : row ? amount(row[key]) : personal.isPending ? <Skeleton /> : '—'}</strong></div>)}
        {!account ? <button className="primary full" onClick={onConnect}>Connect wallet</button> : (['supply', 'borrow', 'repay', 'withdraw'] as const).map(operation => {
          const blocked = !row || !personal.data || stale || personal.isError || !row.active || row.paused || ((operation === 'supply' || operation === 'borrow') && row.frozen) || (operation === 'borrow' && !row.borrowing) || availableAmount(operation, row, personal.data) <= 0n;
          return <button key={operation} className={`${operation === 'supply' ? 'primary' : 'secondary'} full`} disabled={blocked} onClick={() => setAction(operation)}>{operation[0].toUpperCase() + operation.slice(1)}</button>;
        })}
        <div className="detail-row"><span>Token contract</span><a href={`${robinhood.blockExplorers.default.url}/address/${asset.address}`} target="_blank" rel="noreferrer">View contract ↗</a></div>
        <div className="detail-row"><span>Pool contract</span><a href={`${robinhood.blockExplorers.default.url}/address/${market.pool}`} target="_blank" rel="noreferrer">View contract ↗</a></div>
      </div></section></div>
    {action && row && personal.data && account && <LendingTransaction key={`${account}:${market.pool}:${asset.address}:${action}`} market={market} row={row} pool={personal.data} account={account} action={action} beforeSubmit={beforeSubmit} onClose={() => setAction(undefined)} />}
  </>;
}
