import type { Action } from '../model';
import type { AssetSnapshot, PoolSnapshot } from './read';

const WAD = 10n ** 18n;
// Indicative at current prices/rates; not a substitute for transaction simulation.
// null health means no debt; undefined means the collateral outcome is unknown.
export function previewPosition(action: Action, amount: bigint, row: AssetSnapshot, pool: PoolSnapshot) {
  const delta = amount * row.price / 10n ** BigInt(row.asset.decimals);
  const paid = amount < row.debt ? amount : row.debt;
  const repayment = paid * row.price / 10n ** BigInt(row.asset.decimals);
  const debt = action === 'borrow' ? pool.debt + delta : action === 'repay' ? (pool.debt > repayment ? pool.debt - repayment : 0n) : pool.debt;
  const current = pool.debt === 0n ? null : pool.health;
  if (amount === 0n) return { debt, health: current, current };
  if (debt === 0n) return { debt, health: null, current };
  let weighted = pool.debt > 0n ? pool.health * pool.debt / WAD : pool.liquidationThreshold === undefined ? undefined : pool.collateral * pool.liquidationThreshold / 10000n;
  if (action === 'supply' || action === 'withdraw') {
    // A first supply may be auto-enabled by the protocol. Do not assume it is.
    if (action === 'supply' && !row.collateral && row.ltv > 0) weighted = undefined;
    else if (row.collateral) {
      if (pool.eMode !== 0 || row.liquidationThreshold === undefined || weighted === undefined) weighted = undefined;
      else {
        const change = delta * BigInt(row.liquidationThreshold) / 10000n;
        weighted = action === 'supply' ? weighted + change : weighted > change ? weighted - change : 0n;
      }
    }
  }
  return { debt, current, health: weighted === undefined ? undefined : weighted * WAD / debt };
}
