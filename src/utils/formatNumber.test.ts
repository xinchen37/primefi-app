import { expect, it } from 'vitest';
import { formatNumber, formatBaseValue, formatAssetAmount } from './formatNumber';
import Decimal from 'decimal.js';

it('uses two display decimals by default and supports per-asset overrides', () => {
  expect(formatAssetAmount('1234.56789')).toBe('1,234.56');
  expect(formatAssetAmount('1.23456789', { displayDecimals: 6 })).toBe('1.234567');
  expect(formatAssetAmount('12.9', { displayDecimals: 0 })).toBe('12');
  expect(formatAssetAmount('12')).toBe('12.00');
});

it('formats chain base values without losing bigint precision', () => {
  expect(formatBaseValue(9007199254740993129n, 1000n, { currencySymbol: '$' })).toBe('$9,007,199,254,740,993.12');
  expect(formatBaseValue(1n, 10n ** 18n, { decimals: 18, trimZeros: true })).toBe('0.000000000000000001');
  expect(formatBaseValue(1n, 0n)).toBe('—');
});

it('prefixes currency symbols after the negative sign and leaves fallbacks unchanged', () => {
  expect(formatNumber('1234.567', { currencySymbol: '$' })).toBe('$1,234.56');
  expect(formatNumber('1234567', { currencySymbol: '$', compact: true })).toBe('$1.23M');
  expect(formatNumber('-1234.567', { currencySymbol: '$' })).toBe('-$1,234.57');
  expect(formatNumber(0, { currencySymbol: '$' })).toBe('$0.00');
  expect(formatNumber(null, { currencySymbol: '$' })).toBe('—');
});

it('accepts Decimal instances and isolates arithmetic from global settings', () => {
  expect(formatNumber(new Decimal('1234.567'))).toBe('1,234.56');
  const precision = Decimal.precision, rounding = Decimal.rounding;
  try {
    Decimal.set({ precision: 2, rounding: Decimal.ROUND_UP });
    expect(formatNumber('123456789012345678901234.56789', { compact: true, decimals: 10 })).toBe('123,456,789.0123456789Q');
    expect(formatNumber('-1.239')).toBe('-1.24');
  } finally { Decimal.set({ precision, rounding }); }
});

it('groups amounts and floors with two fixed decimals by default', () => {
  expect(formatNumber('1234567.239')).toBe('1,234,567.23');
  expect(formatNumber(12)).toBe('12.00');
  expect(formatNumber('1.999')).toBe('1.99');
  expect(formatNumber('-1.239')).toBe('-1.24');
  expect(formatNumber('-0.001')).toBe('-0.01');
  expect(formatNumber(-0)).toBe('0.00');
});

it('supports precision, ungrouped output and optional trailing-zero removal', () => {
  expect(formatNumber('1234.56789', { decimals: 4, grouping: false })).toBe('1234.5678');
  expect(formatNumber('12.50', { trimZeros: true })).toBe('12.5');
  expect(formatNumber('12', { trimZeros: true })).toBe('12');
  expect(formatNumber('-1.01', { decimals: 0 })).toBe('-2');
});

it('formats K/M/B/T/Q without rounding across thresholds', () => {
  for (const [value, expected] of [['999.999', '999.99'], ['1000', '1.00K'], ['1234567', '1.23M'], ['1000000000', '1.00B'], ['1000000000000', '1.00T'], ['1000000000000000', '1.00Q'], ['999999', '999.99K'], ['-1234567', '-1.24M']]) {
    expect(formatNumber(value, { compact: true })).toBe(expected);
  }
});

it('preserves exact strings/bigints and handles scientific notation', () => {
  expect(formatNumber('9007199254740993.129')).toBe('9,007,199,254,740,993.12');
  expect(formatNumber(9007199254740993n)).toBe('9,007,199,254,740,993.00');
  expect(formatNumber('1.23456e3')).toBe('1,234.56');
  expect(formatNumber('.125e-2', { decimals: 5 })).toBe('0.00125');
  expect(formatNumber(1e-7, { decimals: 8 })).toBe('0.00000010');
});

it('handles invalid values explicitly and rejects invalid precision', () => {
  for (const value of [null, undefined, NaN, Infinity, '', 'abc', '1,000', '1e999999']) expect(formatNumber(value)).toBe('—');
  expect(formatNumber(null, { fallback: 'N/A' })).toBe('N/A');
  for (const decimals of [-1, 101, 1.5, NaN]) expect(() => formatNumber(1, { decimals })).toThrow(RangeError);
});
