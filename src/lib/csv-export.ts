// 导出当前店铺的定价结果为 CSV（Excel 可直接打开，含 BOM）

import type { CalculatedProduct } from '@/domain/pricing/portfolio';

const HEADERS = [
  '商品', '类目', 'SKU', 'TikTok SKU ID', '采购', '国内运费', '包装', '重量kg', '长cm', '宽cm', '高cm',
  '计费重kg', '单件成本', '保本价', '建议价', '最终价', '现价', '期望净利', '期望净利率', '可让利', '预警',
] as const;

/** 防止 CSV 注入：以 = + - @ 开头的文本加前缀单引号 */
function escape(value: string | number | null | undefined): string {
  if (value == null) return '';
  let text = typeof value === 'number' ? (Number.isFinite(value) ? String(Math.round(value * 100) / 100) : '') : value;
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function productsToCsv(products: readonly CalculatedProduct[]): string {
  const rows = products.flatMap(({ product, skus }) =>
    skus.map(({ sku, calc }) => [
      product.name, product.category, sku.skuName, sku.tiktokSkuId,
      sku.purchaseCost, sku.domesticShipping, sku.packagingFee, sku.weightKg, sku.lengthCm, sku.widthCm, sku.heightCm,
      calc.cost.chargeableWeightKg, calc.unitCost, calc.breakEvenPrice, calc.suggestedPrice, calc.finalPrice,
      sku.currentPrice, calc.atFinal.expectedProfit, `${(calc.atFinal.expectedMargin * 100).toFixed(1)}%`,
      `${(calc.maxDiscount * 100).toFixed(0)}%`, calc.warnings.join(' '),
    ]),
  );
  return '﻿' + [HEADERS, ...rows].map((r) => r.map(escape).join(',')).join('\r\n');
}
