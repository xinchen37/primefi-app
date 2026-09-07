import type { Action } from './model';

export type IsolatedSymbol = 'PONS' | 'CASHCAT' | 'AI';
export interface IsolatedMarket {
  symbol: IsolatedSymbol; name: string; price: number; ltv: number; threshold: number;
  penalty: number; reserveFactor: number; debtCeiling: number; totalCollateral: number;
  totalDebt: number; liquidity: number; borrowApy: number;
}
// Frontend fixtures. Market liquidity must be sourced from the final contract topology.
export const isolatedMarkets: IsolatedMarket[] = [
  { symbol: 'PONS', name: 'PONS', price: .8, ltv: .4, threshold: .55, penalty: 12, reserveFactor: 25, debtCeiling: 150000, totalCollateral: 600000, totalDebt: 85000, liquidity: 65000, borrowApy: 9.8 },
  { symbol: 'CASHCAT', name: 'Cashcat', price: .12, ltv: .4, threshold: .55, penalty: 12, reserveFactor: 25, debtCeiling: 150000, totalCollateral: 3500000, totalDebt: 62000, liquidity: 88000, borrowApy: 10.5 },
  { symbol: 'AI', name: 'AI', price: .35, ltv: .35, threshold: .5, penalty: 15, reserveFactor: 25, debtCeiling: 100000, totalCollateral: 800000, totalDebt: 41000, liquidity: 59000, borrowApy: 12.2 },
];
export interface IsolatedPosition { wallet: number; supplied: number; debt: number }
export type IsolatedPortfolio = Record<IsolatedSymbol, IsolatedPosition>;
export const initialIsolated: IsolatedPortfolio = {
  PONS: { wallet: 10000, supplied: 0, debt: 0 },
  CASHCAT: { wallet: 40000, supplied: 0, debt: 0 },
  AI: { wallet: 15000, supplied: 0, debt: 0 },
};
export const isolatedStorageKey = 'orbit-isolated-v2';
export const sampleIsolated: IsolatedPortfolio = {
  PONS: { wallet: 6000, supplied: 4000, debt: 900 },
  CASHCAT: { wallet: 28000, supplied: 12000, debt: 400 },
  AI: { wallet: 10000, supplied: 5000, debt: 400 },
};
export function isolatedTotals(m: IsolatedMarket, p: IsolatedPosition) {
  const collateral = p.supplied * m.price;
  return { collateral, debt: p.debt, limit: collateral * m.ltv, hf: p.debt ? collateral * m.threshold / p.debt : Infinity,
    totalDebt: m.totalDebt + p.debt, totalCollateral: m.totalCollateral + p.supplied,
    liquidity: Math.max(0, m.liquidity - p.debt), remaining: Math.max(0, m.debtCeiling - m.totalDebt - p.debt) };
}
export function isolatedMaximum(action: Action, m: IsolatedMarket, p: IsolatedPosition, usdgWallet: number) {
  const t = isolatedTotals(m, p);
  if (action === 'supply') return p.wallet;
  if (action === 'repay') return Math.max(0, Math.min(p.debt, usdgWallet));
  if (action === 'borrow') return Math.max(0, Math.min(t.limit - p.debt, t.remaining, t.liquidity));
  return Math.max(0, Math.min(p.supplied, p.supplied - p.debt * 1.01 / (m.price * m.threshold)));
}
export function isolatedPreview(action: Action, p: IsolatedPosition, amount: number) {
  const next = { ...p };
  if (action === 'supply') { next.wallet -= amount; next.supplied += amount; }
  if (action === 'withdraw') { next.wallet += amount; next.supplied -= amount; }
  if (action === 'borrow') next.debt += amount;
  if (action === 'repay') next.debt -= amount;
  return next;
}
export function isolatedValidate(action: Action, m: IsolatedMarket, p: IsolatedPosition, usdgWallet: number, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return 'Enter a valid amount.';
  if (amount > isolatedMaximum(action, m, p, usdgWallet) + 1e-9) return 'Amount exceeds the available limit.';
  if ((action === 'borrow' || action === 'withdraw') && isolatedTotals(m, isolatedPreview(action, p, amount)).hf < 1.01) return 'Health factor too low. Reduce the amount or add collateral.';
  return '';
}
export function loadIsolated(): IsolatedPortfolio {
  const parse = (value: string | null): IsolatedPortfolio | null => {
    try {
      const raw = JSON.parse(value || 'null');
      return raw && isolatedMarkets.every(m => raw[m.symbol] && ['wallet', 'supplied', 'debt'].every(k => typeof raw[m.symbol][k] === 'number' && Number.isFinite(raw[m.symbol][k]) && raw[m.symbol][k] >= 0)) ? raw : null;
    } catch { return null; }
  };
  try {
    const current = parse(localStorage.getItem(isolatedStorageKey));
    if (current) return current;
    const legacy = parse(localStorage.getItem('orbit-isolated-v1'));
    const untouched = legacy && isolatedMarkets.every(m => {
      const p = legacy[m.symbol], initial = initialIsolated[m.symbol];
      return p.wallet === initial.wallet && p.supplied === 0 && p.debt === 0;
    });
    const next = legacy && !untouched ? legacy : structuredClone(sampleIsolated);
    try { localStorage.setItem(isolatedStorageKey, JSON.stringify(next)); } catch { /* Preserve loaded positions even when writes are unavailable. */ }
    return next;
  } catch { /* Storage may be unavailable. */ }
  return structuredClone(sampleIsolated);
}
