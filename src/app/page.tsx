// ============================================
// Next.js 主页 - TK Shop 智能定价计算器
// ============================================

'use client';

import { useEffect } from 'react';
import { Header } from '@/components/Header';
import { SummaryCards } from '@/components/SummaryCards';
import { ProductCard } from '@/components/ProductCard';
import { GlobalParamsPanel } from '@/components/GlobalParamsPanel';
import { AddProductDialog } from '@/components/AddProductDialog';
import { useStore, useSummaryStats } from '@/store/useStore';

export default function Home() {
  const { products, loadData, isLoading, error } = useStore();
  const summaryStats = useSummaryStats();

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
      <Header />
      
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        <SummaryCards stats={summaryStats} />
        
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 全局参数面板 */}
          <div className="lg:col-span-1">
            <GlobalParamsPanel />
          </div>
          
          {/* 商品列表 */}
          <div className="lg:col-span-3 space-y-4">
            {products.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500">暂无商品，点击上方按钮添加</p>
              </div>
            ) : (
              products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            )}
          </div>
        </div>
      </main>
      
      <AddProductDialog />
    </div>
  );
}
