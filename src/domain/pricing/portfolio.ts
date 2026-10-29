// ============================================
// 商品 / 店铺级汇总
// ============================================

import type { ProductDTO, SkuDTO } from '../contracts';
import type { ShopConfig } from '../shop-config';
import { calculateSku, type SkuCalculation } from './calculate';
import type { SkuPricingInput } from './types';

export interface CalculatedSku {
  sku: SkuDTO;
  calc: SkuCalculation;
}

export interface ProductSummary {
  skuCount: number;
  /** 按售价加权的期望净利率 */
  margin: number;
  minMargin: number;
  priceRange: [number, number];
  costRange: [number, number];
  hasLoss: boolean;
  warningCount: number;
}

export interface CalculatedProduct {
  product: ProductDTO;
  skus: CalculatedSku[];
  summary: ProductSummary;
}

export interface PortfolioStats {
  productCount: number;
  skuCount: number;
  margin: number;
  lossSkuCount: number;
  belowTargetSkuCount: number;
  volumetricSkuCount: number;
  currentPriceLossSkuCount: number;
}

export function toPricingInput(sku: SkuDTO): SkuPricingInput {
  return {
    purchaseCost: sku.purchaseCost,
    domesticShipping: sku.domesticShipping,
    packagingFee: sku.packagingFee,
    weightKg: sku.weightKg,
    lengthCm: sku.lengthCm,
    widthCm: sku.widthCm,
    heightCm: sku.heightCm,
    returnRate: sku.returnRate,
    finalPrice: sku.finalPrice,
    currentPrice: sku.currentPrice,
    pricingStrategy: sku.pricingStrategy,
    customMargin: sku.customMargin,
  };
}

function weightedMargin(calcs: SkuCalculation[]): number {
  const revenue = calcs.reduce((acc, c) => acc + c.finalPrice, 0);
  if (revenue <= 0) return 0;
  return calcs.reduce((acc, c) => acc + c.atFinal.expectedProfit, 0) / revenue;
}

const range = (values: number[]): [number, number] =>
  values.length ? [Math.min(...values), Math.max(...values)] : [0, 0];

export function calculateProduct(product: ProductDTO, config: ShopConfig): CalculatedProduct {
  const overrides = { commissionRate: product.commissionRate };
  const skus = product.variants.map((sku) => ({ sku, calc: calculateSku(toPricingInput(sku), overrides, config) }));
  const calcs = skus.map((s) => s.calc);
  return {
    product,
    skus,
    summary: {
      skuCount: skus.length,
      margin: weightedMargin(calcs),
      minMargin: calcs.length ? Math.min(...calcs.map((c) => c.atFinal.expectedMargin)) : 0,
      priceRange: range(calcs.map((c) => c.finalPrice)),
      costRange: range(calcs.map((c) => c.unitCost)),
      hasLoss: calcs.some((c) => c.warnings.includes('loss')),
      warningCount: calcs.reduce((acc, c) => acc + c.warnings.length, 0),
    },
  };
}

export function portfolioStats(products: readonly CalculatedProduct[]): PortfolioStats {
  const calcs = products.flatMap((p) => p.skus.map((s) => s.calc));
  const countWith = (w: SkuCalculation['warnings'][number]) => calcs.filter((c) => c.warnings.includes(w)).length;
  return {
    productCount: products.length,
    skuCount: calcs.length,
    margin: weightedMargin(calcs),
    lossSkuCount: countWith('loss'),
    belowTargetSkuCount: countWith('below-target'),
    volumetricSkuCount: countWith('volumetric'),
    currentPriceLossSkuCount: countWith('current-price-loss'),
  };
}
