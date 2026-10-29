import { describe, expect, it } from 'vitest';
import { parseBackup } from './backup';
import { PRESETS } from './presets';

const legacy = {
  globalParams: {
    exchangeRate: 0.6,
    shippingRate: 30,
    handlingFee: 2,
    minHandlingFee: 5,
    lastMileFee: 3,
    commissionRate: 0.05,
    transactionFee: 0.0378,
    lvgTaxRate: 0.1,
    marketingRate: 0.054,
    sfpFee: 0,
    affiliateRate: 0.15,
    adsRate: 0.08,
    returnRate: 0.05,
    returnLossRate: 0.4,
    targetProfitRate: 0.2,
    pricingStrategy: 'anchor',
    customMultiplier: 1.8,
  },
  products: [
    {
      id: 'prod_1',
      name: '登山杖',
      url: 'https://detail.1688.com/x',
      isExpanded: true,
      variants: [
        {
          skuId: 'sku_1',
          name: '黑色',
          purchaseCost: 25,
          domesticShipping: 3,
          packagingFee: 1,
          weight: 0.4,
          returnRate: null,
          finalPrice: 59,
          pricingStrategy: 'custom',
          currentPrice: 65,
        },
      ],
    },
  ],
};

describe('parseBackup', () => {
  it('v2 备份原样解析', () => {
    const backup = {
      format: 'tkpricing-backup',
      version: 2,
      exportedAt: '2026-10-28T00:00:00.000Z',
      shops: [{ name: '运动户外', site: 'MY', presetId: PRESETS[0].id, config: PRESETS[0].config, products: [] }],
    };
    const parsed = parseBackup(backup);
    expect(parsed.shops).toHaveLength(1);
    expect(parsed.shops[0].config.fees.length).toBe(PRESETS[0].config.fees.length);
  });

  it('旧版 v1 备份（globalParams + products）转换为一个店铺', () => {
    const parsed = parseBackup(legacy);
    expect(parsed.shops).toHaveLength(1);
    const [shop] = parsed.shops;
    expect(shop.site).toBe('MY');
    expect(shop.config.currency.rate).toBe(0.6);
    expect(shop.config.fees.find((f) => f.id === 'commission')?.value).toBe(0.05);
    expect(shop.config.returns.resaleRate).toBeCloseTo(0.6);
    expect(shop.config.pricing.defaultStrategy).toBe('anchor');

    const [product] = shop.products;
    expect(product.name).toBe('登山杖');
    const [sku] = product.variants ?? [];
    expect(sku.skuName).toBe('黑色');
    expect(sku.weightKg).toBe(0.4);
    expect(sku.finalPrice).toBe(59);
    // 旧的 custom 依赖倍数，无法换算，回退为继承
    expect(sku.pricingStrategy).toBeNull();
  });

  it('无法识别的内容抛出错误', () => {
    expect(() => parseBackup({ foo: 1 })).toThrow();
    expect(() => parseBackup(null)).toThrow();
  });
});
