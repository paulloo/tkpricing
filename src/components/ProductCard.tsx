// ============================================
// 商品卡片组件 (优化版，支持移动端)
// ============================================

import { useState, useRef, useEffect } from 'react';
import type { SKUData } from '@/types';
import { useStore } from '@/store/useStore';
import { SKUTable } from './SKUTable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  ExternalLink, 
  Package, 
  AlertCircle,
  Link2,
  Edit2,
  Check,
  X,
  TrendingUp,
  Layers
} from 'lucide-react';
import { formatCurrency, formatPercent, getMarginColor } from '@/lib/calculator';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    url: string;
    createdAt: string;
    note: string;
    isExpanded: boolean;
    variants: SKUData[];
    summary: {
      skuCount: number;
      avgReturnRate: number;
      totalEstimatedSales: number;
      profitRange: [number, number];
      costRange: [number, number];
      priceRange: [number, number];
    };
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const { toggleProductExpand, updateProduct, deleteProduct } = useStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [localName, setLocalName] = useState(product.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleSaveName = () => {
    updateProduct(product.id, { name: localName });
    setIsEditingName(false);
  };

  const handleCancelName = () => {
    setLocalName(product.name);
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelName();
    }
  };

  const handleDelete = () => {
    if (confirm(`确定要删除商品 "${product.name || '未命名商品'}" 吗？`)) {
      deleteProduct(product.id);
    }
  };

  // 计算平均利润率
  const avgMargin = product.variants.length > 0
    ? product.variants.reduce((sum, v) => sum + v.calculated.actualMargin, 0) / product.variants.length
    : 0;

  // 格式化链接显示
  const formatUrl = (url: string) => {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + '/...';
    } catch {
      return url.length > 25 ? url.substring(0, 25) + '...' : url;
    }
  };

  return (
    <TooltipProvider>
      <Card className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        {/* 卡片头部 */}
        <CardHeader className="p-3 md:p-4 pb-0">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 md:gap-4">
            {/* 左侧：商品名称和链接 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-4 w-4 text-blue-500 flex-shrink-0" />
                
                {isEditingName ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      ref={nameInputRef}
                      value={localName}
                      onChange={(e) => setLocalName(e.target.value)}
                      onBlur={handleSaveName}
                      onKeyDown={handleKeyDown}
                      className="h-8 text-sm"
                      placeholder="输入商品名称"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSaveName}
                      className="h-8 w-8 p-0"
                    >
                      <Check className="h-4 w-4 text-emerald-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelName}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4 text-slate-400" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <h3 
                      className="text-sm md:text-base font-semibold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors truncate"
                      onClick={() => setIsEditingName(true)}
                    >
                      {product.name || '未命名商品'}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingName(true)}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <Edit2 className="h-3 w-3 text-slate-400" />
                    </Button>
                  </div>
                )}
              </div>

              {/* 链接 */}
              {product.url && (
                <div className="flex items-center gap-1 text-xs text-slate-500 ml-6">
                  <Link2 className="h-3 w-3 flex-shrink-0" />
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 hover:underline truncate max-w-[200px] md:max-w-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {formatUrl(product.url)}
                  </a>
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </div>
              )}
            </div>

            {/* 右侧：汇总信息和操作 */}
            <div className="flex items-center justify-between md:justify-end gap-2 md:gap-4">
              {/* 汇总信息 - 移动端简化 */}
              <div className="flex items-center gap-3 md:gap-4 text-xs">
                <div className="flex items-center gap-1 md:text-center">
                  <Layers className="h-3 w-3 md:hidden text-slate-400" />
                  <span className="text-slate-400 md:hidden">SKU:</span>
                  <span className="font-medium text-slate-700">{product.summary.skuCount}</span>
                </div>
                <div className="hidden md:block text-center">
                  <div className="text-slate-400">退货率</div>
                  <div className="font-medium text-slate-700">
                    {formatPercent(product.summary.avgReturnRate)}
                  </div>
                </div>
                <div className="flex items-center gap-1 md:text-center">
                  <TrendingUp className="h-3 w-3 md:hidden text-slate-400" />
                  <span className="text-slate-400 md:hidden">利润:</span>
                  <span 
                    className="font-medium"
                    style={{ color: getMarginColor(avgMargin) }}
                  >
                    {formatPercent(avgMargin)}
                  </span>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDelete}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">删除商品</p>
                  </TooltipContent>
                </Tooltip>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleProductExpand(product.id)}
                  className="h-8 w-8 p-0"
                >
                  {product.isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* 利润区间 - 桌面端显示 */}
          {product.isExpanded && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500">成本:</span>
              <span className="font-medium text-slate-700">
                {formatCurrency(product.summary.costRange[0])} ~ {formatCurrency(product.summary.costRange[1])}
              </span>
              <span className="text-slate-300 mx-1">|</span>
              <span className="text-slate-500">售价:</span>
              <span className="font-medium text-slate-700">
                {formatCurrency(product.summary.priceRange[0])} ~ {formatCurrency(product.summary.priceRange[1])}
              </span>
              <span className="text-slate-300 mx-1">|</span>
              <span className="text-slate-500">毛利:</span>
              <span className="font-medium text-slate-700">
                {formatCurrency(product.summary.profitRange[0])} ~ {formatCurrency(product.summary.profitRange[1])}
              </span>
              {product.summary.profitRange[0] < 0 && (
                <Badge variant="destructive" className="text-xs h-5 ml-2">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  存在亏损SKU
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        {/* SKU表格 */}
        {product.isExpanded && (
          <CardContent className="p-3 md:p-4 pt-2 md:pt-3">
            <SKUTable productId={product.id} skus={product.variants} />
          </CardContent>
        )}
      </Card>
    </TooltipProvider>
  );
}
