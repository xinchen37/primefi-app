export function isIsolatedMarket(search: string | URLSearchParams): boolean {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  return params.get('category') === 'isolated' || params.get('pool') === 'stock';
}
export function marketPath(path: string, isolated: boolean): string {
  return isolated ? `${path}?category=isolated` : path;
}
export function reservePath(symbol: string, isolated: boolean): string {
  return marketPath(`/markets/${symbol.toLowerCase()}`, isolated);
}
