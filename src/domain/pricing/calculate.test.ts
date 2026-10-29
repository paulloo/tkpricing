import { describe, expect, it } from 'vitest';
import type { ShopConfig } from '../shop-config';
import { PRESETS } from '../presets';
import { calculateSku, type SkuPricingInput } from './calculate';
import { evaluateAt, costBasis } from './economics';
import { roundPrice, solvePriceForMargin } from './solver';

// 便于手算的配置：汇率 0.6，佣金 10% + 每单 1，达人 10% + 广告 10%，
// 头程 30/kg，尾程固定 5，无退货。
const config: ShopConfig = {
  schemaVersion: 1,
  currency: { sale: 'MYR', cost: 'CNY', rate: 0.6, buffer: 0 },
  fees: [
    { id: 'commission', label: '佣金', kind: 'percent', value: 0.1, cap: null, maxPrice: null, refundOnReturn: true, enabled: true, note: '' },
    { id: 'fixed', label: '固定费', kind: 'fixed', value: 1, cap: null, maxPrice: null, refundOnReturn: false, enabled: true, note: '' },
  ],
  marketing: { affiliateRate: 0.1, adsRate: 0.1 },
  firstLeg: { ratePerKg: 30, minCharge: 0, handlingFee: 0, volumetricDivisor: 6000 },
  lastMile: { firstWeightKg: 1, firstWeightFee: 5, stepKg: 0, stepFee: 0, taxRate: 0 },
  returns: { rate: 0, resaleRate: 1, returnShippingFee: 0 },
  pricing: {
    targetMargins: { drainage: 0, profit: 0.2, anchor: 0.3 },
    defaultStrategy: 'profit',
    rounding: { step: 0.01, ending: 0 },
  },
};

// 采购 50 + 头程 30 = 80 CNY → 48 MYR，加尾程 5 → 单件成本 53 MYR
// 售价 P 时：送达利润 = P − 53 − 0.1P − 1 − 0.2P = 0.7P − 54
const sku: SkuPricingInput = {
  purchaseCost: 50,
  domesticShipping: 0,
  packagingFee: 0,
  weightKg: 1,
  lengthCm: null,
  widthCm: null,
  heightCm: null,
  returnRate: null,
  finalPrice: null,
  currentPrice: null,
  pricingStrategy: null,
  customMargin: null,
};

const noOverrides = { commissionRate: null };

describe('evaluateAt', () => {
  it('送达订单利润包含所有扣费', () => {
    const basis = costBasis(sku, config);
    expect(basis.landedCost).toBeCloseTo(48);
    expect(basis.lastMileCost).toBeCloseTo(5);
    const e = evaluateAt(100, basis, config.fees, config, 0);
    expect(e.platformFees).toBeCloseTo(11);
    expect(e.affiliateCost).toBeCloseTo(10);
    expect(e.adsCost).toBeCloseTo(10);
    expect(e.deliveredProfit).toBeCloseTo(16);
    expect(e.expectedMargin).toBeCloseTo(0.16);
  });

  it('退货：损失尾程、退货运费、不可再售货值、不退的费用和广告费，达人佣金不结算', () => {
    const withReturns: ShopConfig = {
      ...config,
      returns: { rate: 0.1, resaleRate: 0.5, returnShippingFee: 3 },
    };
    const e = evaluateAt(100, costBasis(sku, withReturns), withReturns.fees, withReturns, 0.1);
    // 退货单损失 = 5 + 3 + 48×0.5 + 1 + 10 = 43
    expect(e.returnedLoss).toBeCloseTo(43);
    // 期望利润 = 0.9×16 − 0.1×43 = 10.1
    expect(e.expectedProfit).toBeCloseTo(10.1);
  });

  it('汇率缓冲按更差汇率计成本', () => {
    const basis = costBasis(sku, { ...config, currency: { ...config.currency, buffer: 0.05 } });
    expect(basis.landedCost).toBeCloseTo(50.4);
  });
});

describe('solvePriceForMargin', () => {
  const basis = costBasis(sku, config);
  const profitAt = (p: number) => evaluateAt(p, basis, config.fees, config, 0).expectedProfit;

  it('保本价：期望利润为 0', () => {
    expect(solvePriceForMargin(0, profitAt, [])).toBeCloseTo(54 / 0.7, 6);
  });

  it('目标净利率 20% → 108', () => {
    expect(solvePriceForMargin(0.2, profitAt, [])).toBeCloseTo(108, 6);
  });

  it('目标不可达时返回 null', () => {
    expect(solvePriceForMargin(0.75, profitAt, [])).toBeNull();
  });

  it('跨过阈值后费用消失时，取阈值之上的最低价', () => {
    // 售价 ≤ 100 时收 30% 税：低于 100 达不到 45%，超过 100 立刻满足
    const lvgFees = [
      { id: 'lvg', label: 'lvg', kind: 'percent' as const, value: 0.3, cap: null, maxPrice: 100, refundOnReturn: true, enabled: true, note: '' },
    ];
    const cfg: ShopConfig = { ...config, fees: lvgFees, marketing: { affiliateRate: 0, adsRate: 0 } };
    const b = costBasis(sku, cfg);
    const fn = (p: number) => evaluateAt(p, b, cfg.fees, cfg, 0).expectedProfit;
    const price = solvePriceForMargin(0.45, fn, [100]);
    expect(price).not.toBeNull();
    expect(price!).toBeGreaterThan(100);
    expect(price!).toBeLessThan(100.02);
  });
});

describe('roundPrice', () => {
  it('向上取整到尾数 .90', () => {
    expect(roundPrice(12.3, { step: 1, ending: 0.9 })).toBeCloseTo(12.9);
    expect(roundPrice(12.9, { step: 1, ending: 0.9 })).toBeCloseTo(12.9);
    expect(roundPrice(12.95, { step: 1, ending: 0.9 })).toBeCloseTo(13.9);
  });

  it('大面额币种按 100 取整', () => {
    expect(roundPrice(12345, { step: 100, ending: 0 })).toBe(12400);
  });

  it('按分取整不产生浮点尾巴', () => {
    expect(roundPrice(77.142857, { step: 0.01, ending: 0 })).toBe(77.15);
  });
});

describe('calculateSku', () => {
  it('默认按店铺默认策略的目标净利率定价', () => {
    const c = calculateSku(sku, noOverrides, config);
    expect(c.strategy).toBe('profit');
    expect(c.targetMargin).toBe(0.2);
    expect(c.suggestedPrice).toBeCloseTo(108);
    expect(c.finalPrice).toBeCloseTo(108);
    expect(c.isManualPrice).toBe(false);
    expect(c.atFinal.expectedMargin).toBeCloseTo(0.2);
    expect(c.breakEvenPrice).toBeCloseTo(77.15);
  });

  it('价格阶梯给出引流/利润/锚定三档价', () => {
    const c = calculateSku(sku, noOverrides, config);
    expect(c.ladder.drainage).toBeCloseTo(77.15);
    expect(c.ladder.profit).toBeCloseTo(108);
    expect(c.ladder.anchor).toBeCloseTo(135); // 0.7P − 54 = 0.3P → P = 135
  });

  it('自定义策略使用 SKU 的目标净利率', () => {
    const c = calculateSku({ ...sku, pricingStrategy: 'custom', customMargin: 0.3 }, noOverrides, config);
    expect(c.targetMargin).toBe(0.3);
    expect(c.suggestedPrice).toBeCloseTo(135);
  });

  it('手动定价优先，并计算最大可让利折扣', () => {
    const c = calculateSku({ ...sku, finalPrice: 100 }, noOverrides, config);
    expect(c.isManualPrice).toBe(true);
    expect(c.finalPrice).toBe(100);
    expect(c.atFinal.expectedProfit).toBeCloseTo(16);
    expect(c.maxDiscount).toBeCloseTo(1 - 77.15 / 100, 3);
    expect(c.warnings).toContain('below-target');
  });

  it('商品级佣金覆盖', () => {
    const c = calculateSku(sku, { commissionRate: 0.2 }, config);
    // 0.6P − 54 = 0.2P → P = 135
    expect(c.suggestedPrice).toBeCloseTo(135);
  });

  it('SKU 退货率覆盖店铺退货率', () => {
    const cfg: ShopConfig = { ...config, returns: { rate: 0, resaleRate: 0, returnShippingFee: 0 } };
    const c = calculateSku({ ...sku, returnRate: 0.2, finalPrice: 100 }, noOverrides, cfg);
    expect(c.atFinal.returnRate).toBe(0.2);
    expect(c.atFinal.expectedProfit).toBeLessThan(16);
  });

  it('抛货：体积重大于实重时提示并按体积重计费', () => {
    const c = calculateSku({ ...sku, lengthCm: 60, widthCm: 40, heightCm: 25 }, noOverrides, config);
    expect(c.cost.chargeableWeightKg).toBeCloseTo(10);
    expect(c.warnings).toContain('volumetric');
  });

  it('当前售价亏损时提示', () => {
    const c = calculateSku({ ...sku, currentPrice: 60 }, noOverrides, config);
    expect(c.atCurrent?.expectedProfit).toBeLessThan(0);
    expect(c.warnings).toContain('current-price-loss');
  });

  it('缺少重量时提示', () => {
    const c = calculateSku({ ...sku, weightKg: 0 }, noOverrides, config);
    expect(c.warnings).toContain('missing-weight');
  });

  it('汇率压力测试：成本币种升值 5% 时的利润率更低', () => {
    const c = calculateSku(sku, noOverrides, config);
    expect(c.fxStressMargin).toBeLessThan(c.atFinal.expectedMargin);
  });

  it('目标不可达时没有建议价，最终价为 0 并提示', () => {
    const c = calculateSku({ ...sku, pricingStrategy: 'custom', customMargin: 0.9 }, noOverrides, config);
    expect(c.suggestedPrice).toBeNull();
    expect(c.warnings).toContain('target-unreachable');
  });

  it('取整不会把价格落回 LVG 阈值上（阈值处仍收税会低于目标）', () => {
    const preset = PRESETS[0].config;
    const cfg: ShopConfig = { ...preset, pricing: { ...preset.pricing, rounding: { step: 1, ending: 0 } } };
    for (const purchaseCost of [320, 340, 358]) {
      const c = calculateSku({ ...sku, purchaseCost, weightKg: 0.5 }, noOverrides, cfg);
      expect(c.suggestedPrice).not.toBe(500);
      expect(c.atFinal.expectedMargin).toBeGreaterThanOrEqual(cfg.pricing.targetMargins.profit - 1e-9);
      expect(c.warnings).not.toContain('below-target');
    }
  });

  it('马来西亚跨境预设：建议价确实达到目标净利率', () => {
    const preset = PRESETS[0].config;
    const c = calculateSku({ ...sku, purchaseCost: 25, weightKg: 0.4 }, noOverrides, preset);
    expect(c.suggestedPrice).not.toBeNull();
    expect(c.atFinal.expectedMargin).toBeGreaterThanOrEqual(preset.pricing.targetMargins.profit - 1e-9);
  });
});
