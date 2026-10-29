// 顶栏：店铺切换、店铺设置、添加商品、数据操作

import { Calculator, ChevronDown, ChevronUp, Download, FileSpreadsheet, Github, MoreHorizontal, Plus, Settings2, ShoppingBag, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { CalculatedProduct } from '@/domain/pricing/portfolio';
import { useCurrentShop, useStore } from '@/store/useStore';
import { api } from '@/lib/api-client';
import { productsToCsv } from '@/lib/csv-export';
import { downloadFile, today } from '@/lib/download';
import { notifyError } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ShopSwitcher } from '@/components/shop/ShopSwitcher';

export type HeaderDialog = 'addProduct' | 'createShop' | 'miaoshou' | 'restore' | 'deleteShop' | 'settings';

interface HeaderProps {
  products: readonly CalculatedProduct[];
  onOpen: (dialog: HeaderDialog) => void;
}

const REPO_URL = 'https://github.com/paulloo/tkpricing';

const safeName = (name: string) => name.replace(/[\\/:*?"<>|\s]+/g, '_');

export function Header({ products, onOpen }: HeaderProps) {
  const shop = useCurrentShop();
  const { setAllExpanded, draftConfig } = useStore();

  const exportJson = async (scope: 'shop' | 'all') => {
    try {
      const backup = scope === 'shop' && shop ? await api.exportShop(shop.id) : await api.exportAll();
      const name = scope === 'shop' && shop ? safeName(shop.name) : 'all-shops';
      downloadFile(`tkpricing_${name}_${today()}.json`, JSON.stringify(backup, null, 2), 'application/json');
      toast.success('备份已下载');
    } catch (error) {
      notifyError(error, '导出失败');
    }
  };

  const exportCsv = () => {
    if (!shop) return;
    downloadFile(`tkpricing_${safeName(shop.name)}_${today()}.csv`, productsToCsv(products), 'text/csv;charset=utf-8');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 px-3 py-2 md:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 sm:flex">
            <Calculator className="h-4 w-4 text-white" />
          </div>
          <h1 className="hidden text-sm font-bold text-slate-800 lg:block">TK Shop 定价计算器</h1>
          <ShopSwitcher onCreate={() => onOpen('createShop')} />
          {shop && (
            <Button variant="outline" size="sm" onClick={() => onOpen('settings')} className="relative h-8 gap-1.5 px-2 text-xs">
              <Settings2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">店铺设置</span>
              {draftConfig && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-500" aria-label="有未保存的设置" />}
            </Button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 md:gap-2">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden h-8 items-center gap-1.5 rounded-md border border-slate-200 px-2 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-800 md:flex"
          >
            <Github className="h-3.5 w-3.5" />
            开源
          </a>
          {shop && (
            <Button onClick={() => onOpen('addProduct')} className="h-8 bg-blue-600 text-xs hover:bg-blue-700">
              <Plus className="mr-1 h-3.5 w-3.5" />
              添加商品
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" aria-label="更多操作">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {shop && (
                <>
                  <DropdownMenuItem onClick={() => setAllExpanded(true)}>
                    <ChevronDown className="mr-2 h-4 w-4" />
                    全部展开
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAllExpanded(false)}>
                    <ChevronUp className="mr-2 h-4 w-4" />
                    全部折叠
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onOpen('miaoshou')}>
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    导入妙手 CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportCsv} disabled={products.length === 0}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    导出定价表 CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportJson('shop')}>
                    <Download className="mr-2 h-4 w-4" />
                    备份当前店铺
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={() => exportJson('all')}>
                <Download className="mr-2 h-4 w-4" />
                备份全部店铺
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpen('restore')}>
                <Upload className="mr-2 h-4 w-4" />
                恢复备份
              </DropdownMenuItem>
              {shop && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onOpen('deleteShop')} className="text-red-600 focus:text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    删除当前店铺
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
