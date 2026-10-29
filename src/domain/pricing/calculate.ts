// ============================================
// SKU 定价计算入口
// ============================================

import type { BaseStrategy, PricingStrategy, ShopConfig } from '../shop-config';
import { costBasis, evaluateAt, type CostBasis, type UnitEconomics } from './economics';
import { feeBreakpoints, resolveFeeLines, type FeeOverrides } from './fees';
import { roundPrice, solvePriceForMargin } from './solver';
import type { SkuPricingInput } from './types';

export type { SkuPricingInput } from './types';

/** 汇率压力测试：成本币种升值幅度 */
export const FX_STRESS = 0.05;

export type PricingWarning =
  | 'missing-weight'
  | 'volumetric'
  | 'target-unreachable'
  | 'loss'
  | 'below-target'
  | 'current-price-loss';

export interface SkuCalculation {
  cost: CostBasis;
  /** 到岸成本 + 尾程（销售币种） */
  unitCost: number;
  strategy: PricingStrategy;
  targetMargin: number;
  breakEvenPrice: number | null;
  suggestedPrice: number | null;
  ladder: Record<BaseStrategy, number | null>;
  finalPrice: number;
  isManualPrice: boolean;
  atFinal: UnitEconomics;
  atCurrent: UnitEconomics | null;
  /** 在最终价基础上最多还能打几折而不亏（0.25 = 最多让利 25%） */
  maxDiscount: number;
  /** 成本币种升值 FX_STRESS 时，最终价下的期望净利率 */
  fxStressMargin: number;
  warnings: PricingWarning[];
}

const BASE_STRATEGIES: readonly BaseStrategy[] = ['drainage', 'profit', 'anchor'];
const MARGIN_TOLERANCE = 1e-6;
/** 取整后验算不达标时最多上调的档数 */
const MAX_ROUNDING_BUMPS = 1000;

function resolveTarget(sku: SkuPricingInput, config: ShopConfig): { strategy: PricingStrategy; margin: number } {
  const strategy = sku.pricingStrategy ?? config.pricing.defaultStrategy;
  if (strategy === 'custom') {
    return { strategy, margin: sku.customMargin ?? config.pricing.targetMargins.profit };
  }
  return { strategy, margin: config.pricing.targetMargins[strategy] };
}

export function calculateSku(
  sku: SkuPricingInput,
  overrides: FeeOverrides,
  config: ShopConfig,
): SkuCalculation {
  const feeLines = resolveFeeLines(config.fees, overrides);
  const breakpoints = feeBreakpoints(feeLines);
  const returnRate = sku.returnRate ?? config.returns.rate;
  const cost = costBasis(sku, config);

  const evaluate = (price: number, basis: CostBasis = cost) =>
    evaluateAt(price, basis, feeLines, config, returnRate);
  // 取整后再验算：取整可能把价格落回 "≤ 阈值才收" 的阈值上，或在利润随价格下降的区间里变差，
  // 不达标就逐档上调
  const priceFor = (margin: number): number | null => {
    const raw = solvePriceForMargin(margin, (p) => evaluate(p).expectedProfit, breakpoints);
    if (raw == null) return null;
    const { step } = config.pricing.rounding;
    let price = roundPrice(raw, config.pricing.rounding);
    for (let i = 0; i < MAX_ROUNDING_BUMPS; i++) {
      if (evaluate(price).expectedMargin >= margin - MARGIN_TOLERANCE) return price;
      price = Math.round((price + step) * 1e6) / 1e6;
    }
    return null;
  };

  const { strategy, margin: targetMargin } = resolveTarget(sku, config);
  const rawBreakEven = solvePriceForMargin(0, (p) => evaluate(p).expectedProfit, breakpoints);
  const breakEvenPrice = rawBreakEven == null ? null : roundPrice(rawBreakEven, { step: 0.01, ending: 0 });
  const suggestedPrice = priceFor(targetMargin);
  const ladder = Object.fromEntries(
    BASE_STRATEGIES.map((s) => [s, priceFor(config.pricing.targetMargins[s])]),
  ) as Record<BaseStrategy, number | null>;

  const isManualPrice = sku.finalPrice != null;
  const finalPrice = sku.finalPrice ?? suggestedPrice ?? 0;
  const atFinal = evaluate(finalPrice);
  const atCurrent = sku.currentPrice != null ? evaluate(sku.currentPrice) : null;

  const stressedConfig: ShopConfig = {
    ...config,
    currency: { ...config.currency, rate: config.currency.rate * (1 + FX_STRESS) },
  };
  const fxStressMargin = evaluate(finalPrice, costBasis(sku, stressedConfig)).expectedMargin;

  const maxDiscount =
    breakEvenPrice != null && finalPrice > 0 ? Math.max(0, 1 - breakEvenPrice / finalPrice) : 0;

  const warnings: PricingWarning[] = [];
  if (sku.weightKg <= 0 && cost.volumetricWeightKg <= 0) warnings.push('missing-weight');
  if (cost.volumetricWeightKg > sku.weightKg) warnings.push('volumetric');
  if (suggestedPrice == null) warnings.push('target-unreachable');
  if (finalPrice > 0 && atFinal.expectedProfit < 0) warnings.push('loss');
  else if (finalPrice > 0 && atFinal.expectedMargin < targetMargin - MARGIN_TOLERANCE) warnings.push('below-target');
  if (atCurrent && atCurrent.expectedProfit < 0) warnings.push('current-price-loss');

  return {
    cost,
    unitCost: cost.landedCost + cost.lastMileCost,
    strategy,
    targetMargin,
    breakEvenPrice,
    suggestedPrice,
    ladder,
    finalPrice,
    isManualPrice,
    atFinal,
    atCurrent,
    maxDiscount,
    fxStressMargin,
    warnings,
  };
}
