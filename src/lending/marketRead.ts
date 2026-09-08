import { parseAbi, zeroAddress } from 'viem';
import { reserveData, tokenAbi, type LendingIO } from './service';
import type { LendingMarket, LendingAsset } from './config';

const oracleAbi = parseAbi(['function getAssetPrice(address asset) view returns (uint256)', 'function BASE_CURRENCY_UNIT() view returns (uint256)', 'function BASE_CURRENCY() view returns (address)']);
export interface MarketReserve {
  asset: LendingAsset; supplied: bigint; borrowed: bigint; liquidity: bigint; price: bigint;
  supplyApy: number; borrowApy: number; borrowCap: bigint; supplyCap: bigint;
  ltv: number; threshold: number; penalty: number; reserveFactor: number;
  active: boolean; paused: boolean; frozen: boolean; borrowing: boolean;
}
export interface MarketSnapshot { reserves: MarketReserve[]; unit: bigint; supplied: bigint; borrowed: bigint; liquidity: bigint }
export const reserveValue = (row: MarketReserve, amount: bigint) => amount * row.price / 10n ** BigInt(row.asset.decimals);
export async function readMarket(io: Pick<LendingIO, 'read'>, market: LendingMarket): Promise<MarketSnapshot> {
  const [unit, currency] = await Promise.all([
    io.read({ address: market.oracle, abi: oracleAbi, functionName: 'BASE_CURRENCY_UNIT' }) as Promise<bigint>,
    io.read({ address: market.oracle, abi: oracleAbi, functionName: 'BASE_CURRENCY' }),
  ]);
  if (unit <= 0n || currency !== zeroAddress) throw new Error('A USD-denominated oracle with a valid base unit is required.');
  const reserves = await Promise.all(market.assets.map(async asset => {
    const r = await reserveData(io, market, asset);
    const [supplied, borrowed, liquidity, price] = await Promise.all([
      io.read({ address: r.aTokenAddress, abi: tokenAbi, functionName: 'totalSupply' }) as Promise<bigint>,
      io.read({ address: r.variableDebtTokenAddress, abi: tokenAbi, functionName: 'totalSupply' }) as Promise<bigint>,
      io.read({ address: asset.address, abi: tokenAbi, functionName: 'balanceOf', args: [r.aTokenAddress] }) as Promise<bigint>,
      io.read({ address: market.oracle, abi: oracleAbi, functionName: 'getAssetPrice', args: [asset.address] }) as Promise<bigint>,
    ]);
    if (price <= 0n) throw new Error(`Price unavailable for ${asset.symbol}.`);
    const bits = r.configuration.data;
    const field = (offset: bigint, width = 16n) => (bits >> offset) & ((1n << width) - 1n);
    return { asset, supplied, borrowed, liquidity, price,
      supplyApy: Math.expm1(Number(r.currentLiquidityRate) / 1e27) * 100,
      borrowApy: Math.expm1(Number(r.currentVariableBorrowRate) / 1e27) * 100,
      borrowCap: field(80n, 36n) * 10n ** BigInt(asset.decimals), supplyCap: field(116n, 36n) * 10n ** BigInt(asset.decimals),
      ltv: Number(field(0n)) / 100, threshold: Number(field(16n)) / 100,
      penalty: Math.max(0, Number(field(32n)) - 10000) / 100, reserveFactor: Number(field(64n)) / 100,
      active: !!field(56n, 1n), frozen: !!field(57n, 1n), paused: !!field(60n, 1n), borrowing: !!field(58n, 1n),
    };
  }));
  return { reserves, unit, supplied: reserves.reduce((sum, r) => sum + reserveValue(r, r.supplied), 0n), borrowed: reserves.reduce((sum, r) => sum + reserveValue(r, r.borrowed), 0n), liquidity: reserves.reduce((sum, r) => sum + reserveValue(r, r.liquidity), 0n) };
}
