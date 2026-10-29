// 商品列表的搜索 / 筛选 / 排序（纯函数，不修改入参）

import type { CalculatedProduct } from '@/domain/pricing/portfolio';

export type ProductFilter = 'all' | 'attention' | 'loss' | 'volumetric' | 'healthy';
export type ProductSort = 'default' | 'margin_asc' | 'margin_desc' | 'price_desc' | 'name_asc';

export const FILTER_LABELS: Record<ProductFilter, string> = {
  all: '全部',
  attention: '需处理',
  loss: '亏损',
  volumetric: '抛货',
  healthy: '健康',
};

export const SORT_LABELS: Record<ProductSort, string> = {
  default: '默认顺序',
  margin_asc: '净利率 低→高',
  margin_desc: '净利率 高→低',
  price_desc: '售价 高→低',
  name_asc: '名称',
};

const hasWarning = (p: CalculatedProduct, w: string) => p.skus.some((s) => s.calc.warnings.includes(w as never));

const FILTERS: Record<ProductFilter, (p: CalculatedProduct) => boolean> = {
  all: () => true,
  attention: (p) => p.summary.warningCount > 0,
  loss: (p) => hasWarning(p, 'loss') || hasWarning(p, 'current-price-loss'),
  volumetric: (p) => hasWarning(p, 'volumetric'),
  healthy: (p) => p.summary.skuCount > 0 && p.summary.warningCount === 0,
};

const SORTS: Record<ProductSort, ((a: CalculatedProduct, b: CalculatedProduct) => number) | null> = {
  default: null,
  margin_asc: (a, b) => a.summary.margin - b.summary.margin,
  margin_desc: (a, b) => b.summary.margin - a.summary.margin,
  price_desc: (a, b) => b.summary.priceRange[1] - a.summary.priceRange[1],
  name_asc: (a, b) => a.product.name.localeCompare(b.product.name, 'zh-CN'),
};

export interface ProductQuery {
  search: string;
  filter: ProductFilter;
  sort: ProductSort;
}

export function queryProducts(products: readonly CalculatedProduct[], query: ProductQuery): CalculatedProduct[] {
  const q = query.search.trim().toLowerCase();
  const matches = (p: CalculatedProduct) =>
    !q ||
    p.product.name.toLowerCase().includes(q) ||
    (p.product.category ?? '').toLowerCase().includes(q) ||
    p.skus.some((s) => s.sku.skuName.toLowerCase().includes(q) || (s.sku.tiktokSkuId ?? '').includes(q));

  const filtered = products.filter((p) => matches(p) && FILTERS[query.filter](p));
  const compare = SORTS[query.sort];
  return compare ? [...filtered].sort(compare) : filtered;
}
