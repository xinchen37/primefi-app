export const historyPeriods = ['1w', '1m', '6m', '1y'] as const;
export type HistoryPeriod = typeof historyPeriods[number];
export interface HistoryPoint { timestamp: number; value: number }
/** Display-only fixture. Never use history points to calculate transaction limits. */
export function mockReserveHistory(key: string, rate: number, period: HistoryPeriod, now = Date.now()): HistoryPoint[] {
  const days = { '1w': 7, '1m': 30, '6m': 180, '1y': 365 }[period];
  const seed = [...key].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const end = Math.floor(now / 86400000) * 86400000;
  return Array.from({ length: 48 }, (_, i) => ({
    timestamp: end - days * (47 - i) / 47 * 86400000,
    value: i === 47 ? rate : Math.max(0, rate * (1 + .12 * Math.sin(i * 1.7 + seed) + .07 * Math.cos(i * .6))),
  }));
}
