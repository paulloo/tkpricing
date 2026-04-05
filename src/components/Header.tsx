// ============================================
// 头部组件 (优化版，支持移动端)
// ============================================

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Upload, 
  Trash2, 
  FileSpreadsheet,
  Save,
  MoreHorizontal,
  Calculator,
  Settings2
} from 'lucide-react';

interface HeaderProps {
  lastSaved: string | null;
  onAddProduct: () => void;
  onOpenParams: () => void;
}

export function Header({ lastSaved, onAddProduct, onOpenParams }: HeaderProps) {
  const { 
    expandAllProducts, 
    collapseAllProducts, 
    exportData, 
    importData: importDataFromStore, 
    clearAllData,
    products 
  } = useStore();
  
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // 格式化最后保存时间
  const formatLastSaved = () => {
    if (!lastSaved) return '未保存';
    const date = new Date(lastSaved);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    return date.toLocaleDateString();
  };

  // 导出数据
  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tk_pricing_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 导入数据
  const handleImport = () => {
    try {
      const data = JSON.parse(importText);
      importDataFromStore(data);
      setImportDialogOpen(false);
      setImportText('');
      alert('数据导入成功！');
    } catch (error) {
      alert('数据格式错误，请检查JSON格式');
    }
  };

  // 清空数据
  const handleClear = () => {
    if (confirmText === '确认删除') {
      clearAllData();
      setClearDialogOpen(false);
      setConfirmText('');
    }
  };

  // 导出CSV
  const handleExportCSV = () => {
    const data = exportData();
    const rows: string[] = [];
    
    // CSV 头部
    rows.push('商品名称,商品链接,SKU名称,采购成本,包装费,重量,退货率,最终定价');
    
    // 数据行
    data.products.forEach((product) => {
      product.variants.forEach((variant) => {
        rows.push([
          product.name,
          product.url,
          variant.name,
          variant.purchaseCost,
          variant.packagingFee || 0,
          variant.weight,
          variant.returnRate ?? data.globalParams.returnRate,
          variant.finalPrice ?? '',
        ].join(','));
      });
    });
    
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tk_pricing_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="px-3 md:px-4 py-2 md:py-3">
        <div className="flex items-center justify-between">
          {/* 左侧：Logo和标题 */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* 移动端参数按钮 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenParams}
              className="lg:hidden h-8 w-8 p-0"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
              <Calculator className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm md:text-lg font-bold text-slate-800">
                TK Shop 定价计算器
              </h1>
              <div className="flex items-center gap-1 md:gap-2 text-[10px] md:text-xs text-slate-500">
                <span>v2.5</span>
                <span className="hidden md:inline">•</span>
                <span className="hidden md:flex items-center gap-1">
                  <Save className="h-3 w-3" />
                  {formatLastSaved()}
                </span>
              </div>
            </div>
          </div>

          {/* 右侧：操作按钮 */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* 展开/折叠 - 桌面端 */}
            <div className="hidden md:flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={expandAllProducts}
                disabled={products.length === 0}
                className="h-8 text-xs"
              >
                <ChevronDown className="h-3.5 w-3.5 mr-1" />
                展开
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={collapseAllProducts}
                disabled={products.length === 0}
                className="h-8 text-xs"
              >
                <ChevronUp className="h-3.5 w-3.5 mr-1" />
                折叠
              </Button>
            </div>

            {/* 添加商品 */}
            <Button
              onClick={onAddProduct}
              className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              <span className="hidden md:inline">添加商品</span>
              <span className="md:hidden">添加</span>
            </Button>

            {/* 更多操作 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleExportCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  导出 CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  备份数据
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  导入数据
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setClearDialogOpen(true)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  清空全部
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* 导入数据对话框 */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>导入数据</DialogTitle>
            <DialogDescription>
              粘贴之前导出的JSON数据以恢复配置
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={`{\n  "globalParams": {...},\n  "products": [...]\n}`}
            className="w-full h-48 p-3 text-xs font-mono border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleImport} disabled={!importText.trim()}>
              导入
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 清空数据确认对话框 */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-red-600">危险操作</DialogTitle>
            <DialogDescription>
              此操作将删除所有商品和配置，且无法恢复。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              请输入 <strong>确认删除</strong> 以继续：
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="确认删除"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearDialogOpen(false)}>
              取消
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleClear}
              disabled={confirmText !== '确认删除'}
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
