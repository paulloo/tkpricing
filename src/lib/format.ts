// 展示用格式化（与计算无关）

const CURRENCY_SYMBOLS: Record<string, string> = {
  CNY: '¥',
  MYR: 'RM',
  THB: '฿',
  PHP: '₱',
  VND: '₫',
  SGD: 'S$',
  IDR: 'Rp',
  USD: '$',
};

/** 大面额币种不显示小数 */
const NO_DECIMALS = new Set(['VND', 'IDR']);

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? `${currency} `;
}

export function formatMoney(value: number | null | undefined, currency: string): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const decimals = NO_DECIMALS.has(currency) ? 0 : 2;
  const formatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${value < 0 ? '-' : ''}${currencySymbol(currency)}${formatted}`;
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(decimals)}%`;
}

export type MarginLevel = 'good' | 'ok' | 'low' | 'loss';

export function marginLevel(margin: number): MarginLevel {
  if (margin >= 0.2) return 'good';
  if (margin >= 0.1) return 'ok';
  if (margin >= 0) return 'low';
  return 'loss';
}

export const MARGIN_LABELS: Record<MarginLevel, string> = {
  good: '盈利良好',
  ok: '盈利一般',
  low: '盈利较低',
  loss: '亏损',
};

export const MARGIN_TEXT_CLASS: Record<MarginLevel, string> = {
  good: 'text-emerald-600',
  ok: 'text-amber-600',
  low: 'text-orange-600',
  loss: 'text-red-600',
};

export const MARGIN_BADGE_CLASS: Record<MarginLevel, string> = {
  good: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ok: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-orange-50 text-orange-700 border-orange-200',
  loss: 'bg-red-50 text-red-700 border-red-200',
};
