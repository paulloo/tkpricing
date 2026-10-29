// 单个 SKU 的利润拆解：成本 → 费用 → 送达利润 → 退货 → 期望净利，及价格阶梯与让利空间

import type { ReactNode } from 'react';
import type { SkuCalculation } from '@/domain/pricing/calculate';
import { FX_STRESS } from '@/domain/pricing/calculate';
import type { ShopConfig } from '@/domain/shop-config';
import { cn } from '@/lib/utils';
import { formatMoney, formatPercent, marginLevel, MARGIN_TEXT_CLASS } from '@/lib/format';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { STRATEGY_LABELS, WARNING_LABELS } from './labels';

interface PriceBreakdownProps {
  calc: SkuCalculation;
  config: ShopConfig;
  children: ReactNode;
}

function Row({ label, value, strong, muted }: { label: ReactNode; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={cn('flex justify-between gap-4', muted && 'text-slate-400', strong && 'font-semibold text-slate-800')}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

const Title = ({ children }: { children: ReactNode }) => (
  <div className="mb-1 mt-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 first:mt-0">{children}</div>
);

export function PriceBreakdown({ calc, config, children }: PriceBreakdownProps) {
  const sale = config.currency.sale;
  const cost = config.currency.cost;
  const m = (v: number | null) => formatMoney(v, sale);
  const e = calc.atFinal;

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" className="max-h-[70vh] w-80 overflow-y-auto p-3 text-xs text-slate-600">
        <Title>成本</Title>
        <Row label="货值（采购+国内+包装）" value={formatMoney(calc.cost.goodsCost, cost)} />
        <Row
          label={`头程（计费重 ${calc.cost.chargeableWeightKg.toFixed(2)}kg${calc.cost.volumetricWeightKg > 0 ? `，体积重 ${calc.cost.volumetricWeightKg.toFixed(2)}kg` : ''}）`}
          value={formatMoney(calc.cost.firstLegCost, cost)}
        />
        <Row label="到岸成本" value={m(calc.cost.landedCost)} />
        <Row label="尾程运费" value={m(calc.cost.lastMileCost)} />
        <Row label="单件成本" value={m(calc.unitCost)} strong />

        <Title>按最终价 {m(calc.finalPrice)} 卖出</Title>
        {e.fees.map((f) => (
          <Row key={f.id} label={f.label} value={`-${m(f.amount)}`} />
        ))}
        <Row label="达人佣金" value={`-${m(e.affiliateCost)}`} />
        <Row label="广告费" value={`-${m(e.adsCost)}`} />
        <Row label="送达订单利润" value={m(e.deliveredProfit)} strong />

        <Title>退货（{formatPercent(e.returnRate)}）</Title>
        <Row label="每笔退货损失" value={`-${m(e.returnedLoss)}`} />
        <Row label="期望净利（每单）" value={m(e.expectedProfit)} strong />
        <Row
          label="期望净利率"
          value={formatPercent(e.expectedMargin)}
          strong
        />

        <Title>价格阶梯（{STRATEGY_LABELS[calc.strategy]}目标 {formatPercent(calc.targetMargin)}）</Title>
        <Row label="保本价" value={m(calc.breakEvenPrice)} />
        <Row label={`引流款 ${formatPercent(config.pricing.targetMargins.drainage)}`} value={m(calc.ladder.drainage)} />
        <Row label={`利润款 ${formatPercent(config.pricing.targetMargins.profit)}`} value={m(calc.ladder.profit)} />
        <Row label={`锚定款 ${formatPercent(config.pricing.targetMargins.anchor)}`} value={m(calc.ladder.anchor)} />

        <Title>活动与风险</Title>
        <Row label="最多可让利（不亏）" value={formatPercent(calc.maxDiscount)} />
        <Row label="活动底价" value={m(calc.breakEvenPrice)} />
        <div className="flex justify-between gap-4">
          <span>{cost} 升值 {formatPercent(FX_STRESS, 0)} 时净利率</span>
          <span className={cn('tabular-nums', MARGIN_TEXT_CLASS[marginLevel(calc.fxStressMargin)])}>
            {formatPercent(calc.fxStressMargin)}
          </span>
        </div>
        {calc.atCurrent && (
          <Row label={`现价 ${m(calc.atCurrent.price)} 的净利率`} value={formatPercent(calc.atCurrent.expectedMargin)} />
        )}

        {calc.warnings.length > 0 && (
          <ul className="mt-2.5 space-y-0.5 rounded bg-amber-50 p-2 text-[11px] text-amber-800">
            {calc.warnings.map((w) => (
              <li key={w}>· {WARNING_LABELS[w].hint}</li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
