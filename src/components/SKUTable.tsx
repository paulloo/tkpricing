// ============================================
// SKU 表格组件 (优化版，支持移动端)
// ============================================

import { useState, useRef, useEffect } from 'react';
import type { SKUData, PricingStrategy } from '@/types';
import { useStore } from '@/store/useStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Trash2, 
  Plus,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { formatCurrency, formatPercent, getMarginColor, getMarginStatus, PRICING_STRATEGIES } from '@/lib/calculator';

interface SKUTableProps {
  productId: string;
  skus: SKUData[];
}

interface EditableCellProps {
  value: number | string;
  onChange: (value: number | string) => void;
  type?: 'text' | 'number';
  suffix?: string;
  prefix?: string;
  min?: number;
  step?: number;
  className?: string;
  isPercent?: boolean;
}

function EditableCell({
  value,
  onChange,
  type = 'number',
  suffix,
  prefix,
  min = 0,
  step,
  className = '',
  isPercent = false,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setLocalValue(value.toString());
  };

  const handleSave = () => {
    if (type === 'number') {
      const num = parseFloat(localValue);
      if (!isNaN(num)) {
        onChange(isPercent ? num / 100 : num);
      }
    } else {
      onChange(localValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setLocalValue(value.toString());
    }
  };

  if (isEditing) {
    return (
      <div className="relative">
        {prefix && (
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {prefix}
          </span>
        )}
        <Input
          ref={inputRef}
          type={type}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          min={min}
          step={step || (isPercent ? 0.1 : 0.01)}
          className={`h-7 text-xs ${prefix ? 'pl-6' : ''} ${suffix ? 'pr-6' : ''} ${className}`}
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {suffix}
          </span>
        )}
      </div>
    );
  }

  const displayValue = type === 'number' && typeof value === 'number'
    ? isPercent 
      ? formatPercent(value)
      : value.toFixed(value % 1 === 0 ? 0 : 2)
    : value;

  return (
    <div
      onClick={handleStartEdit}
      className={`cursor-pointer hover:bg-amber-50 rounded px-2 py-1 transition-colors text-xs ${className}`}
    >
      {prefix}{displayValue}{suffix}
    </div>
  );
}

// 移动端SKU卡片
function SKUMobileCard({ 
  sku, 
  productId, 
  onDelete 
}: { 
  sku: SKUData; 
  productId: string; 
  onDelete: () => void;
}) {
  const { updateSKU, setSKUPricingStrategy } = useStore();
  const calc = sku.calculated;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-3">
      {/* 名称和策略 */}
      <div className="flex items-center justify-between">
        <EditableCell
          value={sku.name}
          onChange={(v) => updateSKU(productId, sku.skuId, { name: v as string })}
          type="text"
          className="font-medium text-slate-700 flex-1"
        />
        <Select
          value={sku.pricingStrategy || 'inherit'}
          onValueChange={(v) => setSKUPricingStrategy(productId, sku.skuId, v === 'inherit' ? null : v as PricingStrategy)}
        >
          <SelectTrigger className="h-7 w-20 text-xs ml-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inherit">默认</SelectItem>
            {PRICING_STRATEGIES.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 成本信息 */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-slate-50 rounded p-2">
          <div className="text-slate-400 text-[10px]">采购</div>
          <EditableCell
            value={sku.purchaseCost}
            onChange={(v) => updateSKU(productId, sku.skuId, { purchaseCost: v as number })}
            prefix="¥"
          />
        </div>
        <div className="bg-slate-50 rounded p-2">
          <div className="text-slate-400 text-[10px]">重量</div>
          <EditableCell
            value={sku.weight}
            onChange={(v) => updateSKU(productId, sku.skuId, { weight: v as number })}
            suffix="kg"
            step={0.001}
          />
        </div>
        <div className="bg-slate-50 rounded p-2">
          <div className="text-slate-400 text-[10px]">退货率</div>
          <EditableCell
            value={((sku.returnRate ?? 0.05) * 100)}
            onChange={(v) => updateSKU(productId, sku.skuId, { returnRate: v as number })}
            suffix="%"
            isPercent
          />
        </div>
      </div>

      {/* 定价和利润 */}
      <div className="flex items-center justify-between bg-slate-50 rounded p-2">
        <div>
          <div className="text-[10px] text-slate-400">最终定价</div>
          <EditableCell
            value={sku.finalPrice ?? calc.suggestedPrice}
            onChange={(v) => updateSKU(productId, sku.skuId, { finalPrice: v as number })}
            prefix="RM"
            className={sku.finalPrice ? 'text-amber-700 font-medium' : 'text-blue-700 font-medium'}
          />
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-400">实际净利</div>
          <div 
            className="text-sm font-bold"
            style={{ color: getMarginColor(calc.actualMargin) }}
          >
            {formatCurrency(calc.actualNetProfit)}
          </div>
        </div>
      </div>

      {/* 利润率 */}
      <div className="flex items-center justify-between">
        <Badge
          variant="outline"
          className="text-xs"
          style={{
            borderColor: getMarginColor(calc.actualMargin),
            color: getMarginColor(calc.actualMargin),
            backgroundColor: `${getMarginColor(calc.actualMargin)}15`,
          }}
        >
          {formatPercent(calc.actualMargin)}
        </Badge>
        <div className="flex items-center gap-2">
          {calc.isProfitable ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SKUTable({ productId, skus }: SKUTableProps) {
  const { addSKU, deleteSKU, updateSKU, setSKUPricingStrategy } = useStore();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const handleAddSKU = () => {
    addSKU(productId, true);
  };

  const handleDeleteSKU = (skuId: string) => {
    if (skus.length <= 1) return;
    deleteSKU(productId, skuId);
  };

  return (
    <TooltipProvider>
      {/* 桌面端表格 */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 w-28">
                SKU名称
              </th>
              <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 w-16">
                采购
              </th>
              <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 w-16">
                包装
              </th>
              <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 w-14">
                重量
              </th>
              <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 w-18">
                总成本
              </th>
              <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 w-14">
                退货率
              </th>
              <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 w-20">
                策略
              </th>
              <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 w-18">
                建议价
              </th>
              <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 w-18">
                最终定价
              </th>
              <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 w-18">
                平台扣费
              </th>
              <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 w-18">
                实际净利
              </th>
              <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 w-14">
                利率
              </th>
              <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 w-12">
                状态
              </th>
              <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 w-10">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {skus.map((sku) => (
              <tr
                key={sku.skuId}
                onMouseEnter={() => setHoveredRow(sku.skuId)}
                onMouseLeave={() => setHoveredRow(null)}
                className={`border-b border-slate-100 transition-colors ${
                  hoveredRow === sku.skuId ? 'bg-slate-50' : ''
                }`}
              >
                {/* SKU名称 */}
                <td className="px-2 py-1.5">
                  <EditableCell
                    value={sku.name}
                    onChange={(v) => updateSKU(productId, sku.skuId, { name: v as string })}
                    type="text"
                    className="font-medium text-slate-700"
                  />
                </td>

                {/* 采购成本 */}
                <td className="px-2 py-1.5">
                  <EditableCell
                    value={sku.purchaseCost}
                    onChange={(v) => updateSKU(productId, sku.skuId, { purchaseCost: v as number })}
                    prefix="¥"
                  />
                </td>

                {/* 包装费 */}
                <td className="px-2 py-1.5">
                  <EditableCell
                    value={sku.packagingFee || 0}
                    onChange={(v) => updateSKU(productId, sku.skuId, { packagingFee: v as number })}
                    prefix="¥"
                  />
                </td>

                {/* 重量 */}
                <td className="px-2 py-1.5">
                  <EditableCell
                    value={sku.weight}
                    onChange={(v) => updateSKU(productId, sku.skuId, { weight: v as number })}
                    suffix="kg"
                    step={0.001}
                  />
                </td>

                {/* 总成本 */}
                <td className="px-2 py-1.5 text-right text-xs font-medium text-slate-700">
                  {formatCurrency(sku.calculated.totalCostMYR)}
                </td>

                {/* 退货率 */}
                <td className="px-2 py-1.5">
                  <EditableCell
                    value={((sku.returnRate ?? 0.05) * 100)}
                    onChange={(v) => updateSKU(productId, sku.skuId, { returnRate: v as number })}
                    suffix="%"
                    isPercent
                  />
                </td>

                {/* 定价策略 */}
                <td className="px-2 py-1.5">
                  <Select
                    value={sku.pricingStrategy || 'inherit'}
                    onValueChange={(v) => setSKUPricingStrategy(productId, sku.skuId, v === 'inherit' ? null : v as PricingStrategy)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inherit">默认</SelectItem>
                      {PRICING_STRATEGIES.map((s) => (
                        <SelectItem key={s.key} value={s.key}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>

                {/* 建议售价 */}
                <td className="px-2 py-1.5 text-right">
                  <div className="text-xs">
                    <div className="font-medium text-blue-600">
                      {formatCurrency(sku.calculated.strategyPrice)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {sku.calculated.appliedStrategy.name}
                    </div>
                  </div>
                </td>

                {/* 最终定价 */}
                <td className="px-2 py-1.5">
                  <EditableCell
                    value={sku.finalPrice ?? sku.calculated.strategyPrice}
                    onChange={(v) => updateSKU(productId, sku.skuId, { finalPrice: v as number })}
                    prefix="RM"
                    className={sku.finalPrice ? 'bg-amber-50 font-medium text-amber-700' : ''}
                  />
                </td>

                {/* 平台扣费 */}
                <td className="px-2 py-1.5 text-right text-xs text-slate-500">
                  {formatCurrency(sku.calculated.platformFee)}
                </td>

                {/* 实际净利 */}
                <td className="px-2 py-1.5 text-right">
                  <span
                    className="text-xs font-semibold"
                    style={{ color: getMarginColor(sku.calculated.actualMargin) }}
                  >
                    {formatCurrency(sku.calculated.actualNetProfit)}
                  </span>
                </td>

                {/* 实际利率 */}
                <td className="px-2 py-1.5 text-right">
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{
                      borderColor: getMarginColor(sku.calculated.actualMargin),
                      color: getMarginColor(sku.calculated.actualMargin),
                      backgroundColor: `${getMarginColor(sku.calculated.actualMargin)}15`,
                    }}
                  >
                    {formatPercent(sku.calculated.actualMargin)}
                  </Badge>
                </td>

                {/* 状态 */}
                <td className="px-2 py-1.5 text-center">
                  <Tooltip>
                    <TooltipTrigger>
                      {sku.calculated.isProfitable ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500 mx-auto" />
                      )}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{getMarginStatus(sku.calculated.actualMargin)}</p>
                    </TooltipContent>
                  </Tooltip>
                </td>

                {/* 操作 */}
                <td className="px-2 py-1.5 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSKU(sku.skuId)}
                    disabled={skus.length <= 1}
                    className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 添加SKU按钮 */}
        <div className="p-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddSKU}
            className="w-full h-8 text-xs border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            添加 SKU
          </Button>
        </div>
      </div>

      {/* 移动端卡片列表 */}
      <div className="md:hidden space-y-3">
        {skus.map((sku) => (
          <SKUMobileCard
            key={sku.skuId}
            sku={sku}
            productId={productId}
            onDelete={() => handleDeleteSKU(sku.skuId)}
          />
        ))}
        
        {/* 添加SKU按钮 */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddSKU}
          className="w-full h-10 text-sm border-dashed border-slate-300 text-slate-600 hover:bg-slate-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          添加 SKU
        </Button>
      </div>
    </TooltipProvider>
  );
}
