// ============================================
// 物流计费：体积重、头程、尾程
// ============================================

import type { ShopConfig } from '../shop-config';

const EPSILON = 1e-9;

export interface Dimensions {
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
}

/** 体积重 = 长×宽×高 / 除数；尺寸不全或除数为 0 时为 0 */
export function volumetricWeightKg(dims: Dimensions, divisor: number): number {
  const { lengthCm, widthCm, heightCm } = dims;
  if (!divisor || !lengthCm || !widthCm || !heightCm) return 0;
  return (lengthCm * widthCm * heightCm) / divisor;
}

/** 计费重：实重与体积重取大 */
export function chargeableWeightKg(actualKg: number, volumetricKg: number): number {
  return Math.max(actualKg, volumetricKg);
}

/** 头程（成本币种）= max(计费重 × 单价, 最低收费) + 贴单操作费 */
export function firstLegCost(kg: number, firstLeg: ShopConfig['firstLeg']): number {
  return Math.max(kg * firstLeg.ratePerKg, firstLeg.minCharge) + firstLeg.handlingFee;
}

/** 尾程（销售币种）= (首重费 + 续重档数 × 续重费) × (1 + 运费税) */
export function lastMileCost(kg: number, lastMile: ShopConfig['lastMile']): number {
  const extraKg = Math.max(0, kg - lastMile.firstWeightKg);
  const steps = lastMile.stepKg > 0 ? Math.ceil(extraKg / lastMile.stepKg - EPSILON) : 0;
  const base = lastMile.firstWeightFee + steps * lastMile.stepFee;
  return base * (1 + lastMile.taxRate);
}
