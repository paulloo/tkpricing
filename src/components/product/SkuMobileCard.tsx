// SKU 卡片（移动端）

import type { ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import type { UpdateSkuInput } from '@/domain/contracts';
import type { CalculatedSku } from '@/domain/pricing/portfolio';
import type { ShopConfig } from '@/domain/shop-config';
import { cn } from '@/lib/utils';
import { formatMoney, formatPercent, marginLevel, MARGIN_BADGE_CLASS, MARGIN_TEXT_CLASS } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { EditableNumber, EditableText } from '@/components/fields/EditableCell';
import { PriceBreakdown } from './PriceBreakdown';
import { DimensionsCell, StrategyCell, WarningBadges } from './SkuCells';

interface SkuMobileCardProps {
  item: CalculatedSku;
  config: ShopConfig;
  canDelete: boolean;
  onPatch: (patch: UpdateSkuInput) => void;
  onDelete: () => void;
}

const Cell = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="bg-white px-2 py-1.5">
    <div className="mb-0.5 text-[10px] text-slate-400">{label}</div>
    {children}
  </div>
);

export function SkuMobileCard({ item, config, canDelete, onPatch, onDelete }: SkuMobileCardProps) {
  const { sku, calc } = item;
  const sale = config.currency.sale;
  const level = marginLevel(calc.atFinal.expectedMargin);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <EditableText ariaLabel="SKU 名称" value={sku.skuName} placeholder="未命名 SKU" onCommit={(skuName) => onPatch({ skuName })} />
        <div className="flex items-center gap-1">
          <StrategyCell sku={sku} config={config} onChange={onPatch} />
          <Button variant="ghost" size="sm" disabled={!canDelete} onClick={onDelete} className="h-6 w-6 p-0 text-slate-300 hover:text-red-500" aria-label="删除 SKU">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px border-b border-slate-200 bg-slate-100">
        <Cell label={`采购 ${config.currency.cost}`}><EditableNumber ariaLabel="采购价" value={sku.purchaseCost} onCommit={(v) => onPatch({ purchaseCost: v ?? 0 })} /></Cell>
        <Cell label="国内运费"><EditableNumber ariaLabel="国内运费" value={sku.domesticShipping} onCommit={(v) => onPatch({ domesticShipping: v ?? 0 })} /></Cell>
        <Cell label="包装"><EditableNumber ariaLabel="包装费" value={sku.packagingFee} onCommit={(v) => onPatch({ packagingFee: v ?? 0 })} /></Cell>
        <Cell label="重量 kg"><EditableNumber ariaLabel="重量" value={sku.weightKg} onCommit={(v) => onPatch({ weightKg: v ?? 0 })} /></Cell>
        <Cell label="尺寸 cm"><DimensionsCell sku={sku} onCommit={onPatch} /></Cell>
        <Cell label="退货率">
          <EditableNumber ariaLabel="退货率" percent nullable value={sku.returnRate} placeholder={formatPercent(config.returns.rate)} onCommit={(returnRate) => onPatch({ returnRate })} />
        </Cell>
      </div>

      <div className="grid grid-cols-2 gap-px bg-slate-100">
        <div className="bg-white px-3 py-2">
          <div className="text-[10px] text-slate-400">建议价 / 最终价</div>
          <div className="text-xs font-medium text-emerald-700">{formatMoney(calc.suggestedPrice, sale)}</div>
          <EditableNumber
            ariaLabel="最终价"
            nullable
            value={sku.finalPrice}
            placeholder="使用建议价"
            format={(v) => formatMoney(v, sale)}
            highlight={calc.isManualPrice}
            onCommit={(finalPrice) => onPatch({ finalPrice })}
            className="text-left"
          />
        </div>
        <PriceBreakdown calc={calc} config={config}>
          <button type="button" className="bg-white px-3 py-2 text-left" aria-label="查看利润拆解">
            <div className="text-[10px] text-slate-400">期望净利（点击查看拆解）</div>
            <div className={cn('text-sm font-bold', MARGIN_TEXT_CLASS[level])}>{formatMoney(calc.atFinal.expectedProfit, sale)}</div>
            <span className={cn('rounded border px-1 text-[10px]', MARGIN_BADGE_CLASS[level])}>{formatPercent(calc.atFinal.expectedMargin)}</span>
            <span className="ml-1 text-[10px] text-slate-400">可让利 {formatPercent(calc.maxDiscount, 0)}</span>
          </button>
        </PriceBreakdown>
      </div>

      {calc.warnings.length > 0 && (
        <div className="border-t border-slate-100 px-3 py-1.5">
          <WarningBadges warnings={calc.warnings} />
        </div>
      )}
    </div>
  );
}
