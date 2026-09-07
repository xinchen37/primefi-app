export type Symbol = "USDG" | "ETH" | "NVDA" | "SPY";
export type Action = "supply" | "withdraw" | "borrow" | "repay";
export interface Asset {
  symbol: Symbol;
  name: string;
  price: number;
  supplyApy: number;
  borrowApy: number;
  ltv: number;
  threshold: number;
  penalty: number;
  total: number;
  borrowed: number;
  supplyCap: number;
  borrowCap: number;
  reserveFactor: number;
}
export interface Position {
  wallet: number;
  supplied: number;
  debt: number;
  collateral: boolean;
}
export type Portfolio = Record<Symbol, Position>;
export const assets: Asset[] = [
  {
    symbol: "USDG",
    name: "Global Dollar",
    price: 1,
    supplyApy: 4.32,
    borrowApy: 6.75,
    ltv: 0.75,
    threshold: 0.8,
    penalty: 5,
    total: 4200000,
    borrowed: 3360000,
    supplyCap: Infinity,
    borrowCap: Infinity,
    reserveFactor: 10,
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    price: 2450,
    supplyApy: 2.18,
    borrowApy: 4.54,
    ltv: 0.73,
    threshold: 0.8,
    penalty: 7,
    total: 1800,
    borrowed: 1080,
    supplyCap: Infinity,
    borrowCap: Infinity,
    reserveFactor: 15,
  },
  {
    symbol: "NVDA",
    name: "NVIDIA · Tokenized stock",
    price: 125,
    supplyApy: 1.85,
    borrowApy: 5.25,
    ltv: 0.58,
    threshold: 0.7,
    penalty: 10,
    total: 12500,
    borrowed: 800,
    supplyCap: Infinity,
    borrowCap: 250000 / 125,
    reserveFactor: 20,
  },
  {
    symbol: 'SPY', name: 'SPY · Tokenized ETF', price: 650,
    supplyApy: 1.65, borrowApy: 4.8, ltv: .65, threshold: .75, penalty: 8,
    total: 2000, borrowed: 200, supplyCap: Infinity, borrowCap: 300000 / 650, reserveFactor: 20,
  },
];
export const initial: Portfolio = {
  USDG: { wallet: 8540, supplied: 5000, debt: 1800, collateral: true },
  ETH: { wallet: 2.45, supplied: 2, debt: 0, collateral: true },
  NVDA: { wallet: 20, supplied: 10, debt: 0, collateral: true },
  SPY: { wallet: 8, supplied: 0, debt: 0, collateral: true },
};
export const empty: Portfolio = {
  USDG: { wallet: 13540, supplied: 0, debt: 0, collateral: true },
  ETH: { wallet: 4.45, supplied: 0, debt: 0, collateral: true },
  NVDA: { wallet: 30, supplied: 0, debt: 0, collateral: true },
  SPY: { wallet: 8, supplied: 0, debt: 0, collateral: true },
};
export const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
export const number = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(n);
export const compact = (n: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(n);
export function totals(p: Portfolio) {
  let supplied = 0,
    debt = 0,
    limit = 0,
    weighted = 0,
    income = 0;
  assets.forEach((a) => {
    const x = p[a.symbol];
    supplied += x.supplied * a.price;
    debt += x.debt * a.price;
    income +=
      ((x.supplied * a.supplyApy - x.debt * a.borrowApy) * a.price) / 100;
    if (x.collateral) {
      limit += x.supplied * a.price * a.ltv;
      weighted += x.supplied * a.price * a.threshold;
    }
  });
  return {
    supplied,
    debt,
    limit,
    weighted,
    income,
    hf: debt ? weighted / debt : Infinity,
    netApy: supplied > debt ? (income / (supplied - debt)) * 100 : 0,
  };
}
export function reserve(a: Asset, p: Portfolio) {
  return {
    total: a.total + p[a.symbol].supplied - initial[a.symbol].supplied,
    borrowed: a.borrowed + p[a.symbol].debt - initial[a.symbol].debt,
  };
}
export function maximum(action: Action, a: Asset, p: Portfolio) {
  const x = p[a.symbol],
    t = totals(p),
    r = reserve(a, p),
    liquidity = Math.max(0, r.total - r.borrowed);
  if (action === "supply")
    return Math.max(0, Math.min(x.wallet, a.supplyCap - r.total));
  if (action === "repay") return Math.min(x.wallet, x.debt);
  if (action === "borrow")
    return Math.max(
      0,
      Math.min(
        (t.limit - t.debt) / a.price,
        liquidity,
        a.borrowCap - r.borrowed,
      ),
    );
  return Math.max(
    0,
    Math.min(
      x.supplied,
      liquidity,
      x.collateral && t.debt > 0
        ? (t.weighted - t.debt * 1.01) / (a.price * a.threshold)
        : Infinity,
    ),
  );
}
export function preview(
  p: Portfolio,
  a: Asset,
  action: Action,
  amount: number,
  collateral = true,
): Portfolio {
  const next = structuredClone(p),
    x = next[a.symbol];
  if (action === "supply") {
    x.wallet -= amount;
    x.supplied += amount;
    x.collateral = collateral;
  }
  if (action === "withdraw") {
    x.wallet += amount;
    x.supplied -= amount;
  }
  if (action === "borrow") {
    x.wallet += amount;
    x.debt += amount;
  }
  if (action === "repay") {
    x.wallet -= amount;
    x.debt -= amount;
  }
  return next;
}
export function validate(
  p: Portfolio,
  a: Asset,
  action: Action,
  amount: number,
  collateral = true,
) {
  if (!Number.isFinite(amount) || amount <= 0) return "Enter a valid amount.";
  if (amount > maximum(action, a, p) + 1e-9) return "Amount exceeds the available limit.";
  if (totals(preview(p, a, action, amount, collateral)).hf < 1.01)
    return "Health factor too low. Reduce the amount or add collateral.";
  return "";
}
export function liquidationPrice(a: Asset, p: Portfolio) {
  const t = totals(p),
    x = p[a.symbol];
  return x.collateral && x.supplied > 0 && t.debt > 0
    ? Math.max(
        0,
        (t.debt - (t.weighted - x.supplied * a.price * a.threshold)) /
          (x.supplied * a.threshold),
      )
    : null;
}
