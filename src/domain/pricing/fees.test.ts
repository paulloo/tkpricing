import { describe, expect, it } from 'vitest';
import type { FeeLine } from '../shop-config';
import { feeBreakpoints, feeAmounts, resolveFeeLines } from './fees';

const line = (over: Partial<FeeLine>): FeeLine => ({
  id: 'x',
  label: 'x',
  kind: 'percent',
  value: 0,
  cap: null,
  maxPrice: null,
  refundOnReturn: true,
  enabled: true,
  note: '',
  ...over,
});

describe('feeAmounts', () => {
  it('百分比费用按售价计算，固定费用每单收取', () => {
    const fees = feeAmounts(100, [
      line({ id: 'c', value: 0.08 }),
      line({ id: 'f', kind: 'fixed', value: 0.54 }),
    ]);
    expect(fees.map((f) => f.amount)).toEqual([8, 0.54]);
  });

  it('封顶生效', () => {
    const [fee] = feeAmounts(2000, [line({ value: 0.0486, cap: 50 })]);
    expect(fee.amount).toBe(50);
  });

  it('超过 maxPrice 不收（LVG 仅对 ≤ RM500 征收）', () => {
    const lvg = line({ id: 'lvg', value: 0.1, maxPrice: 500 });
    expect(feeAmounts(500, [lvg])[0].amount).toBeCloseTo(50);
    expect(feeAmounts(500.01, [lvg])).toEqual([]);
  });

  it('跳过未启用的费用', () => {
    expect(feeAmounts(100, [line({ value: 0.1, enabled: false })])).toEqual([]);
  });
});

describe('resolveFeeLines', () => {
  it('商品级佣金覆盖 commission 行', () => {
    const lines = resolveFeeLines([line({ id: 'commission', value: 0.08 })], { commissionRate: 0.1026 });
    expect(lines[0].value).toBe(0.1026);
  });

  it('没有覆盖时原样返回且不修改入参', () => {
    const original = [line({ id: 'commission', value: 0.08 })];
    const lines = resolveFeeLines(original, { commissionRate: null });
    expect(lines).toEqual(original);
    expect(original[0].value).toBe(0.08);
  });
});

describe('feeBreakpoints', () => {
  it('返回封顶拐点和 maxPrice 阈值，升序去重', () => {
    const points = feeBreakpoints([
      line({ value: 0.05, cap: 50 }),
      line({ value: 0.1, maxPrice: 500 }),
      line({ value: 0.1, maxPrice: 500 }),
      line({ kind: 'fixed', value: 1 }),
    ]);
    expect(points).toEqual([500, 1000]);
  });
});
