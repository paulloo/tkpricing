// 商品列表：搜索、筛选、排序、分页

import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { CalculatedProduct } from '@/domain/pricing/portfolio';
import type { ShopConfig } from '@/domain/shop-config';
import { cn } from '@/lib/utils';
import { FILTER_LABELS, SORT_LABELS, queryProducts, type ProductFilter, type ProductSort } from '@/lib/product-filters';
import { Input } from '@/components/ui/input';
import { ProductCard } from '@/components/product/ProductCard';
import { Pagination } from './Pagination';

const PAGE_SIZES = [10, 20, 50] as const;

interface ProductListProps {
  products: readonly CalculatedProduct[];
  config: ShopConfig;
  loading: boolean;
  onAddProduct: () => void;
  onImport: () => void;
}

export function ProductList({ products, config, loading, onAddProduct, onImport }: ProductListProps) {
  const [search, setSearchState] = useState('');
  const [filter, setFilterState] = useState<ProductFilter>('all');
  const [sort, setSortState] = useState<ProductSort>('default');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState<number>(PAGE_SIZES[0]);

  // 查询条件变化时回到第 1 页
  const resetting = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };
  const setSearch = resetting(setSearchState);
  const setFilter = resetting(setFilterState);
  const setSort = resetting(setSortState);
  const setPageSize = resetting(setPageSizeState);

  const visible = useMemo(() => queryProducts(products, { search, filter, sort }), [products, search, filter, sort]);
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = visible.slice((safePage - 1) * pageSize, safePage * pageSize);
  const hasQuery = search.trim() !== '' || filter !== 'all' || sort !== 'default';

  const clear = () => {
    setSearch('');
    setFilter('all');
    setSort('default');
  };

  if (loading && products.length === 0) {
    return <div className="py-16 text-center text-sm text-slate-400">加载商品中…</div>;
  }

  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white py-16 text-center">
        <p className="text-sm text-slate-500">这个店铺还没有商品</p>
        <div className="mt-3 flex justify-center gap-3 text-sm">
          <button type="button" onClick={onAddProduct} className="text-blue-600 hover:underline">手动添加</button>
          <button type="button" onClick={onImport} className="text-blue-600 hover:underline">从妙手 CSV 导入</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <div className="relative min-w-[160px] max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索商品、类目、SKU…"
            className="h-7 border-slate-200 bg-slate-50 pl-8 text-xs"
            aria-label="搜索"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {(Object.keys(FILTER_LABELS) as ProductFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn('h-7 rounded px-2.5 text-[11px] font-medium', filter === f ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100')}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as ProductSort)}
            className="h-7 rounded-md border border-slate-200 bg-slate-50 px-1.5 text-xs"
            aria-label="排序"
          >
            {(Object.keys(SORT_LABELS) as ProductSort[]).map((s) => (
              <option key={s} value={s}>{SORT_LABELS[s]}</option>
            ))}
          </select>
          {hasQuery && (
            <button type="button" onClick={clear} className="h-7 rounded px-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="清除筛选">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
        <span>
          {hasQuery ? `筛选结果 ${visible.length} / ${products.length} 个商品` : `共 ${products.length} 个商品`}
          {totalPages > 1 && `，第 ${safePage} / ${totalPages} 页`}
        </span>
        <label className="flex items-center gap-1.5">
          每页
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="h-6 rounded border border-slate-200 bg-slate-50 px-1 text-[11px]">
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s} 条</option>
            ))}
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white py-10 text-center">
          <p className="text-sm text-slate-400">没有匹配的商品</p>
          <button type="button" onClick={clear} className="mt-2 text-xs text-blue-500 hover:underline">清除筛选条件</button>
        </div>
      ) : (
        pageItems.map((item) => <ProductCard key={item.product.id} item={item} config={config} />)
      )}

      <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
