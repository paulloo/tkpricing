import { describe, expect, it } from 'vitest';
import { parseCsv, parseMiaoshouCsv } from './miaoshou';

const header = Array.from({ length: 25 }, (_, i) => `col${i}`).join(',');

function row(overrides: Record<number, string>): string {
  const cols = Array.from({ length: 25 }, () => '');
  Object.entries(overrides).forEach(([i, v]) => {
    cols[Number(i)] = v;
  });
  return cols.join(',');
}

describe('parseCsv', () => {
  it('处理引号、转义引号和字段内换行', () => {
    const rows = parseCsv('a,"b,1","c ""q""","多\n行"\r\nx,y,z,w\n');
    expect(rows).toEqual([
      ['a', 'b,1', 'c "q"', '多\n行'],
      ['x', 'y', 'z', 'w'],
    ]);
  });

  it('去除 BOM', () => {
    expect(parseCsv('﻿a,b')).toEqual([['a', 'b']]);
  });
});

describe('parseMiaoshouCsv', () => {
  const csv = [
    header,
    row({ 0: 'sku-1', 2: 'g-1', 3: '登山杖', 10: '黑色', 12: '59.9', 13: '100', 14: 'http://img/1.jpg', 15: '"http://img/a.jpg,http://img/b.jpg"', 16: '0.4', 22: 'https://1688/x', 24: '25' }),
    row({ 0: 'sku-2', 2: 'g-1', 3: '登山杖', 10: '蓝色', 12: '59.9', 13: '50', 16: '0.45', 24: '26.5' }),
    row({ 0: 'sku-3', 2: 'g-2', 3: '速干T恤', 10: 'M', 12: 'abc', 16: '', 24: '' }),
    row({ 0: 'sku-x', 2: '', 3: '无产品ID' }),
  ].join('\n');

  it('按全球产品 ID 分组为商品 + SKU', () => {
    const { products, skippedRows } = parseMiaoshouCsv(csv);
    expect(products).toHaveLength(2);
    expect(skippedRows).toBe(1);

    const [pole] = products;
    expect(pole.name).toBe('登山杖');
    expect(pole.imageUrl).toBe('http://img/a.jpg');
    expect(pole.url).toBe('https://1688/x');
    expect(pole.variants).toHaveLength(2);
    expect(pole.variants?.[0]).toMatchObject({
      skuName: '黑色',
      tiktokSkuId: 'sku-1',
      purchaseCost: 25,
      weightKg: 0.4,
      currentPrice: 59.9,
      inventory: 100,
    });
  });

  it('无效数字视为空值而不是 0 价格', () => {
    const { products } = parseMiaoshouCsv(csv);
    const tee = products[1].variants?.[0];
    expect(tee?.currentPrice).toBeNull();
    expect(tee?.purchaseCost).toBe(0);
    expect(tee?.weightKg).toBe(0);
  });

  it('重量单位为克时换算为千克', () => {
    const gramsCsv = [header, row({ 0: 's', 2: 'g', 3: 'p', 16: '400' })].join('\n');
    const { products } = parseMiaoshouCsv(gramsCsv, { weightUnit: 'g' });
    expect(products[0].variants?.[0].weightKg).toBeCloseTo(0.4);
  });

  it('只有表头时返回空', () => {
    expect(parseMiaoshouCsv(header).products).toEqual([]);
  });
});
