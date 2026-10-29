// 平台费用行编辑：每行可设置比例/固定、封顶、价格阈值、退货是否退还

import { Plus, Trash2 } from 'lucide-react';
import type { FeeLine } from '@/domain/shop-config';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { NumberField } from '@/components/fields/NumberField';

interface FeeLinesEditorProps {
  fees: FeeLine[];
  currency: string;
  onChange: (fees: FeeLine[]) => void;
}

const MAX_FEE_LINES = 30;

function newFeeLine(existing: FeeLine[]): FeeLine {
  const ids = new Set(existing.map((f) => f.id));
  let n = existing.length + 1;
  while (ids.has(`custom-${n}`)) n++;
  return {
    id: `custom-${n}`,
    label: '新费用',
    kind: 'percent',
    value: 0,
    cap: null,
    maxPrice: null,
    refundOnReturn: true,
    enabled: true,
    note: '',
  };
}

export function FeeLinesEditor({ fees, currency, onChange }: FeeLinesEditorProps) {
  const update = (index: number, patch: Partial<FeeLine>) =>
    onChange(fees.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  const remove = (index: number) => onChange(fees.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      {fees.map((fee, i) => (
        <div
          key={fee.id}
          className={cn('space-y-2 rounded-md border border-slate-200 p-2', !fee.enabled && 'bg-slate-50 opacity-70')}
        >
          <div className="flex items-center gap-2">
            <Switch
              checked={fee.enabled}
              onCheckedChange={(enabled) => update(i, { enabled })}
              aria-label={`启用 ${fee.label}`}
            />
            <Input
              value={fee.label}
              maxLength={40}
              onChange={(e) => update(i, { label: e.target.value })}
              onBlur={(e) => !e.target.value.trim() && update(i, { label: '未命名费用' })}
              className="h-7 flex-1 text-xs font-medium"
              aria-label="费用名称"
            />
            <select
              value={fee.kind}
              onChange={(e) => update(i, { kind: e.target.value as FeeLine['kind'] })}
              className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs"
              aria-label="收费方式"
            >
              <option value="percent">按售价%</option>
              <option value="fixed">每单固定</option>
            </select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => remove(i)}
              className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
              aria-label={`删除 ${fee.label}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <NumberField
              label={fee.kind === 'percent' ? '费率' : '金额'}
              value={fee.value}
              percent={fee.kind === 'percent'}
              max={fee.kind === 'percent' ? 1 : undefined}
              suffix={currency}
              onChange={(v) => update(i, { value: v ?? 0 })}
            />
            <NumberField
              label="单笔封顶"
              value={fee.cap}
              nullable
              suffix={currency}
              placeholder="不封顶"
              onChange={(cap) => update(i, { cap })}
            />
            <NumberField
              label="售价 ≤ 才收"
              value={fee.maxPrice}
              nullable
              suffix={currency}
              placeholder="不限"
              onChange={(maxPrice) => update(i, { maxPrice })}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Switch
                checked={fee.refundOnReturn}
                onCheckedChange={(refundOnReturn) => update(i, { refundOnReturn })}
                aria-label="退货时退还"
              />
              退货时平台退还
            </label>
          </div>
          {fee.note && <p className="text-[10px] leading-tight text-slate-400">{fee.note}</p>}
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        disabled={fees.length >= MAX_FEE_LINES}
        onClick={() => onChange([...fees, newFeeLine(fees)])}
        className="h-7 w-full border-dashed text-xs text-slate-500"
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        添加费用项
      </Button>
    </div>
  );
}
