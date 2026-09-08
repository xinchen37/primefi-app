import { useRef, useState } from 'react';
import { useConfig } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { formatUnits, type Address, type Hash } from 'viem';
import { Modal, Token } from '../components';
import { labels } from '../Transaction';
import type { Action } from '../model';
import { robinhood } from '../network';
import { createLendingIO, lendingError } from './client';
import { executeLending, parseAmount, ReceiptPendingError } from './service';
import { availableAmount, type AssetSnapshot, type PoolSnapshot } from './read';
import type { LendingMarket } from './config';
import TransactionDetails from './TransactionDetails';
import { formatAssetAmount } from '../utils/formatNumber';

export default function LendingTransaction({ market, row, pool, account, action, beforeSubmit, onClose }: {
  market: LendingMarket; row: AssetSnapshot; pool: PoolSnapshot; account: Address; action: Action;
  beforeSubmit: () => Promise<void>; onClose: () => void;
}) {
  const config = useConfig(), cache = useQueryClient();
  const [input, setInput] = useState(''), [error, setError] = useState(''), [status, setStatus] = useState('');
  const [hash, setHash] = useState<Hash>(), [done, setDone] = useState(false), [uncertain, setUncertain] = useState(false), [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const max = availableAmount(action, row, pool);
  let validation = '';
  let parsed: bigint | undefined;
  try { if (parseAmount(input, row.asset.decimals) > max) validation = 'Amount exceeds the available balance or borrowing power.'; } catch (e) { validation = lendingError(e); }
  if (!input || /^0(?:\.0*)?$/.test(input)) parsed = 0n;
  else if (!validation) parsed = parseAmount(input, row.asset.decimals);
  async function submit() {
    if (lock.current || validation || done || uncertain) return;
    lock.current = true; setBusy(true); setError(''); setStatus('Checking wallet network…');
    try {
      await beforeSubmit();
      const tx = await executeLending(createLendingIO(config), { chainId: robinhood.id, account, market, asset: row.asset, action, amount: input,
        onProgress: p => { setStatus(p.message); if (p.hash) setHash(p.hash); },
      });
      setHash(tx); setDone(true); setStatus('Transaction confirmed. Your balances are refreshing.');
      void cache.invalidateQueries({ queryKey: ['lending-pool'] });
    } catch (e) {
      if (e instanceof ReceiptPendingError) { setHash(e.hash); setUncertain(true); }
      setError(lendingError(e));
    } finally { lock.current = false; setBusy(false); }
  }
  return <Modal title={`${labels[action]} ${row.asset.symbol}`} description={`${market.name} · ${robinhood.name}`} onClose={() => !busy && onClose()}>
    {done ? <div className="success"><h2>{labels[action]} confirmed</h2><p>{input} {row.asset.symbol}</p></div> : <>
      <div className="amount-heading"><span>Amount</span><span title={formatUnits(max, row.asset.decimals)}>Up to {formatAssetAmount(formatUnits(max, row.asset.decimals), row.asset)} {row.asset.symbol}</span></div>
      <div className="amount-box"><input aria-label="Transaction amount" inputMode="decimal" placeholder="0.00" value={input} disabled={busy || uncertain} onChange={e => setInput(e.target.value)} /><Token symbol={row.asset.iconSymbol ?? row.asset.symbol} /><strong>{row.asset.symbol}</strong><button disabled={busy || uncertain} onClick={() => setInput(formatUnits(max, row.asset.decimals))}>MAX</button></div>
      <TransactionDetails action={action} amount={parsed} row={row} pool={pool} market={market} account={account} busy={busy || uncertain} />
      <div className="detail-row"><span>Pool</span><a className="text-button" href={`${robinhood.blockExplorers.default.url}/address/${market.pool}`} target="_blank" rel="noreferrer">{market.pool.slice(0, 8)}…{market.pool.slice(-6)}</a></div>
      {input && validation && <p className="error" role="alert">{validation}</p>}
    </>}
    {status && <p role="status">{status}</p>}
    {error && <p role="alert" className="error">{error}</p>}
    {hash && <p><a className="text-button" href={`${robinhood.blockExplorers.default.url}/tx/${hash}`} target="_blank" rel="noreferrer">View transaction ↗</a></p>}
    {done || uncertain ? <button className="secondary full" onClick={onClose}>Close</button> : <button className="primary full" disabled={busy || !!validation} onClick={submit}>{busy ? 'Waiting for confirmation…' : `Confirm ${action}`}</button>}
  </Modal>;
}
