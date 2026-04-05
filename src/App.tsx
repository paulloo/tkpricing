// ============================================
// TK Shop 智能定价计算器 v2.5 - 主应用 (优化版)
// ============================================

import { useState } from 'react';
import { useStore, useCalculatedProducts, useSummaryStats } from '@/store/useStore';
import { GlobalParamsPanel } from '@/components/GlobalParamsPanel';
import { Header } from '@/components/Header';
import { SummaryCards } from '@/components/SummaryCards';
import { ProductCard } from '@/components/ProductCard';
import { AddProductDialog } from '@/components/AddProductDialog';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { 
  Plus, 
  Package
} from 'lucide-react';

function App() {
  const { lastSaved } = useStore();
  const calculatedProducts = useCalculatedProducts();
  const summaryStats = useSummaryStats();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [paramsSheetOpen, setParamsSheetOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 头部 */}
      <Header 
        lastSaved={lastSaved} 
        onAddProduct={() => setAddDialogOpen(true)}
        onOpenParams={() => setParamsSheetOpen(true)}
      />

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 桌面端左侧参数面板 */}
        <div className="hidden lg:block">
          <GlobalParamsPanel />
        </div>

        {/* 移动端参数面板抽屉 */}
        <Sheet open={paramsSheetOpen} onOpenChange={setParamsSheetOpen}>
          <SheetContent side="left" className="p-0 w-80">
            <GlobalParamsPanel />
          </SheetContent>
        </Sheet>

        {/* 右侧内容区 */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-3 md:p-4 space-y-3 md:space-y-4">
            {/* 汇总统计卡片 */}
            <SummaryCards stats={summaryStats} />

            {/* 商品列表 */}
            <div className="space-y-3 md:space-y-4">
              {calculatedProducts.length === 0 ? (
                // 空状态
                <div className="flex flex-col items-center justify-center py-12 md:py-16 px-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Package className="h-8 w-8 md:h-10 md:w-10 text-slate-300" />
                  </div>
                  <h3 className="text-base md:text-lg font-medium text-slate-700 mb-2">
                    还没有商品
                  </h3>
                  <p className="text-xs md:text-sm text-slate-500 text-center max-w-md mb-6">
                    点击"添加商品"开始管理您的 TikTok Shop 商品定价
                    <br className="hidden md:block" />
                    支持多 SKU 变体、定价策略和退货率模型
                  </p>
                  <Button 
                    onClick={() => setAddDialogOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    添加第一个商品
                  </Button>
                </div>
              ) : (
                // 商品卡片列表
                calculatedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))
              )}
            </div>

            {/* 底部添加按钮 */}
            {calculatedProducts.length > 0 && (
              <div className="flex justify-center py-4">
                <Button
                  variant="outline"
                  onClick={() => setAddDialogOpen(true)}
                  className="h-10 px-6 border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  添加商品
                </Button>
              </div>
            )}

            {/* 底部版权信息 */}
            <footer className="py-4 md:py-6 text-center text-[10px] md:text-xs text-slate-400">
              <p>TK Shop 智能定价计算器 v2.5</p>
              <p className="mt-1">数据自动保存到本地浏览器</p>
            </footer>
          </div>
        </main>
      </div>

      {/* 添加商品对话框 */}
      <AddProductDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </div>
  );
}

export default App;
