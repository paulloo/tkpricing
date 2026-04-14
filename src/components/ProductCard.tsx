// ============================================
// 商品卡片 — ERP 风格
// ============================================

import { useState, useRef, useEffect } from 'react';
import type { SKUData } from '@/types';
import { useStore } from '@/store/useStore';
import { SKUTable } from './SKUTable';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { formatCurrency, formatPercent, getMarginColor } from '@/lib/calculator';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    url: string;
    imageUrl?: string;
    isExpanded: boolean;
    variants: SKUData[];
    summary: {
      skuCount: number;
      avgReturnRate: number;
      profitRange: [number, number];
      costRange: [number, number];
      priceRange: [number, number];
    };
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const { toggleProductExpand, updateProduct, deleteProduct } = useStore();
  const [editingName, setEditingName] = useState(false);
  const [localName, setLocalName] = useState(product.name);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalName(product.name);
  }, [product.name]);

  useEffect(() => {
    if (editingName) nameRef.current?.focus();
  }, [editingName]);

  const saveName = () => {
    if (localName.trim() !== product.name) {
      updateProduct(product.id, { name: localName.trim() });
    }
    setEditingName(false);
  };

  const cancelName = () => {
    setLocalName(product.name);
    setEditingName(false);
  };

  const handleDelete = () => {
    if (confirm(`删除商品「${product.name || '未命名'}」？此操作不可撤销。`)) {
      deleteProduct(product.id);
    }
  };

  const avgMargin =
    product.variants.length > 0
      ? product.variants.reduce((s, v) => s + v.calculated.actualMargin, 0) / product.variants.length
      : 0;

  const hasLoss = product.summary.profitRange[0] < 0;
  const allProfitable = product.variants.every((v) => v.calculated.isProfitable);

  const formatUrl = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url.slice(0, 30);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
      {/* ── Header row ────────────────────────────────────── */}
      <div className="flex items-stretch min-h-[3rem]">
        {/* Expand toggle */}
        <button
          onClick={() => toggleProductExpand(product.id)}
          className="flex items-center justify-center w-10 shrink-0 bg-slate-50 hover:bg-slate-100 border-r border-slate-200 transition-colors"
        >
          {product.isExpanded ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </button>

        {/* 商品主图 */}
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt=""
            loading="lazy"
            className="w-10 h-10 md:w-12 md:h-12 object-cover shrink-0 border-r border-slate-100"
          />
        ) : null}

        {/* Product name + url */}
        <div className="flex-1 min-w-0 px-3 py-2 flex flex-col justify-center">
          {editingName ? (
            <Input
              ref={nameRef}
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveName();
                if (e.key === 'Escape') cancelName();
              }}
              className="h-7 text-sm font-semibold max-w-xs"
            />
          ) : (
            <span
              className="text-sm font-semibold text-slate-800 cursor-pointer hover:text-blue-600 truncate leading-tight"
              onClick={() => setEditingName(true)}
              title="点击编辑名称"
            >
              {product.name || '未命名商品'}
            </span>
          )}
          {product.url && (
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-500 mt-0.5 w-fit"
              onClick={(e) => e.stopPropagation()}
            >
              {formatUrl(product.url)}
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>

        {/* Metrics strip (desktop) */}
        <div className="hidden md:flex items-center divide-x divide-slate-100 border-l border-slate-100">
          <MetricCell label="SKU 数" value={String(product.summary.skuCount)} />
          <MetricCell
            label="成本区间"
            value={
              product.summary.costRange[0] === product.summary.costRange[1]
                ? formatCurrency(product.summary.costRange[0])
                : `${formatCurrency(product.summary.costRange[0])} ~ ${formatCurrency(product.summary.costRange[1])}`
            }
          />
          <MetricCell
            label="售价区间"
            value={
              product.summary.priceRange[0] === product.summary.priceRange[1]
                ? formatCurrency(product.summary.priceRange[0])
                : `${formatCurrency(product.summary.priceRange[0])} ~ ${formatCurrency(product.summary.priceRange[1])}`
            }
          />
          <MetricCell
            label="均实际利润率"
            value={formatPercent(avgMargin)}
            valueStyle={{ color: getMarginColor(avgMargin) }}
          />
        </div>

        {/* Status + actions */}
        <div className="flex items-center gap-1 px-2 border-l border-slate-100 shrink-0">
          {hasLoss ? (
            <Badge variant="destructive" className="text-[10px] h-5 px-1.5 gap-0.5">
              <AlertTriangle className="h-3 w-3" />
              亏损
            </Badge>
          ) : allProfitable ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="h-7 w-7 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Mobile metrics row */}
      {product.variants.length > 0 && (
        <div className="md:hidden flex divide-x divide-slate-100 border-t border-slate-100 bg-slate-50 text-center">
          <div className="flex-1 py-1">
            <div className="text-[10px] text-slate-400">SKU</div>
            <div className="text-xs font-semibold text-slate-700">{product.summary.skuCount}</div>
          </div>
          <div className="flex-1 py-1">
            <div className="text-[10px] text-slate-400">成本</div>
            <div className="text-xs font-semibold text-slate-700">
              {formatCurrency(product.summary.costRange[0])}
            </div>
          </div>
          <div className="flex-1 py-1">
            <div className="text-[10px] text-slate-400">售价</div>
            <div className="text-xs font-semibold text-slate-700">
              {formatCurrency(product.summary.priceRange[0])}
            </div>
          </div>
          <div className="flex-1 py-1">
            <div className="text-[10px] text-slate-400">利润率</div>
            <div className="text-xs font-semibold" style={{ color: getMarginColor(avgMargin) }}>
              {formatPercent(avgMargin)}
            </div>
          </div>
        </div>
      )}

      {/* SKU Table */}
      {product.isExpanded && (
        <div className="border-t border-slate-200">
          <SKUTable productId={product.id} skus={product.variants} />
        </div>
      )}
    </div>
  );
}

function MetricCell({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div className="px-4 py-2 text-center min-w-[90px]">
      <div className="text-[10px] text-slate-400 whitespace-nowrap">{label}</div>
      <div className="text-xs font-semibold text-slate-800 mt-0.5 whitespace-nowrap" style={valueStyle}>
        {value}
      </div>
    </div>
  );
}
