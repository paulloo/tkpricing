// ============================================
// 反推售价：找到满足 "期望利润 ≥ 目标净利率 × 售价" 的最低售价
//
// 期望利润在费用拐点（封顶、LVG 阈值）之间是售价的线性函数，
// 所以逐段求线性方程的根即可得到精确解，不需要数值迭代。
// ============================================

import type { ShopConfig } from '../shop-config';

const SLOPE_EPSILON = 1e-12;
/** 跨过 "≤ 阈值才收费" 的阈值所需的最小加价 */
const JUST_ABOVE = 1e-6;

type ProfitFn = (price: number) => number;

interface Segment {
  lo: number;
  hi: number;
}

function segmentsFrom(breakpoints: readonly number[]): Segment[] {
  const bounds = [0, ...breakpoints.filter((p) => p > 0), Infinity];
  return bounds.slice(0, -1).map((lo, i) => ({ lo, hi: bounds[i + 1] }));
}

/** 段内取两个点拟合直线 f(p) = α + β·p */
function fitLine(f: ProfitFn, { lo, hi }: Segment): { alpha: number; beta: number } {
  const span = Number.isFinite(hi) ? hi - lo : Math.max(100, lo);
  const x1 = lo + span * 0.25;
  const x2 = lo + span * 0.75;
  const beta = (f(x2) - f(x1)) / (x2 - x1);
  return { alpha: f(x1) - beta * x1, beta };
}

/**
 * @param targetMargin 目标期望净利率（0 = 保本价）
 * @param profitAt 售价 → 期望利润
 * @param breakpoints 费用拐点（升序）
 * @returns 最低满足条件的售价；无论定多高都达不到时返回 null
 */
export function solvePriceForMargin(
  targetMargin: number,
  profitAt: ProfitFn,
  breakpoints: readonly number[],
): number | null {
  const f: ProfitFn = (p) => profitAt(p) - targetMargin * p;

  for (const segment of segmentsFrom(breakpoints)) {
    const { alpha, beta } = fitLine(f, segment);
    const start = segment.lo === 0 ? 0 : segment.lo + JUST_ABOVE;

    if (beta > SLOPE_EPSILON) {
      const root = -alpha / beta;
      if (root <= start) return start;
      if (root <= segment.hi) return root;
    } else if (alpha + beta * start >= 0) {
      return start;
    }
  }
  return null;
}

/** 价格向上取整到 step 的整数倍再加尾数，如 step=1, ending=0.9 → x.90 */
export function roundPrice(price: number, rounding: ShopConfig['pricing']['rounding']): number {
  const { step, ending } = rounding;
  // 容忍求解器的浮点误差，避免 108.0000000001 被取成 108.01
  const n = Math.ceil((price - ending) / step - 1e-6);
  return Math.round((n * step + ending) * 1e6) / 1e6;
}
