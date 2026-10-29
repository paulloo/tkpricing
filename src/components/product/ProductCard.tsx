// 商品卡片：名称、类目、商品级佣金、汇总指标 + SKU 表格

import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, ExternalLink, Trash2 } from 'lucide-react';
import { COMMISSION_FEE_ID } from '@/domain/pricing/fees';
import type { CalculatedProduct } from '@/domain/pricing/portfolio';
import type { ShopConfig } from '@/domain/shop-config';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { formatMoney, formatPercent, marginLevel, MARGIN_TEXT_CLASS } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EditableNumber, EditableText } from '@/components/fields/EditableCell';
import { SkuTable } from './SkuTable';

interface ProductCardProps {
  item: CalculatedProduct;
  config: ShopConfig;
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.slice(0, 30);
  }
}

function Metric({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-[88px] px-3 py-2 text-center">
      <div className="whitespace-nowrap text-[10px] text-slate-400">{label}</div>
      <div className={cn('mt-0.5 whitespace-nowrap text-xs font-semibold text-slate-800', className)}>{value}</div>
    </div>
  );
}

export function ProductCard({ item, config }: ProductCardProps) {
  const { updateProduct, deleteProduct, setExpanded } = useStore();
  const { product, summary } = item;
  const sale = config.currency.sale;
  const shopCommission = config.fees.find((f) => f.id === COMMISSION_FEE_ID);
  const level = marginLevel(summary.margin);
  const span = ([lo, hi]: [number, number]) => (lo === hi ? formatMoney(lo, sale) : `${formatMoney(lo, sale)} ~ ${formatMoney(hi, sale)}`);

  const handleDelete = () => {
    if (window.confirm(`删除商品「${product.name || '未命名'}」及其全部 SKU？此操作不可撤销。`)) {
      deleteProduct(product.id);
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-[3rem] items-stretch">
        <button
          type="button"
          onClick={() => setExpanded(product.id, !product.isExpanded)}
          className="flex w-10 shrink-0 items-center justify-center border-r border-slate-200 bg-slate-50 hover:bg-slate-100"
          aria-label={product.isExpanded ? '折叠' : '展开'}
          aria-expanded={product.isExpanded}
        >
          {product.isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        </button>

        {product.imageUrl && (
          <img src={product.imageUrl} alt="" loading="lazy" className="h-12 w-12 shrink-0 border-r border-slate-100 object-cover" />
        )}

        <div className="flex min-w-0 flex-1 flex-col justify-center px-2 py-1.5">
          <EditableText
            ariaLabel="商品名称"
            value={product.name}
            placeholder="未命名商品"
            onCommit={(name) => updateProduct(product.id, { name })}
            className="text-sm font-semibold text-slate-800"
          />
          <div className="flex flex-wrap items-center gap-x-2 px-1.5 text-[11px] text-slate-400">
            <span className="flex items-center gap-0.5">
              类目
              <EditableText
                ariaLabel="类目"
                value={product.category ?? ''}
                placeholder="未设置"
                onCommit={(category) => updateProduct(product.id, { category: category || null })}
                className="text-[11px]"
              />
            </span>
            <span className="flex items-center gap-0.5">
              佣金
              <EditableNumber
                ariaLabel="商品佣金率（留空继承店铺）"
                percent
                nullable
                value={product.commissionRate}
                placeholder={`继承 ${formatPercent(shopCommission?.value ?? 0, 2)}`}
                format={(v) => formatPercent(v, 2)}
                onCommit={(commissionRate) => updateProduct(product.id, { commissionRate })}
                className="w-auto text-[11px]"
              />
            </span>
            {product.url && (
              <a href={product.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 hover:text-blue-500">
                {hostname(product.url)}
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>
        </div>

        <div className="hidden items-center divide-x divide-slate-100 border-l border-slate-100 lg:flex">
          <Metric label="SKU" value={String(summary.skuCount)} />
          <Metric label="单件成本" value={span(summary.costRange)} />
          <Metric label="售价" value={span(summary.priceRange)} />
          <Metric label="期望净利率" value={formatPercent(summary.margin)} className={MARGIN_TEXT_CLASS[level]} />
        </div>

        <div className="flex shrink-0 items-center gap-1 border-l border-slate-100 px-2">
          {summary.hasLoss ? (
            <Badge variant="destructive" className="h-5 gap-0.5 px-1.5 text-[10px]">
              <AlertTriangle className="h-3 w-3" />
              亏损
            </Badge>
          ) : summary.skuCount > 0 && summary.warningCount === 0 ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-label="无预警" />
          ) : null}
          <Button variant="ghost" size="sm" onClick={handleDelete} className="h-7 w-7 p-0 text-slate-300 hover:bg-red-50 hover:text-red-500" aria-label="删除商品">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex divide-x divide-slate-100 border-t border-slate-100 bg-slate-50 text-center lg:hidden">
        <Metric label="SKU" value={String(summary.skuCount)} />
        <Metric label="售价" value={formatMoney(summary.priceRange[0], sale)} />
        <Metric label="净利率" value={formatPercent(summary.margin)} className={MARGIN_TEXT_CLASS[level]} />
      </div>

      {product.isExpanded && (
        <div className="border-t border-slate-200">
          <SkuTable productId={product.id} skus={item.skus} config={config} />
        </div>
      )}
    </div>
  );
}
