// 店铺汇总条：利润率与需要处理的 SKU 数

import type { ReactNode } from 'react';
import { AlertTriangle, Box, Layers, Package, Target, TrendingDown } from 'lucide-react';
import type { PortfolioStats } from '@/domain/pricing/portfolio';
import { cn } from '@/lib/utils';
import { formatPercent, marginLevel, MARGIN_TEXT_CLASS } from '@/lib/format';

function Stat({ icon, label, value, className }: { icon: ReactNode; label: string; value: string | number; className?: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5">
      <span className="shrink-0 text-slate-400">{icon}</span>
      <span className="hidden whitespace-nowrap text-[11px] text-slate-400 sm:inline">{label}</span>
      <span className={cn('whitespace-nowrap text-xs font-semibold', className)}>{value}</span>
    </div>
  );
}

export function SummaryBar({ stats }: { stats: PortfolioStats }) {
  if (stats.productCount === 0) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center divide-x divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-700">
      <Stat icon={<Package className="h-3.5 w-3.5" />} label="商品" value={stats.productCount} />
      <Stat icon={<Layers className="h-3.5 w-3.5" />} label="SKU" value={stats.skuCount} />
      <Stat icon={<Target className="h-3.5 w-3.5" />} label="期望净利率" value={formatPercent(stats.margin)} className={MARGIN_TEXT_CLASS[marginLevel(stats.margin)]} />
      {stats.lossSkuCount > 0 && <Stat icon={<TrendingDown className="h-3.5 w-3.5 text-red-500" />} label="亏损" value={`${stats.lossSkuCount} 个`} className="text-red-600" />}
      {stats.currentPriceLossSkuCount > 0 && <Stat icon={<AlertTriangle className="h-3.5 w-3.5 text-red-500" />} label="现价亏损" value={`${stats.currentPriceLossSkuCount} 个`} className="text-red-600" />}
      {stats.belowTargetSkuCount > 0 && <Stat icon={<AlertTriangle className="h-3.5 w-3.5 text-amber-500" />} label="低于目标" value={`${stats.belowTargetSkuCount} 个`} className="text-amber-600" />}
      {stats.volumetricSkuCount > 0 && <Stat icon={<Box className="h-3.5 w-3.5 text-amber-500" />} label="抛货" value={`${stats.volumetricSkuCount} 个`} className="text-amber-600" />}
    </div>
  );
}
