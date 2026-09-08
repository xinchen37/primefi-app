import type { Action } from '../model';
import { availableAmount, type AssetSnapshot, type PoolSnapshot } from './read';
import type { MarketReserve } from './marketRead';

/** Indicative UI limits; contract simulation remains the final validation. */
export function reserveAvailable(action: Action, row: AssetSnapshot, pool: PoolSnapshot, reserve: MarketReserve): bigint {
  if (!reserve.active || reserve.paused || ((action === 'supply' || action === 'borrow') && reserve.frozen) || (action === 'borrow' && !reserve.borrowing)) return 0n;
  let limit = availableAmount(action, row, pool);
  const cap = action === 'supply' ? reserve.supplyCap : action === 'borrow' ? reserve.borrowCap : 0n;
  if (cap > 0n) {
    const used = action === 'supply' ? reserve.supplied : reserve.borrowed;
    const remaining = cap > used ? cap - used : 0n;
    if (remaining < limit) limit = remaining;
  }
  return limit;
}
