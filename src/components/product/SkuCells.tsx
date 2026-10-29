// SKU 表格中的复合单元格：尺寸、策略、预警

import { useState } from 'react';
import type { SkuDTO } from '@/domain/contracts';
import type { PricingWarning } from '@/domain/pricing/calculate';
import type { PricingStrategy, ShopConfig } from '@/domain/shop-config';
import { cn } from '@/lib/utils';
import { formatPercent } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EditableNumber } from '@/components/fields/EditableCell';
import { STRATEGY_LABELS, WARNING_LABELS } from './labels';
import { formatDimensions, parseDimensions, type Dims } from './parse-dimensions';

export function DimensionsCell({ sku, onCommit }: { sku: SkuDTO; onCommit: (dims: Dims) => void }) {
  const current = formatDimensions(sku);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  const startEditing = () => {
    setText(current);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    const parsed = parseDimensions(text);
    if (parsed && formatDimensions(parsed) !== current) onCommit(parsed);
  };

  if (editing) {
    return (
      <Input
        autoFocus
        aria-label="包裹尺寸 长×宽×高 cm"
        placeholder="长x宽x高"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="h-6 w-24 px-1.5 text-xs"
      />
    );
  }

  return (
    <button
      type="button"
      aria-label="编辑包裹尺寸"
      onClick={startEditing}
      className={cn('whitespace-nowrap rounded px-1.5 py-0.5 text-xs hover:bg-amber-50 hover:ring-1 hover:ring-amber-200', !current && 'text-slate-300')}
    >
      {current || '长×宽×高'}
    </button>
  );
}

interface StrategyCellProps {
  sku: SkuDTO;
  config: ShopConfig;
  onChange: (patch: { pricingStrategy: PricingStrategy | null; customMargin?: number | null }) => void;
}

export function StrategyCell({ sku, config, onChange }: StrategyCellProps) {
  const inherited = STRATEGY_LABELS[config.pricing.defaultStrategy];
  return (
    <div className="flex items-center gap-1">
      <select
        aria-label="定价策略"
        value={sku.pricingStrategy ?? ''}
        onChange={(e) => {
          const value = (e.target.value || null) as PricingStrategy | null;
          onChange(
            value === 'custom'
              ? { pricingStrategy: value, customMargin: sku.customMargin ?? config.pricing.targetMargins.profit }
              : { pricingStrategy: value },
          );
        }}
        className="h-6 rounded border-0 bg-transparent px-0.5 text-[11px] hover:bg-slate-100"
      >
        <option value="">默认（{inherited}）</option>
        {(Object.keys(STRATEGY_LABELS) as PricingStrategy[]).map((s) => (
          <option key={s} value={s}>
            {STRATEGY_LABELS[s]}
          </option>
        ))}
      </select>
      {sku.pricingStrategy === 'custom' && (
        <EditableNumber
          ariaLabel="自定义目标净利率"
          percent
          min={-1}
          value={sku.customMargin}
          format={(v) => formatPercent(v)}
          onCommit={(v) => onChange({ pricingStrategy: 'custom', customMargin: v })}
          className="w-14"
        />
      )}
    </div>
  );
}

const TONE_CLASS = {
  red: 'bg-red-50 text-red-600 border-red-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  slate: 'bg-slate-50 text-slate-500 border-slate-200',
} as const;

export function WarningBadges({ warnings }: { warnings: PricingWarning[] }) {
  if (warnings.length === 0) return <span className="text-[10px] text-slate-300">—</span>;
  return (
    <div className="flex flex-wrap justify-end gap-0.5">
      {warnings.map((w) => (
        <Tooltip key={w}>
          <TooltipTrigger asChild>
            <span className={cn('cursor-help whitespace-nowrap rounded border px-1 text-[10px] leading-4', TONE_CLASS[WARNING_LABELS[w].tone])}>
              {WARNING_LABELS[w].label}
            </span>
          </TooltipTrigger>
          <TooltipContent>{WARNING_LABELS[w].hint}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
