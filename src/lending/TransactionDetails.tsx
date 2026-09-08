import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatEther, formatUnits, type Address } from 'viem';
import { Health, Note } from '../components';
import { money, type Action } from '../model';
import { robinhood } from '../network';
import { lendingClient } from './client';
import { poolCall } from './service';
import { previewPosition } from './preview';
import { Skeleton } from './LendingSkeleton';
import type { LendingMarket } from './config';
import type { AssetSnapshot, PoolSnapshot } from './read';

export default function TransactionDetails({ action, amount, row, pool, market, account, busy }: {
  action: Action; amount?: bigint; row: AssetSnapshot; pool: PoolSnapshot; market: LendingMarket; account: Address; busy: boolean;
}) {
  const [debounced, setDebounced] = useState<bigint>();
  useEffect(() => { const timer = setTimeout(() => setDebounced(amount), 400); return () => clearTimeout(timer); }, [amount]);
  const fee = useQuery({ queryKey: ['lending-fee', robinhood.id, market.pool, row.asset.address, account, action, debounced?.toString()],
    enabled: !!debounced && debounced === amount && !busy, retry: false, staleTime: 15_000,
    queryFn: async () => {
      if (await lendingClient.getChainId() !== robinhood.id) throw new Error('RPC network mismatch');
      const [gas, gasPrice] = await Promise.all([
        lendingClient.estimateContractGas({ ...poolCall(action, market, row.asset, debounced!, account), account }),
        lendingClient.getGasPrice(),
      ]);
      return gas * gasPrice;
    },
  });
  const preview = amount === undefined ? undefined : previewPosition(action, amount, row, pool);
  const health = (value: bigint | null | undefined) => value === undefined ? '—' : value === null ? '∞' : <Health value={Number(formatUnits(value, 18))} />;
  const supply = action === 'supply' || action === 'withdraw';
  return <>
    <div className="transaction-details">
      {action === 'supply' && <div className="detail-row"><span>Use as collateral</span><strong>{row.collateral ? 'Enabled' : row.ltv === 0 ? 'Not eligible' : 'Set by protocol'}</strong></div>}
      <div className="detail-row"><span>{supply ? 'Supply APY' : 'Variable borrow APY'}</span><strong>{(supply ? row.supplyApy : row.borrowApy).toFixed(2)}%</strong></div>
      <div className="detail-row"><span>Health factor (estimated)</span><strong>{health(pool.debt === 0n ? null : pool.health)} <span aria-hidden="true"> → </span> {health(preview?.health)}</strong></div>
      <div className="detail-row"><span>Total debt after transaction (estimated)</span><strong>{preview ? money(Number(preview.debt) / Number(pool.unit)) : '—'}</strong></div>
      <div className="detail-row"><span>Network fee (estimated)</span><strong>{!amount ? '—' : debounced !== amount || fee.isLoading ? <Skeleton /> : fee.data !== undefined ? `≈ ${Number(formatEther(fee.data)).toLocaleString('en-US', { maximumSignificantDigits: 4 })} ETH` : 'Unavailable'}</strong></div>
    </div>
    <p className="subtle">Fee estimate is for this operation only, excluding token approvals and any additional L1 fee. Your wallet shows the final fee.{fee.isError ? ' Estimation may require token approval or a valid position.' : ''}</p>
    <Note>{action === 'repay' ? 'Repay debt to improve your health factor. Accrued interest may leave a small remaining balance.' : 'A health factor below 1 may trigger liquidation. Interest rates vary with market utilization.'} Projections use current prices and balances. {preview?.health === undefined ? 'The collateral outcome cannot be reliably estimated for this configuration. ' : ''}Final values are determined by the protocol.</Note>
  </>;
}
