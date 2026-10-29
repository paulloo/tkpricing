// ============================================
// 主页 — TK Shop 定价计算器
// ============================================

'use client';

import { useEffect, useState } from 'react';
import { useCalculatedProducts, usePortfolioStats } from '@/hooks/useCalculatedProducts';
import { useCurrentShop, useEffectiveConfig, useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Header, type HeaderDialog } from '@/components/Header';
import { Onboarding } from '@/components/Onboarding';
import { ProductList } from '@/components/ProductList';
import { SummaryBar } from '@/components/SummaryBar';
import { AddProductDialog } from '@/components/dialogs/AddProductDialog';
import { DeleteShopDialog } from '@/components/dialogs/DeleteShopDialog';
import { MiaoshouImportDialog } from '@/components/dialogs/MiaoshouImportDialog';
import { RestoreBackupDialog } from '@/components/dialogs/RestoreBackupDialog';
import { CreateShopDialog } from '@/components/shop/CreateShopDialog';
import { ShopSettingsPanel } from '@/components/shop/ShopSettingsPanel';

export default function Home() {
  const { init, status, loadError, productsLoading, setDraftConfig } = useStore();
  const shop = useCurrentShop();
  const config = useEffectiveConfig();
  const products = useCalculatedProducts();
  const stats = usePortfolioStats(products);
  const [dialog, setDialog] = useState<HeaderDialog | null>(null);

  useEffect(() => {
    void init();
  }, [init]);

  const dialogProps = (name: HeaderDialog) => ({
    open: dialog === name,
    onOpenChange: (open: boolean) => setDialog(open ? name : null),
  });

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        <div className="mr-3 h-6 w-6 animate-spin rounded-full border-b-2 border-slate-700" />
        加载中…
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-red-600">加载失败：{loadError}</p>
        <p className="text-xs text-slate-500">请确认数据库已启动，并已执行 pnpm db:deploy。</p>
        <Button onClick={() => void init()}>重试</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header products={products} onOpen={setDialog} />

      <main className="container mx-auto max-w-7xl px-3 py-3 md:px-4">
        {!shop || !config ? (
          <Onboarding onCreateShop={() => setDialog('createShop')} onRestore={() => setDialog('restore')} />
        ) : (
          <>
            {shop.configIssue && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <span>这个店铺保存的设置无法读取（可能来自旧版本或手工修改），当前临时使用站点预设计算。请核对后保存。</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 border-amber-300 bg-white text-xs"
                  onClick={() => {
                    setDraftConfig(shop.config);
                    setDialog('settings');
                  }}
                >
                  检查并保存设置
                </Button>
              </div>
            )}
            <SummaryBar stats={stats} />
            <ProductList
              products={products}
              config={config}
              loading={productsLoading}
              onAddProduct={() => setDialog('addProduct')}
              onImport={() => setDialog('miaoshou')}
            />
          </>
        )}
      </main>

      <Sheet {...dialogProps('settings')}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
          <SheetTitle className="sr-only">店铺设置</SheetTitle>
          <ShopSettingsPanel />
        </SheetContent>
      </Sheet>

      <CreateShopDialog {...dialogProps('createShop')} />
      <AddProductDialog {...dialogProps('addProduct')} />
      <MiaoshouImportDialog {...dialogProps('miaoshou')} />
      <RestoreBackupDialog {...dialogProps('restore')} />
      <DeleteShopDialog {...dialogProps('deleteShop')} />
    </div>
  );
}
