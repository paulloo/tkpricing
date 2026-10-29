import { describe, expect, it } from 'vitest';
import { chargeableWeightKg, firstLegCost, lastMileCost, volumetricWeightKg } from './shipping';

describe('volumetricWeightKg', () => {
  it('计算 长×宽×高 / 除数', () => {
    expect(volumetricWeightKg({ lengthCm: 60, widthCm: 40, heightCm: 25 }, 6000)).toBeCloseTo(10);
  });

  it('尺寸缺失或除数为 0 时返回 0', () => {
    expect(volumetricWeightKg({ lengthCm: 60, widthCm: null, heightCm: 25 }, 6000)).toBe(0);
    expect(volumetricWeightKg({ lengthCm: 60, widthCm: 40, heightCm: 25 }, 0)).toBe(0);
  });
});

describe('chargeableWeightKg', () => {
  it('取实重与体积重较大者（抛货按体积重）', () => {
    expect(chargeableWeightKg(1.2, 10)).toBe(10);
    expect(chargeableWeightKg(1.2, 0.5)).toBe(1.2);
  });
});

describe('firstLegCost', () => {
  const firstLeg = { ratePerKg: 35, minCharge: 5, handlingFee: 2, volumetricDivisor: 6000 };

  it('按计费重 × 单价，加贴单费', () => {
    expect(firstLegCost(1, firstLeg)).toBeCloseTo(37);
  });

  it('不足最低收费按最低收费', () => {
    expect(firstLegCost(0.05, firstLeg)).toBeCloseTo(7);
  });
});

describe('lastMileCost', () => {
  const lastMile = { firstWeightKg: 0.5, firstWeightFee: 3, stepKg: 0.5, stepFee: 1.5, taxRate: 0 };

  it('首重内只收首重费', () => {
    expect(lastMileCost(0.3, lastMile)).toBeCloseTo(3);
    expect(lastMileCost(0.5, lastMile)).toBeCloseTo(3);
  });

  it('续重不足一档按一档计', () => {
    expect(lastMileCost(0.51, lastMile)).toBeCloseTo(4.5);
    expect(lastMileCost(1.0, lastMile)).toBeCloseTo(4.5);
    expect(lastMileCost(1.2, lastMile)).toBeCloseTo(6);
  });

  it('浮点误差不会多算一档', () => {
    expect(lastMileCost(0.7 + 0.3, lastMile)).toBeCloseTo(4.5);
  });

  it('加收运费税', () => {
    expect(lastMileCost(0.5, { ...lastMile, taxRate: 0.06 })).toBeCloseTo(3.18);
  });

  it('续重档位为 0 时视为固定运费', () => {
    expect(lastMileCost(5, { ...lastMile, stepKg: 0 })).toBeCloseTo(3);
  });
});
