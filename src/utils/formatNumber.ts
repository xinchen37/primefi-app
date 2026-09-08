import Decimal from 'decimal.js';

export type NumericInput = number | string | bigint | Decimal;
export const DEFAULT_ASSET_DISPLAY_DECIMALS = 2;
export interface AssetDisplayConfig { displayDecimals?: number }
export function formatAssetAmount(value: NumericInput, asset: AssetDisplayConfig = {}): string {
  return formatNumber(value, { decimals: asset.displayDecimals ?? DEFAULT_ASSET_DISPLAY_DECIMALS });
}

export interface FormatNumberOptions {
  /** Fraction digits, 0–100. Defaults to 2. Values are floored, never rounded. */
  decimals?: number;
  /** Insert commas in the integer part. Defaults to true. */
  grouping?: boolean;
  /** Scale by powers of 1,000: K, M, B, T, Q. Defaults to false. */
  compact?: boolean;
  /** Remove trailing fractional zeros. Defaults to false. */
  trimZeros?: boolean;
  /** Optional currency prefix, for example '$'. Negative sign comes first. */
  currencySymbol?: string;
  /** Display for invalid/missing input. Defaults to an em dash. */
  fallback?: string;
}

const UNITS = ['', 'K', 'M', 'B', 'T', 'Q'] as const;
// Isolate arithmetic from global Decimal.set calls. Precision covers the
// bounded 10,000-character inputs, including compact scaling without rounding.
const DisplayDecimal = Decimal.clone({ precision: 10_020, rounding: Decimal.ROUND_FLOOR, minE: -1_000_000, maxE: 1_000_000 });

/** Format a chain base-unit value without first converting it to Number. */
export function formatBaseValue(value: bigint, unit: bigint, options: FormatNumberOptions = {}): string {
  if (unit <= 0n) return options.fallback ?? '—';
  return formatNumber(new DisplayDecimal(value.toString()).dividedBy(unit.toString()), options);
}

// Parse decimal/scientific notation without converting precise strings to Number.
function parse(value: NumericInput | null | undefined) {
  if (value == null || (typeof value === 'number' && !Number.isFinite(value))) return;
  const raw = String(value).trim();
  // Bound expansion to prevent excessive allocations from untrusted input.
  if (raw.length > 10_000) return;
  const match = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/.exec(raw);
  if (!match) return;
  const exponent = Number(match[5] ?? 0);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 10_000) return;
  return new DisplayDecimal(raw);
}

/**
 * Display formatting only. Never use formatted output for transaction amounts.
 * Use strings/bigints for exact values; Number precision already lost at the
 * call site cannot be recovered. bigint inputs are whole units, not token wei.
 */
export function formatNumber(value: NumericInput | null | undefined, options: FormatNumberOptions = {}): string {
  const { decimals = 2, grouping = true, compact = false, trimZeros = false, currencySymbol = '', fallback = '—' } = options;
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 100) throw new RangeError('decimals must be an integer between 0 and 100.');
  const parsed = parse(value);
  if (!parsed) return fallback;
  const unit = compact && !parsed.isZero() ? Math.max(0, Math.min(UNITS.length - 1, Math.floor(parsed.e / 3))) : 0;
  const scaled = unit ? parsed.dividedBy(`1e${unit * 3}`) : parsed;
  const fixed = scaled.toFixed(decimals, Decimal.ROUND_FLOOR);
  let [integer, fraction = ''] = fixed.split('.');
  if (grouping) integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (trimZeros) fraction = fraction.replace(/0+$/, '');
  const negative = integer.startsWith('-');
  return `${negative ? '-' : ''}${currencySymbol}${negative ? integer.slice(1) : integer}${fraction ? `.${fraction}` : ''}${UNITS[unit]}`;
}
