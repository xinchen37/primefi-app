import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { robinhood } from '../network';
import { getLendingConfig, loadLendingConfig } from './config';
import { marketQuery } from './snapshots';
import { isIsolatedMarket } from './marketSelection';

export function useMarket() {
  const [params] = useSearchParams();
  const isolated = isIsolatedMarket(params);
  const deployment = useQuery({ queryKey: ['lending-config', robinhood.id], queryFn: () => loadLendingConfig(robinhood.id), initialData: () => { try { return getLendingConfig(robinhood.id); } catch { return undefined; } }, staleTime: Infinity, retry: false, networkMode: 'always' });
  const market = deployment.data?.markets.find(m => m.id === (isolated ? 'stock' : 'stable'));
  const result = useQuery({ queryKey: ['lending-market', robinhood.id, market?.pool, market], enabled: !!market, staleTime: 10_000, refetchInterval: 20_000, retry: 1,
    queryFn: () => marketQuery(market!).queryFn(),
  });
  const error = deployment.error || result.error;
  return { isolated, market, result, error, loading: !result.data && !error && !!market,
    retry: () => { void deployment.refetch(); if (market) void result.refetch(); } };
}
