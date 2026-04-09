// ============================================
// 全局参数面板 — Sheet 内嵌版
// ============================================

import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { calculateTotalDeductionRate, calculatePlatformRate, PRICING_STRATEGIES, formatPercent } from '@/lib/calculator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Settings2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Truck,
  Store,
  Target,
  Sparkles,
  Megaphone,
} from 'lucide-react';

// ─── ParamField ───────────────────────────────────────────────────────────────

interface ParamFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  min?: number;
  step?: number;
}

function ParamField({ label, value, onChange, suffix = '', min = 0, step = 0.01 }: ParamFieldProps) {
  const [local, setLocal] = useState(value?.toString() ?? '');

  // 同步外部 value 变化（DB 加载/重置后刷新输入框）
  useEffect(() => {
    setLocal(value?.toString() ?? '');
  }, [value]);

  const commit = () => {
    const n = parseFloat(local);
    if (!isNaN(n)) onChange(n);
    else setLocal(value?.toString() ?? '');
  };

  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-slate-500 font-normal">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          min={min}
          step={step}
          className="h-7 text-xs pr-7"
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
  defaultExpanded = true,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [open, setOpen] = useState(defaultExpanded);

  return (
    <div className="border border-slate-100 rounded-md overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-xs font-medium text-slate-700">{title}</span>
        </div>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        )}
      </button>
      {open && <div className="p-3 space-y-2.5 bg-white">{children}</div>}
    </div>
  );
}

// ─── StrategySelector ─────────────────────────────────────────────────────────

function StrategySelector() {
  const { globalParams, setGlobalParams } = useStore();
  const { pricingStrategy, customMultiplier } = globalParams;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        {PRICING_STRATEGIES.map((s) => (
          <button
            key={s.key}
            onClick={() => setGlobalParams({ pricingStrategy: s.key })}
            className={`p-2 rounded border text-left transition-all ${
              pricingStrategy === s.key
                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-400'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[11px] font-semibold" style={{ color: s.color }}>
                {s.name}
              </span>
              <Badge variant="outline" className="text-[10px] h-4 px-1 border-current" style={{ color: s.color }}>
                ×{s.key === 'custom' ? (customMultiplier ?? 1.5) : s.multiplier}
              </Badge>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">{s.description}</p>
          </button>
        ))}
      </div>
      {pricingStrategy === 'custom' && (
        <ParamField
          label="自定义倍数"
          value={customMultiplier ?? 1.5}
          onChange={(v) => setGlobalParams({ customMultiplier: v })}
          step={0.1}
          min={1}
        />
      )}
    </div>
  );
}

// ─── GlobalParamsPanel ────────────────────────────────────────────────────────

export function GlobalParamsPanel() {
  const { globalParams, setGlobalParams, resetGlobalParams } = useStore();
  const platformRate = calculatePlatformRate(globalParams);
  const totalRate = calculateTotalDeductionRate(globalParams);

  const rate = (key: keyof typeof globalParams, pct: number) =>
    setGlobalParams({ [key]: pct / 100 });

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold text-slate-800">全局参数</span>
        </div>
        <Button variant="ghost" size="sm" onClick={resetGlobalParams} className="h-7 text-xs text-slate-500">
          <RotateCcw className="h-3 w-3 mr-1" />
          重置默认
        </Button>
      </div>

      {/* Key rates summary bar */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50">
        <div className="px-3 py-2 text-center">
          <div className="text-[10px] text-slate-400 mb-0.5">平台扣费</div>
          <div className="text-sm font-bold text-red-600">{formatPercent(platformRate)}</div>
        </div>
        <div className="px-3 py-2 text-center">
          <div className="text-[10px] text-slate-400 mb-0.5">含目标利润</div>
          <div className="text-sm font-bold text-orange-500">{formatPercent(totalRate)}</div>
        </div>
        <div className="px-3 py-2 text-center">
          <div className="text-[10px] text-slate-400 mb-0.5">保本系数</div>
          <div className="text-sm font-bold text-blue-600">
            {(1 / (1 - Math.min(platformRate, 0.99))).toFixed(2)}×
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* 定价策略 */}
        <Section title="定价策略" icon={<Sparkles className="h-3.5 w-3.5 text-amber-500" />} defaultExpanded>
          <StrategySelector />
        </Section>

        {/* 汇率 & 物流 */}
        <Section title="汇率 & 物流" icon={<Truck className="h-3.5 w-3.5 text-blue-500" />} defaultExpanded={false}>
          <div className="grid grid-cols-2 gap-2">
            <ParamField
              label="汇率 RMB→MYR"
              value={globalParams.exchangeRate}
              onChange={(v) => setGlobalParams({ exchangeRate: v })}
              step={0.001}
            />
            <ParamField
              label="头程 ¥/kg"
              value={globalParams.shippingRate}
              onChange={(v) => setGlobalParams({ shippingRate: v })}
              suffix="¥"
            />
            <ParamField
              label="贴单费"
              value={globalParams.handlingFee}
              onChange={(v) => setGlobalParams({ handlingFee: v })}
              suffix="¥"
            />
            <ParamField
              label="最低操作费"
              value={globalParams.minHandlingFee}
              onChange={(v) => setGlobalParams({ minHandlingFee: v })}
              suffix="¥"
            />
            <div className="col-span-2">
              <ParamField
                label="尾程派送费"
                value={globalParams.lastMileFee}
                onChange={(v) => setGlobalParams({ lastMileFee: v })}
                suffix="RM"
              />
            </div>
          </div>
        </Section>

        {/* 平台费率 */}
        <Section title="平台费率" icon={<Store className="h-3.5 w-3.5 text-purple-500" />} defaultExpanded={false}>
          <div className="grid grid-cols-2 gap-2">
            <ParamField label="佣金" value={globalParams.commissionRate * 100} onChange={(v) => rate('commissionRate', v)} suffix="%" step={0.01} />
            <ParamField label="手续费" value={globalParams.transactionFee * 100} onChange={(v) => rate('transactionFee', v)} suffix="%" step={0.01} />
            <ParamField label="VAT/LVG" value={globalParams.lvgTaxRate * 100} onChange={(v) => rate('lvgTaxRate', v)} suffix="%" step={0.1} />
            <ParamField label="营销费" value={globalParams.marketingRate * 100} onChange={(v) => rate('marketingRate', v)} suffix="%" step={0.01} />
            <div className="col-span-2">
              <ParamField label="SFP 费" value={globalParams.sfpFee * 100} onChange={(v) => rate('sfpFee', v)} suffix="%" step={0.01} />
            </div>
          </div>
        </Section>

        {/* 营销运营 */}
        <Section title="营销运营" icon={<Megaphone className="h-3.5 w-3.5 text-pink-500" />} defaultExpanded={false}>
          <div className="grid grid-cols-2 gap-2">
            <ParamField label="达人佣金" value={globalParams.affiliateRate * 100} onChange={(v) => rate('affiliateRate', v)} suffix="%" step={0.5} />
            <ParamField label="广告投放" value={globalParams.adsRate * 100} onChange={(v) => rate('adsRate', v)} suffix="%" step={0.5} />
          </div>
        </Section>

        {/* 利润 & 退货 */}
        <Section title="利润 & 退货" icon={<Target className="h-3.5 w-3.5 text-emerald-500" />} defaultExpanded={false}>
          <div className="grid grid-cols-2 gap-2">
            <ParamField label="目标利润率" value={globalParams.targetProfitRate * 100} onChange={(v) => rate('targetProfitRate', v)} suffix="%" step={0.5} />
            <ParamField label="退货/破损率" value={globalParams.returnRate * 100} onChange={(v) => rate('returnRate', v)} suffix="%" step={0.5} />
            <div className="col-span-2">
              <ParamField label="退货损失率" value={globalParams.returnLossRate * 100} onChange={(v) => rate('returnLossRate', v)} suffix="%" step={0.5} />
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
