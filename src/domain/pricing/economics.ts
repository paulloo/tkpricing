// ============================================
// 单件经济模型：给定售价，算出一单的期望利润
//
// 期望利润 = (1 − 退货率) × 送达订单利润 − 退货率 × 退货订单损失
//   送达订单利润 = 售价 − 到岸成本 − 尾程 − 平台费 − 达人佣金 − 广告费
//   退货订单损失 = 尾程 + 退货运费 + 不可再售货值 + 不退还的平台费 + 广告费
// （退货时达人佣金不结算；售价全额退给买家）
// ============================================

import type { FeeLine, ShopConfig } from '../shop-config';
import { feeAmounts, type FeeAmount } from './fees';
import { chargeableWeightKg, firstLegCost, lastMileCost, volumetricWeightKg } from './shipping';
import type { SkuPricingInput } from './types';

export interface CostBasis {
  /** 采购 + 国内运费 + 包装（成本币种） */
  goodsCost: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  /** 头程（成本币种） */
  firstLegCost: number;
  /** (货值 + 头程) 按含缓冲的汇率换算（销售币种） */
  landedCost: number;
  /** 尾程（销售币种，含运费税） */
  lastMileCost: number;
}

export interface UnitEconomics {
  price: number;
  returnRate: number;
  fees: FeeAmount[];
  platformFees: number;
  affiliateCost: number;
  adsCost: number;
  deliveredProfit: number;
  returnedLoss: number;
  expectedProfit: number;
  /** 期望利润 / 售价 */
  expectedMargin: number;
}

export function costBasis(sku: SkuPricingInput, config: ShopConfig): CostBasis {
  const goodsCost = sku.purchaseCost + sku.domesticShipping + sku.packagingFee;
  const volumetric = volumetricWeightKg(sku, config.firstLeg.volumetricDivisor);
  const chargeable = chargeableWeightKg(sku.weightKg, volumetric);
  const firstLeg = firstLegCost(chargeable, config.firstLeg);
  const effectiveRate = config.currency.rate * (1 + config.currency.buffer);
  return {
    goodsCost,
    volumetricWeightKg: volumetric,
    chargeableWeightKg: chargeable,
    firstLegCost: firstLeg,
    landedCost: (goodsCost + firstLeg) * effectiveRate,
    lastMileCost: lastMileCost(chargeable, config.lastMile),
  };
}

const sum = (values: number[]): number => values.reduce((acc, v) => acc + v, 0);

export function evaluateAt(
  price: number,
  basis: CostBasis,
  feeLines: readonly FeeLine[],
  config: ShopConfig,
  returnRate: number,
): UnitEconomics {
  const fees = feeAmounts(price, feeLines);
  const platformFees = sum(fees.map((f) => f.amount));
  const nonRefundableFees = sum(fees.filter((f) => !f.refundOnReturn).map((f) => f.amount));
  const affiliateCost = price * config.marketing.affiliateRate;
  const adsCost = price * config.marketing.adsRate;

  const deliveredProfit =
    price - basis.landedCost - basis.lastMileCost - platformFees - affiliateCost - adsCost;

  const unsellableGoods = basis.landedCost * (1 - config.returns.resaleRate);
  const returnedLoss =
    basis.lastMileCost + config.returns.returnShippingFee + unsellableGoods + nonRefundableFees + adsCost;

  const expectedProfit = (1 - returnRate) * deliveredProfit - returnRate * returnedLoss;

  return {
    price,
    returnRate,
    fees,
    platformFees,
    affiliateCost,
    adsCost,
    deliveredProfit,
    returnedLoss,
    expectedProfit,
    expectedMargin: price > 0 ? expectedProfit / price : 0,
  };
}
