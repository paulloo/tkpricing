// ============================================
// Next.js 主页 - TK Shop 智能定价计算器
// ============================================

'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { SummaryCards } from '@/components/SummaryCards';
import { ProductCard } from '@/components/ProductCard';
import { GlobalParamsPanel } from '@/components/GlobalParamsPanel';
import { AddProductDialog } from '@/components/AddProductDialog';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useStore, useCalculatedProducts, useSummaryStats } from '@/store/useStore';

export default function Home() {
  const { loadData, isLoading, error, lastSaved } = useStore();
  const products = useCalculatedProducts();
  const summaryStats = useSummaryStats();
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [mobileParamsOpen, setMobileParamsOpen] = useState(false);

  // 初始加载数据
  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        lastSaved={lastSaved}
        onAddProduct={() => setAddProductOpen(true)}
        onOpenParams={() => setMobileParamsOpen(true)}
      />

      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <SummaryCards stats={summaryStats} />

        <div className="mt-4 space-y-3">
          {products.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg border border-slate-200">
              <p className="text-slate-400 text-sm">暂无商品，点击右上角「添加商品」开始</p>
            </div>
          ) : (
            products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </div>
      </main>

      {/* 全局参数面板 (Sheet) */}
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
