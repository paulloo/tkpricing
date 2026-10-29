import { describe, expect, it } from 'vitest';
import type { ProductDTO, SkuDTO } from '../contracts';
import { PRESETS } from '../presets';
import { calculateProduct, portfolioStats } from './portfolio';

const config = PRESETS[0].config;

const sku = (over: Partial<SkuDTO>): SkuDTO => ({
  id: 's',
  productId: 'p',
  skuName: '',
  skuCode: null,
  tiktokSkuId: null,
  imageUrl: null,
  currentPrice: null,
  inventory: null,
  purchaseCost: 30,
  domesticShipping: 3,
  packagingFee: 1,
  weightKg: 0.5,
  lengthCm: null,
  widthCm: null,
  heightCm: null,
  returnRate: null,
  finalPrice: null,
  pricingStrategy: null,
  customMargin: null,
  ...over,
});

const product = (variants: SkuDTO[], over: Partial<ProductDTO> = {}): ProductDTO => ({
  id: 'p',
  shopId: 'shop',
  name: '登山杖',
  url: null,
  description: null,
  imageUrl: null,
  category: null,
  commissionRate: null,
  isExpanded: true,
  displayOrder: 0,
  variants,
  ...over,
});

describe('calculateProduct', () => {
  it('汇总 SKU 的价格区间、加权利润率和亏损标记', () => {
    const p = calculateProduct(product([sku({ id: 'a' }), sku({ id: 'b', finalPrice: 20 })]), config);
    expect(p.summary.skuCount).toBe(2);
    expect(p.summary.hasLoss).toBe(true);
    expect(p.summary.priceRange[0]).toBe(20);
    expect(p.summary.minMargin).toBeLessThan(0);
    expect(p.summary.margin).toBeLessThan(config.pricing.targetMargins.profit);
  });

  it('商品级佣金影响所有 SKU', () => {
    const base = calculateProduct(product([sku({})]), config);
    const high = calculateProduct(product([sku({})], { commissionRate: 0.2 }), config);
    expect(high.skus[0].calc.suggestedPrice!).toBeGreaterThan(base.skus[0].calc.suggestedPrice!);
  });

  it('没有 SKU 时汇总为 0', () => {
    const p = calculateProduct(product([]), config);
    expect(p.summary).toMatchObject({ skuCount: 0, margin: 0, priceRange: [0, 0] });
  });
});

describe('portfolioStats', () => {
  it('统计各类预警的 SKU 数', () => {
    const products = [
      calculateProduct(product([sku({ finalPrice: 20 }), sku({ lengthCm: 60, widthCm: 40, heightCm: 30 })]), config),
      calculateProduct(product([sku({ currentPrice: 10 })]), config),
    ];
    const stats = portfolioStats(products);
    expect(stats).toMatchObject({ productCount: 2, skuCount: 3, lossSkuCount: 1, volumetricSkuCount: 1, currentPriceLossSkuCount: 1 });
  });
});
