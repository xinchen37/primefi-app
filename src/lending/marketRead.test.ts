import { expect, it } from 'vitest';
import { zeroAddress, type Address } from 'viem';
import { loadLendingConfig } from './config';
import { readMarket } from './marketRead';
import type { Call } from './service';

const aToken = '0x1111111111111111111111111111111111111111' as Address;
const debtToken = '0x2222222222222222222222222222222222222222' as Address;
async function fixture(price = 200_000_000n, cap = 500n) {
  const configured = (await loadLendingConfig(46630)).markets[0];
  const market = { ...configured, assets: [configured.assets[0]] };
  const read = async (call: Call) => {
    switch (call.functionName) {
      case 'BASE_CURRENCY_UNIT': return 100_000_000n;
      case 'BASE_CURRENCY': return zeroAddress;
      case 'decimals': return 6;
      case 'getReserveData': return {
        aTokenAddress: aToken, variableDebtTokenAddress: debtToken,
        configuration: { data: 8000n | (8500n << 16n) | (10500n << 32n) | (1n << 56n) | (1n << 58n) | (cap << 80n) },
        currentLiquidityRate: 10n ** 25n, currentVariableBorrowRate: 2n * 10n ** 25n,
      };
      case 'totalSupply': return call.address === aToken ? 100_000_000n : 30_000_000n;
      case 'balanceOf': return 65_000_000n;
      case 'getAssetPrice': return price;
      default: throw new Error('Unexpected call');
    }
  };
  return readMarket({ read }, market);
}
it('aggregates actual token supplies, debt and liquidity using oracle prices', async () => {
  const result = await fixture();
  expect(result.supplied).toBe(20_000_000_000n);
  expect(result.borrowed).toBe(6_000_000_000n);
  expect(result.liquidity).toBe(13_000_000_000n);
  expect(result.liquidity).not.toBe(result.supplied - result.borrowed);
  expect(result.reserves[0]).toMatchObject({ borrowCap: 500_000_000n, supplyCap: 0n, ltv: 80, threshold: 85, penalty: 5, active: true, borrowing: true, paused: false });
  expect(result.reserves[0].supplyApy).toBeCloseTo(Math.expm1(.01) * 100);
});
it('preserves zero caps as unlimited and rejects a missing price', async () => {
  expect((await fixture(100_000_000n, 0n)).reserves[0].borrowCap).toBe(0n);
  await expect(fixture(0n)).rejects.toThrow('Price unavailable');
});
