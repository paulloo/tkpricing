import { describe, expect, it } from 'vitest';
import { calculateProduct } from '@/domain/pricing/portfolio';
import { PRESETS } from '@/domain/presets';
import { productsToCsv } from './csv-export';

describe('productsToCsv', () => {
  const product = calculateProduct(
    {
      id: 'p', shopId: 's', name: '=HYPERLINK("x")', url: null, description: null, imageUrl: null,
      category: '露营, 帐篷', commissionRate: null, isExpanded: true, displayOrder: 0,
      variants: [{
        id: 'v', productId: 'p', skuName: '双人"轻量"', skuCode: null, tiktokSkuId: null, imageUrl: null,
        currentPrice: null, inventory: null, purchaseCost: 120, domesticShipping: 5, packagingFee: 2, weightKg: 2.1,
        lengthCm: 50, widthCm: 20, heightCm: 20, returnRate: null, finalPrice: null, pricingStrategy: null, customMargin: null,
      }],
    },
    PRESETS[0].config,
  );

  it('带 BOM、表头和每个 SKU 一行', () => {
    const lines = productsToCsv([product]).split('\r\n');
    expect(lines[0].startsWith('﻿商品,')).toBe(true);
    expect(lines).toHaveLength(2);
  });

  it('转义逗号和引号，并防止公式注入', () => {
    const line = productsToCsv([product]).split('\r\n')[1];
    expect(line.startsWith(`"'=HYPERLINK(""x"")"`)).toBe(true);
    expect(line).toContain('"露营, 帐篷"');
    expect(line).toContain('"双人""轻量"""');
  });
});
