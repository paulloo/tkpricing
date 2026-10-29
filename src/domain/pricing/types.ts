import type { PricingStrategy } from '../shop-config';

/** 定价引擎需要的 SKU 输入（与存储/展示无关） */
export interface SkuPricingInput {
  purchaseCost: number;
  domesticShipping: number;
  packagingFee: number;
  weightKg: number;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  /** null = 使用店铺退货率 */
  returnRate: number | null;
  /** 手动定价；null = 使用建议价 */
  finalPrice: number | null;
  /** 平台当前在售价，用于对比 */
  currentPrice: number | null;
  /** null = 使用店铺默认策略 */
  pricingStrategy: PricingStrategy | null;
  /** 自定义策略的目标净利率 */
  customMargin: number | null;
}
