// ============================================
// Dashboard 汇总条 — 紧凑单行
// ============================================

import { Package, Layers, TrendingUp, Target, AlertTriangle, DollarSign } from 'lucide-react';
import { formatPercent, formatCurrency } from '@/lib/calculator';
import type { SummaryStats } from '@/types';

interface SummaryCardsProps {
  stats: SummaryStats;
}

function Stat({
  icon,
  label,
  value,
  valueClass = '',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5">
      <span className="text-slate-400 shrink-0">{icon}</span>
      <span className="text-[11px] text-slate-400 whitespace-nowrap hidden sm:inline">{label}</span>
      <span className={`text-xs font-semibold whitespace-nowrap ${valueClass}`}>{value}</span>
    </div>
  );
}

export function SummaryCards({ stats }: SummaryCardsProps) {
  const { productCount, skuCount, avgProfitMargin, avgActualMargin, highRiskSkuCount, totalInventoryValue } = stats;

  const marginClass =
    avgActualMargin >= 0.2 ? 'text-emerald-600' : avgActualMargin >= 0.1 ? 'text-amber-600' : 'text-red-500';

  if (productCount === 0) return null;

  return (
    <div className="flex items-center flex-wrap gap-0 bg-white border border-slate-200 rounded-lg overflow-hidden divide-x divide-slate-100 mb-3 text-slate-700">
      <Stat icon={<Package className="h-3.5 w-3.5" />} label="商品" value={productCount} />
      <Stat icon={<Layers className="h-3.5 w-3.5" />} label="SKU" value={skuCount} />
      <Stat
        icon={<TrendingUp className="h-3.5 w-3.5" />}
        label="理论利润率"
        value={formatPercent(avgProfitMargin)}
        valueClass="text-slate-600"
      />
      <Stat
        icon={<Target className="h-3.5 w-3.5" />}
        label="实际利润率"
        value={formatPercent(avgActualMargin)}
        valueClass={marginClass}
      />
      <Stat
        icon={<DollarSign className="h-3.5 w-3.5" />}
        label="库存估值"
        value={formatCurrency(totalInventoryValue)}
        valueClass="text-slate-600"
      />
      {highRiskSkuCount > 0 && (
        <Stat
          icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
          label="高风险SKU"
          value={`${highRiskSkuCount} 个`}
          valueClass="text-amber-600"
        />
      )}
    </div>
  );
}
