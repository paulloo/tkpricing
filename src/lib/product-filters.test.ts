import { describe, expect, it } from 'vitest';
import type { ProductDTO, SkuDTO } from '@/domain/contracts';
import { calculateProduct } from '@/domain/pricing/portfolio';
import { PRESETS } from '@/domain/presets';
import { queryProducts } from './product-filters';

const config = PRESETS[0].config;
const sku = (over: Partial<SkuDTO>): SkuDTO => ({
  id: 's', productId: 'p', skuName: '', skuCode: null, tiktokSkuId: null, imageUrl: null, currentPrice: null, inventory: null,
  purchaseCost: 30, domesticShipping: 0, packagingFee: 0, weightKg: 0.5, lengthCm: null, widthCm: null, heightCm: null,
  returnRate: null, finalPrice: null, pricingStrategy: null, customMargin: null, ...over,
});
const product = (id: string, name: string, variants: SkuDTO[], category: string | null = null): ProductDTO => ({
  id, shopId: 's', name, url: null, description: null, imageUrl: null, category, commissionRate: null, isExpanded: true, displayOrder: 0, variants,
});

const items = [
  calculateProduct(product('a', '登山杖', [sku({ skuName: '黑色' })], 'Hiking'), config),
  calculateProduct(product('b', '帐篷', [sku({ finalPrice: 10 })]), config),
  calculateProduct(product('c', '瑜伽垫', [sku({ lengthCm: 70, widthCm: 15, heightCm: 15 })]), config),
];
const base = { search: '', filter: 'all' as const, sort: 'default' as const };

describe('queryProducts', () => {
  it('按商品名、类目、SKU 名搜索', () => {
    expect(queryProducts(items, { ...base, search: '帐篷' }).map((p) => p.product.id)).toEqual(['b']);
    expect(queryProducts(items, { ...base, search: 'hiking' }).map((p) => p.product.id)).toEqual(['a']);
    expect(queryProducts(items, { ...base, search: '黑色' }).map((p) => p.product.id)).toEqual(['a']);
  });

  it('筛选亏损、抛货、健康', () => {
    expect(queryProducts(items, { ...base, filter: 'loss' }).map((p) => p.product.id)).toEqual(['b']);
    expect(queryProducts(items, { ...base, filter: 'volumetric' }).map((p) => p.product.id)).toEqual(['c']);
    expect(queryProducts(items, { ...base, filter: 'healthy' }).map((p) => p.product.id)).toEqual(['a']);
  });

  it('按净利率排序且不修改入参', () => {
    const before = items.map((p) => p.product.id);
    const sorted = queryProducts(items, { ...base, sort: 'margin_asc' });
    expect(sorted[0].product.id).toBe('b');
    expect(items.map((p) => p.product.id)).toEqual(before);
  });
});
