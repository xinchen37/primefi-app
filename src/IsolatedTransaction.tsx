import { formatNumber } from './utils/formatNumber';
import { useRef, useState } from 'react';
import { Modal, Health, Note } from './components';
import { money, number, type Action } from './model';
import { isolatedMaximum, isolatedPreview, isolatedTotals, isolatedValidate, type IsolatedMarket, type IsolatedPosition } from './isolated';

export default function IsolatedTransaction({ market, position, usdgWallet, action, beforeSubmit, onComplete, onClose }: {
  market: IsolatedMarket; position: IsolatedPosition; usdgWallet: number; action: Action;
  beforeSubmit: () => Promise<void>; onComplete: (next: IsolatedPosition, usdgDelta: number) => void; onClose: () => void;
}) {
  const [input, setInput] = useState('');
  const [stage, setStage] = useState<'edit' | 'pending' | 'success'>('edit');
  const [failure, setFailure] = useState('');
  const pending = useRef(false);
  const amount = Number(input), token = action === 'borrow' || action === 'repay' ? 'USDG' : market.symbol;
  const title = { supply: 'Supply', withdraw: 'Withdraw', borrow: 'Borrow', repay: 'Repay' }[action];
  const max = isolatedMaximum(action, market, position, usdgWallet);
  const error = isolatedValidate(action, market, position, usdgWallet, amount);
  const next = error ? position : isolatedPreview(action, position, amount);
  async function submit() {
    if (error || pending.current) return;
    pending.current = true; setStage('pending'); setFailure('');
    try {
      await beforeSubmit();
      onComplete(next, action === 'borrow' ? amount : action === 'repay' ? -amount : 0);
      setStage('success');
    } catch (e) { setFailure(e instanceof Error ? e.message : 'Unable to continue. Please try again.'); setStage('edit'); }
    finally { pending.current = false; }
  }
  return <Modal title={`${title} ${token}`} description={`${market.symbol} / USDG · Isolated Market`} onClose={() => { if (!pending.current) onClose(); }}>
    {stage === 'success' ? <div className="empty"><h3>{title} complete</h3><p>{number(amount)} {token}</p><button className="primary" onClick={onClose}>Done</button></div> : <>
      <label className="isolated-amount">Amount<input type="number" min="0" step="any" inputMode="decimal" value={input} placeholder="0.00" disabled={stage === 'pending'} onChange={e => setInput(e.target.value)} /></label>
      <div className="detail-row"><span>Available: {number(max)} {token}</span><button className="text-button" disabled={stage === 'pending'} onClick={() => setInput(String(max))}>MAX</button></div>
      <div className="transaction-details"><div className="detail-row"><span>Health factor</span><strong><Health value={isolatedTotals(market, position).hf} /> → <Health value={isolatedTotals(market, next).hf} /></strong></div><div className="detail-row"><span>Debt after transaction</span><strong>{money(next.debt)} USDG</strong></div><div className="detail-row"><span>Borrow APY, variable</span><strong>{formatNumber(market.borrowApy, { decimals: 2 })}%</strong></div></div>
      <Note>Only {market.symbol} backs this position. Core market collateral and other isolated positions cannot support this debt. A health factor below 1 may trigger liquidation.</Note>
      {input && error && <p className="error" role="alert">{error}</p>}{failure && <p className="error" role="alert">{failure}</p>}
      <button className="primary full" disabled={!!error || stage === 'pending'} onClick={submit}>{stage === 'pending' ? 'Confirm in wallet…' : `Confirm ${action}`}</button>
    </>}
  </Modal>;
}
