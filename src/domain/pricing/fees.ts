// ============================================
// 平台扣费
// ============================================

import type { FeeLine } from '../shop-config';

export interface FeeAmount {
  id: string;
  label: string;
  amount: number;
  refundOnReturn: boolean;
}

export interface FeeOverrides {
  /** 商品级佣金率，覆盖 id 为 commission 的费用行 */
  commissionRate: number | null;
}

export const COMMISSION_FEE_ID = 'commission';

export function resolveFeeLines(lines: readonly FeeLine[], overrides: FeeOverrides): FeeLine[] {
  if (overrides.commissionRate == null) return [...lines];
  const commissionRate = overrides.commissionRate;
  return lines.map((line) =>
    line.id === COMMISSION_FEE_ID ? { ...line, value: commissionRate } : line,
  );
}

function appliesAt(line: FeeLine, price: number): boolean {
  return line.enabled && (line.maxPrice == null || price <= line.maxPrice);
}

function amountAt(line: FeeLine, price: number): number {
  if (line.kind === 'fixed') return line.value;
  const raw = price * line.value;
  return line.cap == null ? raw : Math.min(raw, line.cap);
}

/** 某售价下实际产生的各项费用（只含启用且适用的费用） */
export function feeAmounts(price: number, lines: readonly FeeLine[]): FeeAmount[] {
  return lines
    .filter((line) => appliesAt(line, price))
    .map((line) => ({
      id: line.id,
      label: line.label,
      amount: amountAt(line, price),
      refundOnReturn: line.refundOnReturn,
    }));
}

/** 费用函数的拐点：封顶生效点与 maxPrice 阈值。利润在拐点之间是售价的线性函数。 */
export function feeBreakpoints(lines: readonly FeeLine[]): number[] {
  const points = lines
    .filter((line) => line.enabled)
    .flatMap((line) => {
      const result: number[] = [];
      if (line.maxPrice != null) result.push(line.maxPrice);
      if (line.kind === 'percent' && line.cap != null && line.value > 0) {
        result.push(line.cap / line.value);
      }
      return result;
    })
    .filter((p) => Number.isFinite(p) && p > 0);
  return [...new Set(points)].sort((a, b) => a - b);
}
