// ============================================
// 汇总统计卡片组件 (优化版)
// ============================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Layers, 
  TrendingUp, 
  DollarSign,
  Target
} from 'lucide-react';
import { formatPercent, formatCurrency } from '@/lib/calculator';
import type { SummaryStats } from '@/types';

interface SummaryCardsProps {
  stats: SummaryStats;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
  badge?: string;
}

function StatCard({ title, value, subtitle, icon, color = 'blue', badge }: StatCardProps) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };

  const iconColorMap: Record<string, string> = {
    blue: 'text-blue-500',
    emerald: 'text-emerald-500',
    amber: 'text-amber-500',
    rose: 'text-rose-500',
    slate: 'text-slate-500',
    purple: 'text-purple-500',
  };

  return (
    <Card className={`border ${colorMap[color]} overflow-hidden`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 p-3 md:p-4">
        <CardTitle className="text-xs md:text-sm font-medium">{title}</CardTitle>
        <div className={`${iconColorMap[color]}`}>{icon}</div>
      </CardHeader>
      <CardContent className="p-3 md:p-4 pt-0">
        <div className="flex items-baseline gap-2">
          <div className="text-lg md:text-2xl font-bold">{value}</div>
          {badge && (
            <Badge variant="outline" className="text-[10px] md:text-xs">
              {badge}
            </Badge>
          )}
        </div>
        {subtitle && (
          <p className="text-[10px] md:text-xs text-slate-500 mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function SummaryCards({ stats }: SummaryCardsProps) {
  const { 
    productCount, 
    skuCount, 
    avgProfitMargin, 
    avgActualMargin, 
    highRiskSkuCount,
    totalInventoryValue 
  } = stats;

  // 根据平均利润率确定颜色
  const getMarginColorName = (): string => {
    if (avgActualMargin >= 0.2) return 'emerald';
    if (avgActualMargin >= 0.1) return 'amber';
    return 'rose';
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4">
      {/* 商品总数 */}
      <StatCard
        title="商品总数"
        value={productCount}
        subtitle="管理的商品数量"
        icon={<Package className="h-3 w-3 md:h-4 md:w-4" />}
        color="blue"
        badge={productCount > 0 ? '活跃' : '空'}
      />

      {/* SKU 总数 */}
      <StatCard
        title="SKU 总数"
        value={skuCount}
        subtitle="所有商品变体合计"
        icon={<Layers className="h-3 w-3 md:h-4 md:w-4" />}
        color="slate"
        badge={`${productCount > 0 ? (skuCount / productCount).toFixed(1) : 0}/商品`}
      />

      {/* 理论利润率 */}
      <StatCard
        title="理论利润率"
        value={formatPercent(avgProfitMargin)}
        subtitle="未扣除退货的理论利润"
        icon={<TrendingUp className="h-3 w-3 md:h-4 md:w-4" />}
        color="purple"
      />

      {/* 实际利润率 */}
      <StatCard
        title="实际利润率"
        value={formatPercent(avgActualMargin)}
        subtitle="扣除退货后的真实利润"
        icon={<Target className="h-3 w-3 md:h-4 md:w-4" />}
        color={getMarginColorName()}
        badge={avgActualMargin >= 0.2 ? '良好' : avgActualMargin >= 0.1 ? '一般' : '偏低'}
      />

      {/* 库存总价值 */}
      <StatCard
        title="库存总价值"
        value={formatCurrency(totalInventoryValue)}
        subtitle={`${highRiskSkuCount > 0 ? `${highRiskSkuCount}个SKU需关注` : '全部健康'}`}
        icon={<DollarSign className="h-3 w-3 md:h-4 md:w-4" />}
        color={highRiskSkuCount > 0 ? 'rose' : 'emerald'}
        badge={highRiskSkuCount > 0 ? '有风险' : '健康'}
      />
    </div>
  );
}
