// ============================================
// Next.js 主页 - TK Shop 智能定价计算器
// ============================================

'use client';

import { useEffect, useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { SummaryCards } from '@/components/SummaryCards';
import { ProductCard } from '@/components/ProductCard';
import { GlobalParamsPanel } from '@/components/GlobalParamsPanel';
import { AddProductDialog } from '@/components/AddProductDialog';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore, useCalculatedProducts, useSummaryStats } from '@/store/useStore';

const PAGE_SIZES = [10, 20, 50] as const;
type PageSize = typeof PAGE_SIZES[number];

// ─── 筛选 & 排序类型 ──────────────────────────────────────────────────────────

type MarginFilter = 'all' | 'good' | 'warn' | 'loss';
type SortKey = 'default' | 'margin_desc' | 'margin_asc' | 'cost_asc' | 'cost_desc' | 'sku_desc' | 'name_asc';

const MARGIN_FILTERS: { key: MarginFilter; label: string; cls: string }[] = [
  { key: 'all',  label: '全部',   cls: 'bg-slate-100 text-slate-700 hover:bg-slate-200' },
  { key: 'good', label: '盈利良好', cls: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
  { key: 'warn', label: '注意',   cls: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
  { key: 'loss', label: '亏损',   cls: 'bg-red-100 text-red-600 hover:bg-red-200' },
];

// ─── 主页 ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const { loadData, isLoading, error, lastSaved } = useStore();
  const products = useCalculatedProducts();
  const summaryStats = useSummaryStats();

  const [addProductOpen, setAddProductOpen] = useState(false);
  const [mobileParamsOpen, setMobileParamsOpen] = useState(false);

  // 搜索 / 筛选 / 排序 / 分页状态
  const [search, setSearch] = useState('');
  const [marginFilter, setMarginFilter] = useState<MarginFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);

  useEffect(() => { loadData(); }, [loadData]);

  // 筛选条件变化时重置到第1页
  useEffect(() => { setPage(1); }, [search, marginFilter, sortKey, pageSize]);

  // 过滤 + 排序（纯派生，不影响 store）
  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }

    if (marginFilter !== 'all') {
      list = list.filter((p) => {
        const avg = p.variants.reduce((s, v) => s + v.calculated.actualMargin, 0) / (p.variants.length || 1);
        if (marginFilter === 'good') return avg >= 0.2;
        if (marginFilter === 'warn') return avg >= 0 && avg < 0.2;
        if (marginFilter === 'loss') return avg < 0;
        return true;
      });
    }

    list.sort((a, b) => {
      const avgMargin = (p: typeof a) =>
        p.variants.reduce((s, v) => s + v.calculated.actualMargin, 0) / (p.variants.length || 1);
      const avgCost = (p: typeof a) =>
        p.variants.reduce((s, v) => s + v.calculated.totalCostMYR, 0) / (p.variants.length || 1);

      switch (sortKey) {
        case 'margin_desc': return avgMargin(b) - avgMargin(a);
        case 'margin_asc':  return avgMargin(a) - avgMargin(b);
        case 'cost_asc':    return avgCost(a) - avgCost(b);
        case 'cost_desc':   return avgCost(b) - avgCost(a);
        case 'sku_desc':    return b.variants.length - a.variants.length;
        case 'name_asc':    return a.name.localeCompare(b.name, 'zh-CN');
        default:            return 0;
      }
    });

    return list;
  }, [products, search, marginFilter, sortKey]);

  // 分页
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const displayedProducts = filteredProducts.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>加载失败: {error}</p>
          <button
            onClick={() => loadData()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  const hasFilter = !!(search.trim() || marginFilter !== 'all' || sortKey !== 'default');

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        lastSaved={lastSaved}
        onAddProduct={() => setAddProductOpen(true)}
        onOpenParams={() => setMobileParamsOpen(true)}
      />

      <main className="container mx-auto px-3 md:px-4 py-3 max-w-7xl">
        {/* Dashboard 汇总条 */}
        <SummaryCards stats={summaryStats} />

        {/* 搜索 / 筛选 / 排序工具栏 */}
        <div className="flex flex-wrap items-center gap-2 mb-3 bg-white border border-slate-200 rounded-lg px-3 py-2">
          {/* 搜索框 */}
          <div className="relative flex-1 min-w-[140px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索商品名称..."
              className="h-7 text-xs pl-8 pr-6 bg-slate-50 border-slate-200"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* 利润率筛选 */}
          <div className="flex items-center gap-1">
            {MARGIN_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setMarginFilter(f.key)}
                className={`h-7 px-2.5 rounded text-[11px] font-medium transition-colors ${
                  marginFilter === f.key
                    ? f.cls + ' ring-1 ring-current ring-offset-0'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* 排序 */}
          <div className="flex items-center gap-1 ml-auto">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="h-7 text-xs w-32 border-slate-200 bg-slate-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">默认顺序</SelectItem>
                <SelectItem value="margin_desc">利润率 高→低</SelectItem>
                <SelectItem value="margin_asc">利润率 低→高</SelectItem>
                <SelectItem value="cost_asc">成本 低→高</SelectItem>
                <SelectItem value="cost_desc">成本 高→低</SelectItem>
                <SelectItem value="sku_desc">SKU数 多→少</SelectItem>
                <SelectItem value="name_asc">名称 A→Z</SelectItem>
              </SelectContent>
            </Select>

            {hasFilter && (
              <button
                onClick={() => { setSearch(''); setMarginFilter('all'); setSortKey('default'); }}
                className="h-7 px-2 text-[11px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 商品列表 */}
        <div className="space-y-3">
          {products.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg border border-slate-200">
              <p className="text-slate-400 text-sm">暂无商品，点击右上角「添加商品」开始</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-lg border border-slate-200">
              <p className="text-slate-400 text-sm">没有匹配的商品</p>
              <button
                onClick={() => { setSearch(''); setMarginFilter('all'); setSortKey('default'); }}
                className="mt-2 text-xs text-blue-500 hover:underline"
              >
                清除筛选条件
              </button>
            </div>
          ) : (
            <>
              {/* 列表信息 + 每页条数 */}
              <div className="flex items-center justify-between px-1">
                <p className="text-[11px] text-slate-400">
                  {hasFilter
                    ? `筛选结果 ${filteredProducts.length} / ${products.length} 个商品`
                    : `共 ${products.length} 个商品`}
                  {totalPages > 1 && `，第 ${safePage} / ${totalPages} 页`}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">每页</span>
                  <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v) as PageSize)}>
                    <SelectTrigger className="h-6 text-[11px] w-14 border-slate-200 bg-slate-50 px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZES.map((s) => (
                        <SelectItem key={s} value={String(s)}>{s} 条</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {displayedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}

              {/* 分页控件 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 pt-1 pb-2">
                  <button
                    onClick={() => setPage(1)}
                    disabled={safePage === 1}
                    className="h-7 w-7 flex items-center justify-center rounded text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="h-7 w-7 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {/* 页码按钮：显示首尾页 + 当前页附近各1页，中间用省略号 */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                    .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === 'ellipsis' ? (
                        <span key={`e-${idx}`} className="h-7 w-7 flex items-center justify-center text-xs text-slate-400">
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => setPage(item)}
                          className={`h-7 w-7 flex items-center justify-center rounded text-xs font-medium transition-colors ${
                            item === safePage
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="h-7 w-7 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={safePage === totalPages}
                    className="h-7 w-7 flex items-center justify-center rounded text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    »
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* 全局参数面板 */}
      <Sheet open={mobileParamsOpen} onOpenChange={setMobileParamsOpen}>
        <SheetContent side="right" className="w-80 p-0 flex flex-col">
          <SheetTitle className="sr-only">全局参数配置</SheetTitle>
          <GlobalParamsPanel />
        </SheetContent>
      </Sheet>

      <AddProductDialog open={addProductOpen} onOpenChange={setAddProductOpen} />
    </div>
  );
}
