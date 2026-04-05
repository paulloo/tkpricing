// ============================================
// 全局参数面板组件 (优化版)
// ============================================

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { calculateTotalDeductionRate, calculatePlatformRate, PRICING_STRATEGIES } from '@/lib/calculator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Settings2, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp,
  Percent,
  Truck,
  DollarSign,
  Package,
  AlertTriangle,
  Target,
  Sparkles,
  Store,
  Megaphone
} from 'lucide-react';
import { formatPercent } from '@/lib/calculator';

interface ParamFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  icon?: React.ReactNode;
  tooltip?: string;
}

function ParamField({ 
  label, 
  value, 
  onChange, 
  suffix = '', 
  min = 0, 
  max = 100, 
  step = 0.01,
  icon,
  tooltip
}: ParamFieldProps) {
  const [localValue, setLocalValue] = useState(value?.toString() ?? '');

  const handleBlur = () => {
    const num = parseFloat(localValue);
    if (!isNaN(num)) {
      onChange(num);
    } else {
      setLocalValue(value?.toString() ?? '');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-slate-400">{icon}</span>}
        <Label className="text-xs font-medium text-slate-600">{label}</Label>
        {tooltip && (
          <div className="group relative">
            <AlertTriangle className="h-3 w-3 text-slate-400 cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
              {tooltip}
            </div>
          </div>
        )}
      </div>
      <div className="relative">
        <Input
          type="number"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          min={min}
          max={max}
          step={step}
          className="h-8 pr-8 text-sm bg-white border-slate-200 focus:border-blue-500 focus:ring-blue-500"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
          {suffix}
        </span>
      </div>
    </div>
  );
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function Section({ title, icon, children, defaultExpanded = true }: SectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-slate-700">{title}</span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>
      {expanded && (
        <div className="p-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

// 定价策略选择器
function StrategySelector() {
  const { globalParams, setGlobalParams } = useStore();
  const { pricingStrategy, customMultiplier } = globalParams;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {PRICING_STRATEGIES.map((strategy) => (
          <button
            key={strategy.key}
            onClick={() => setGlobalParams({ pricingStrategy: strategy.key })}
            className={`p-2 rounded-lg border text-left transition-all ${
              pricingStrategy === strategy.key
                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span 
                className="text-xs font-medium"
                style={{ color: strategy.color }}
              >
                {strategy.name}
              </span>
              <Badge variant="outline" className="text-xs h-4 px-1">
                ×{strategy.key === 'custom' ? customMultiplier : strategy.multiplier}
              </Badge>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              {strategy.description}
            </p>
          </button>
        ))}
      </div>
      
      {pricingStrategy === 'custom' && (
        <ParamField
          label="自定义倍数"
          value={customMultiplier}
          onChange={(v) => setGlobalParams({ customMultiplier: v })}
          step={0.1}
          min={1}
          max={10}
          tooltip="自定义定价倍数"
        />
      )}
    </div>
  );
}

export function GlobalParamsPanel() {
  const { globalParams, setGlobalParams, resetGlobalParams } = useStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const totalDeductionRate = calculateTotalDeductionRate(globalParams);
  const platformRate = calculatePlatformRate(globalParams);

  const handleRateChange = (key: keyof typeof globalParams, value: number) => {
    const decimalValue = value / 100;
    setGlobalParams({ [key]: decimalValue });
  };

  return (
    <div className={`flex flex-col h-full bg-slate-50 border-r border-slate-200 transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-full md:w-80'}`}>
      {/* 折叠按钮 */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-4 w-6 h-6 bg-white border border-slate-200 rounded-full shadow-sm flex items-center justify-center hover:bg-slate-50 z-10 hidden md:flex"
      >
        {isCollapsed ? (
          <ChevronDown className="h-3 w-3 text-slate-500 rotate-90" />
        ) : (
          <ChevronDown className="h-3 w-3 text-slate-500 -rotate-90" />
        )}
      </button>

      {isCollapsed ? (
        <div className="flex flex-col items-center py-4 space-y-4">
          <Settings2 className="h-5 w-5 text-slate-400" />
          <div className="w-px h-8 bg-slate-200" />
          <DollarSign className="h-4 w-4 text-slate-400" />
          <Truck className="h-4 w-4 text-slate-400" />
          <Percent className="h-4 w-4 text-slate-400" />
          <Target className="h-4 w-4 text-slate-400" />
          <Package className="h-4 w-4 text-slate-400" />
        </div>
      ) : (
        <>
          {/* 头部 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-800">全局参数</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetGlobalParams}
              className="h-7 px-2 text-xs text-slate-500 hover:text-slate-700"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              重置
            </Button>
          </div>

          {/* 滚动内容 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* 定价策略 */}
            <Section title="定价策略" icon={<Sparkles className="h-4 w-4 text-amber-500" />} defaultExpanded={true}>
              <StrategySelector />
            </Section>

            {/* 基础汇率 */}
            <Section title="基础汇率" icon={<DollarSign className="h-4 w-4 text-emerald-500" />}>
              <ParamField
                label="RMB → MYR 汇率"
                value={globalParams.exchangeRate}
                onChange={(v) => setGlobalParams({ exchangeRate: v })}
                step={0.001}
                tooltip="人民币兑换马来西亚林吉特的汇率"
              />
            </Section>

            {/* 物流成本 */}
            <Section title="物流成本" icon={<Truck className="h-4 w-4 text-blue-500" />}>
              <div className="grid grid-cols-2 gap-3">
                <ParamField
                  label="头程运费"
                  value={globalParams.shippingRate}
                  onChange={(v) => setGlobalParams({ shippingRate: v })}
                  suffix="¥/kg"
                  tooltip="中国发往目的国的空运/海运费"
                />
                <ParamField
                  label="贴单费"
                  value={globalParams.handlingFee}
                  onChange={(v) => setGlobalParams({ handlingFee: v })}
                  suffix="¥/单"
                  tooltip="二次打包、贴面单费用"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ParamField
                  label="最低操作费"
                  value={globalParams.minHandlingFee}
                  onChange={(v) => setGlobalParams({ minHandlingFee: v })}
                  suffix="¥"
                  tooltip="小件商品的保底费用"
                />
                <ParamField
                  label="尾程派送"
                  value={globalParams.lastMileFee}
                  onChange={(v) => setGlobalParams({ lastMileFee: v })}
                  suffix="RM"
                  tooltip="本地物流派送到客户费用"
                />
              </div>
            </Section>

            {/* 平台费率 */}
            <Section title="平台费率" icon={<Store className="h-4 w-4 text-purple-500" />}>
              <div className="grid grid-cols-2 gap-3">
                <ParamField
                  label="平台佣金"
                  value={globalParams.commissionRate * 100}
                  onChange={(v) => handleRateChange('commissionRate', v)}
                  suffix="%"
                  tooltip="TikTok Shop 平台佣金"
                />
                <ParamField
                  label="交易手续费"
                  value={globalParams.transactionFee * 100}
                  onChange={(v) => handleRateChange('transactionFee', v)}
                  suffix="%"
                  tooltip="订单成交服务费"
                />
                <ParamField
                  label="VAT/LVG税"
                  value={globalParams.lvgTaxRate * 100}
                  onChange={(v) => handleRateChange('lvgTaxRate', v)}
                  suffix="%"
                  tooltip="增值税/低价值商品税"
                />
                <ParamField
                  label="营销费用"
                  value={globalParams.marketingRate * 100}
                  onChange={(v) => handleRateChange('marketingRate', v)}
                  suffix="%"
                  tooltip="免邮/折扣预留"
                />
                <ParamField
                  label="SFP服务费"
                  value={globalParams.sfpFee * 100}
                  onChange={(v) => handleRateChange('sfpFee', v)}
                  suffix="%"
                  tooltip="卖家自主履约服务费"
                />
              </div>
            </Section>

            {/* 营销与运营成本 */}
            <Section title="营销与运营" icon={<Megaphone className="h-4 w-4 text-pink-500" />}>
              <div className="grid grid-cols-2 gap-3">
                <ParamField
                  label="达人佣金"
                  value={globalParams.affiliateRate * 100}
                  onChange={(v) => handleRateChange('affiliateRate', v)}
                  suffix="%"
                  tooltip="联盟营销分成比例"
                />
                <ParamField
                  label="广告费用"
                  value={globalParams.adsRate * 100}
                  onChange={(v) => handleRateChange('adsRate', v)}
                  suffix="%"
                  tooltip="TikTok广告投放费用"
                />
              </div>
            </Section>

            {/* 利润模型 */}
            <Section title="利润模型" icon={<Target className="h-4 w-4 text-amber-500" />}>
              <ParamField
                label="目标利润率"
                value={globalParams.targetProfitRate * 100}
                onChange={(v) => handleRateChange('targetProfitRate', v)}
                suffix="%"
                tooltip="期望的净利润比例"
              />
            </Section>

            {/* 退货模型 */}
            <Section title="退货模型" icon={<Package className="h-4 w-4 text-rose-500" />}>
              <div className="grid grid-cols-2 gap-3">
                <ParamField
                  label="退货/破损率"
                  value={globalParams.returnRate * 100}
                  onChange={(v) => handleRateChange('returnRate', v)}
                  suffix="%"
                  tooltip="预估退货或破损比例"
                />
                <ParamField
                  label="退货损失"
                  value={globalParams.returnLossRate * 100}
                  onChange={(v) => handleRateChange('returnLossRate', v)}
                  suffix="%"
                  tooltip="退货造成的运费+损耗占比"
                />
              </div>
            </Section>

            {/* 费率汇总 */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">平台扣费率</span>
                  <span className="text-sm font-semibold text-blue-700">
                    {formatPercent(platformRate)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">含目标利润</span>
                  <span className="text-sm font-semibold text-indigo-700">
                    {formatPercent(totalDeductionRate)}
                  </span>
                </div>
                <Separator className="bg-blue-200" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">保本→建议加价</span>
                  <span className="text-base font-bold text-indigo-700">
                    {(1 / (1 - platformRate)).toFixed(2)}x
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
