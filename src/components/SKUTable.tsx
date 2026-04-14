// ============================================
// SKU 表格 — ERP 分组列头风格
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
import { Trash2, Plus, AlertCircle, CheckCircle2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  formatCurrency,
  formatPercent,
  getMarginColor,
  getMarginStatus,
  PRICING_STRATEGIES,
} from '@/lib/calculator';

interface SKUTableProps {
  productId: string;
  skus: SKUData[];
}

// ─── EditableCell ─────────────────────────────────────────────────────────────

interface EditableCellProps {
  value: number | string;
  onChange: (v: number | string) => void;
  type?: 'text' | 'number';
  suffix?: string;
  prefix?: string;
  min?: number;
  step?: number;
  isPercent?: boolean;
  highlight?: boolean;
}

function EditableCell({
  value,
  onChange,
  type = 'number',
  suffix,
  prefix,
  min = 0,
  step,
  isPercent = false,
  highlight = false,
}: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(
    value !== undefined && value !== null ? value.toString() : ''
  );
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocal(value !== undefined && value !== null ? value.toString() : '');
  }, [value]);

  useEffect(() => {
    if (editing) {
      ref.current?.focus();
      ref.current?.select();
    }
  }, [editing]);

  const commit = () => {
    if (type === 'number') {
      const n = parseFloat(local);
      if (!isNaN(n)) onChange(isPercent ? n / 100 : n);
      else setLocal(value?.toString() ?? '');
    } else {
      onChange(local);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="relative flex items-center">
        {prefix && <span className="absolute left-1.5 text-[10px] text-slate-400">{prefix}</span>}
        <Input
          ref={ref}
          type={type}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') { setLocal(value?.toString() ?? ''); setEditing(false); }
          }}
          min={min}
          step={step ?? (isPercent ? 0.1 : 0.01)}
          className={`h-6 text-xs w-full ${prefix ? 'pl-5' : ''} ${suffix ? 'pr-5' : ''}`}
        />
        {suffix && <span className="absolute right-1.5 text-[10px] text-slate-400">{suffix}</span>}
      </div>
    );
  }

  const display =
    type === 'number' && typeof value === 'number'
      ? isPercent
        ? `${value.toFixed(1)}%`   // value 已是百分数形式（如 5），直接加 %
        : value % 1 === 0
        ? value.toFixed(0)
        : value.toFixed(2)
      : value;

  return (
    <div
      onClick={() => setEditing(true)}
      className={`cursor-pointer rounded px-1.5 py-0.5 text-xs hover:bg-amber-50 hover:ring-1 hover:ring-amber-200 transition-all whitespace-nowrap ${
        highlight ? 'text-amber-700 font-semibold bg-amber-50/60' : ''
      }`}
    >
      {prefix && <span className="text-slate-400 mr-0.5">{prefix}</span>}
      {display}
      {suffix && <span className="text-slate-400 ml-0.5">{suffix}</span>}
    </div>
  );
}

// ─── Column group header styles ───────────────────────────────────────────────

const GRP = {
  cost: 'bg-blue-50 text-blue-700 border-blue-100',
  logistics: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  pricing: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  profit: 'bg-amber-50 text-amber-700 border-amber-100',
  ops: '',
};

const TH = 'px-2 py-1 text-[10px] font-medium text-slate-500 border-b border-slate-200 whitespace-nowrap bg-slate-50';
const TD = 'px-2 py-1 border-b border-slate-100 align-middle';

// ─── Current Price Cell ───────────────────────────────────────────────────────

function CurrentPriceCell({ currentPrice, strategyPrice }: { currentPrice: number; strategyPrice: number }) {
  const diff = currentPrice - strategyPrice;
  const pct = strategyPrice > 0 ? diff / strategyPrice : 0;

  let Icon = Minus;
  let color = 'text-slate-400';
  let bgColor = 'bg-slate-50';

  if (pct > 0.02) {
    Icon = TrendingUp;
    color = 'text-emerald-600';
    bgColor = 'bg-emerald-50';
  } else if (pct < -0.02) {
    Icon = TrendingDown;
    color = 'text-red-500';
    bgColor = 'bg-red-50';
  }

  return (
    <div className={`inline-flex flex-col items-end gap-0.5 rounded px-1 py-0.5 ${bgColor}`}>
      <div className={`flex items-center gap-0.5 text-[11px] font-medium ${color}`}>
        <Icon className="h-3 w-3" />
        <span>RM{currentPrice.toFixed(2)}</span>
      </div>
      <div className={`text-[9px] ${color} opacity-80`}>
        {pct >= 0 ? '+' : ''}{(pct * 100).toFixed(1)}%
      </div>
    </div>
  );
}

// ─── Desktop table ────────────────────────────────────────────────────────────

function DesktopTable({ productId, skus, onDelete, onAdd }: {
  productId: string;
  skus: SKUData[];
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  const { updateSKU, setSKUPricingStrategy } = useStore();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse min-w-[1100px]">
        <thead>
          {/* Group header row */}
          <tr>
            <th rowSpan={2} className={`${TH} text-left w-32 sticky left-0 z-10 bg-slate-50 border-r border-slate-200`}>
              SKU 名称
            </th>
            <th colSpan={4} className={`${GRP.cost} text-center text-[10px] font-semibold px-2 py-0.5 border-b border-x`}>
              采购成本（RMB）
            </th>
            <th colSpan={1} className={`${GRP.logistics} text-center text-[10px] font-semibold px-2 py-0.5 border-b border-x`}>
              综合成本
            </th>
            <th colSpan={4} className={`${GRP.pricing} text-center text-[10px] font-semibold px-2 py-0.5 border-b border-x`}>
              定价策略
            </th>
            <th colSpan={5} className={`${GRP.profit} text-center text-[10px] font-semibold px-2 py-0.5 border-b border-x`}>
              利润分析
            </th>
            <th rowSpan={2} className={`${TH} text-center w-8`}>
              {/* ops */}
            </th>
          </tr>
          {/* Sub-header row */}
          <tr>
            {/* 采购成本 */}
            <th className={`${TH} text-right`}>采购¥</th>
            <th className={`${TH} text-right`}>国运¥</th>
            <th className={`${TH} text-right`}>包装¥</th>
            <th className={`${TH} text-right`}>重量kg</th>
            {/* 综合成本 */}
            <th className={`${TH} text-right border-l border-cyan-100`}>总成本RM</th>
            {/* 定价 */}
            <th className={`${TH} text-center border-l border-emerald-100`}>策略</th>
            <th className={`${TH} text-right`}>建议价</th>
            <th className={`${TH} text-right`}>最终价↓</th>
            <th className={`${TH} text-right`}>当前售价</th>
            {/* 利润 */}
            <th className={`${TH} text-right border-l border-amber-100`}>平台扣</th>
            <th className={`${TH} text-right`}>净利润</th>
            <th className={`${TH} text-right`}>退货率↓</th>
            <th className={`${TH} text-right`}>实际净利</th>
            <th className={`${TH} text-right`}>实际率</th>
          </tr>
        </thead>

        <tbody>
          {skus.map((sku) => {
            const c = sku.calculated;
            const margin = c.actualMargin;
            const marginColor = getMarginColor(margin);
            const isHovered = hovered === sku.skuId;

            return (
              <tr
                key={sku.skuId}
                onMouseEnter={() => setHovered(sku.skuId)}
                onMouseLeave={() => setHovered(null)}
                className={`transition-colors ${isHovered ? 'bg-slate-50/80' : ''}`}
              >
                {/* SKU 名称 */}
                <td className={`${TD} sticky left-0 bg-white border-r border-slate-200 ${isHovered ? 'bg-slate-50' : ''}`}>
                  <div className="flex items-center gap-1.5">
                    {sku.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sku.imageUrl}
                        alt=""
                        loading="lazy"
                        className="w-7 h-7 rounded object-cover shrink-0 border border-slate-100"
                      />
                    ) : null}
                    <EditableCell
                      value={sku.name}
                      onChange={(v) => updateSKU(productId, sku.skuId, { name: v as string })}
                      type="text"
                    />
                  </div>
                </td>

                {/* 采购成本 */}
                <td className={TD}>
                  <EditableCell value={sku.purchaseCost} onChange={(v) => updateSKU(productId, sku.skuId, { purchaseCost: v as number })} prefix="¥" />
                </td>
                <td className={TD}>
                  <EditableCell value={sku.domesticShipping} onChange={(v) => updateSKU(productId, sku.skuId, { domesticShipping: v as number })} prefix="¥" />
                </td>
                <td className={TD}>
                  <EditableCell value={sku.packagingFee ?? 0} onChange={(v) => updateSKU(productId, sku.skuId, { packagingFee: v as number })} prefix="¥" />
                </td>
                <td className={TD}>
                  <EditableCell value={sku.weight} onChange={(v) => updateSKU(productId, sku.skuId, { weight: v as number })} suffix="kg" step={0.001} />
                </td>

                {/* 综合成本 */}
                <td className={`${TD} border-l border-cyan-100 text-right font-medium text-slate-700`}>
                  {formatCurrency(c.totalCostMYR)}
                </td>

                {/* 定价 */}
                <td className={`${TD} border-l border-emerald-100`}>
                  <Select
                    value={sku.pricingStrategy ?? 'inherit'}
                    onValueChange={(v) =>
                      setSKUPricingStrategy(productId, sku.skuId, v === 'inherit' ? null : (v as PricingStrategy))
                    }
                  >
                    <SelectTrigger className="h-6 text-[11px] w-20 border-0 shadow-none px-1 bg-transparent">
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
                <td className={`${TD} text-right`}>
                  <div className="text-[11px] font-medium text-emerald-700">{formatCurrency(c.strategyPrice)}</div>
                  <div className="text-[9px] text-slate-400">{c.appliedStrategy.name}</div>
                </td>
                <td className={TD}>
                  <EditableCell
                    value={sku.finalPrice ?? c.strategyPrice}
                    onChange={(v) => updateSKU(productId, sku.skuId, { finalPrice: v as number })}
                    prefix="RM"
                    highlight={!!sku.finalPrice}
                  />
                </td>

                {/* 当前售价对比 */}
                <td className={`${TD} text-right`}>
                  {sku.currentPrice != null ? (
                    <CurrentPriceCell currentPrice={sku.currentPrice} strategyPrice={c.strategyPrice} />
                  ) : (
                    <span className="text-[10px] text-slate-300">—</span>
                  )}
                </td>

                {/* 利润分析 */}
                <td className={`${TD} border-l border-amber-100 text-right text-slate-500`}>
                  {formatCurrency(c.platformFee)}
                </td>
                <td className={`${TD} text-right font-medium`} style={{ color: getMarginColor(c.profitMargin) }}>
                  {formatCurrency(c.netProfit)}
                </td>
                <td className={TD}>
                  <EditableCell
                    value={(sku.returnRate ?? 0.05) * 100}
                    onChange={(v) => updateSKU(productId, sku.skuId, { returnRate: v as number })}
                    suffix="%"
                    isPercent
                  />
                </td>
                <td className={`${TD} text-right font-semibold`} style={{ color: marginColor }}>
                  {formatCurrency(c.actualNetProfit)}
                </td>
                <td className={`${TD} text-right`}>
                  <div className="flex flex-col items-end gap-0.5">
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 px-1 border-current"
                      style={{ color: marginColor, borderColor: marginColor, backgroundColor: `${marginColor}18` }}
                    >
                      {formatPercent(margin)}
                    </Badge>
                    <div className="text-[9px] text-slate-400">{getMarginStatus(margin)}</div>
                  </div>
                </td>

                {/* 操作 */}
                <td className={`${TD} text-center`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(sku.skuId)}
                    disabled={skus.length <= 1}
                    className="h-6 w-6 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Add SKU footer */}
      <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
        <Button
          variant="outline"
          size="sm"
          onClick={onAdd}
          className="h-7 text-xs border-dashed text-slate-500 hover:text-slate-700"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          添加 SKU
        </Button>
      </div>
    </div>
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

function MobileCard({ sku, productId, onDelete }: { sku: SKUData; productId: string; onDelete: () => void }) {
  const { updateSKU, setSKUPricingStrategy } = useStore();
  const c = sku.calculated;
  const marginColor = getMarginColor(c.actualMargin);

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {sku.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sku.imageUrl}
              alt=""
              loading="lazy"
              className="w-8 h-8 rounded object-cover shrink-0 border border-slate-200"
            />
          ) : null}
          <div className="flex-1 min-w-0">
            <EditableCell
              value={sku.name || '—'}
              onChange={(v) => updateSKU(productId, sku.skuId, { name: v as string })}
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <Select
            value={sku.pricingStrategy ?? 'inherit'}
            onValueChange={(v) =>
              setSKUPricingStrategy(productId, sku.skuId, v === 'inherit' ? null : (v as PricingStrategy))
            }
          >
            <SelectTrigger className="h-6 w-20 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inherit">默认</SelectItem>
              {PRICING_STRATEGIES.map((s) => (
                <SelectItem key={s.key} value={s.key}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={onDelete} className="h-6 w-6 p-0 text-slate-300 hover:text-red-500">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Cost row */}
      <div className="grid grid-cols-4 gap-px bg-slate-100 border-b border-slate-200">
        {[
          { label: '采购¥', node: <EditableCell value={sku.purchaseCost} onChange={(v) => updateSKU(productId, sku.skuId, { purchaseCost: v as number })} prefix="¥" /> },
          { label: '国运¥', node: <EditableCell value={sku.domesticShipping} onChange={(v) => updateSKU(productId, sku.skuId, { domesticShipping: v as number })} prefix="¥" /> },
          { label: '包装¥', node: <EditableCell value={sku.packagingFee ?? 0} onChange={(v) => updateSKU(productId, sku.skuId, { packagingFee: v as number })} prefix="¥" /> },
          { label: '重量', node: <EditableCell value={sku.weight} onChange={(v) => updateSKU(productId, sku.skuId, { weight: v as number })} suffix="kg" step={0.001} /> },
        ].map(({ label, node }) => (
          <div key={label} className="bg-white px-2 py-1.5">
            <div className="text-[10px] text-slate-400 mb-0.5">{label}</div>
            {node}
          </div>
        ))}
      </div>

      {/* Pricing + profit */}
      <div className="grid grid-cols-2 gap-px bg-slate-100">
        <div className="bg-white px-3 py-2">
          <div className="text-[10px] text-slate-400 mb-1">总成本 / 建议价</div>
          <div className="text-xs text-slate-600">{formatCurrency(c.totalCostMYR)} / <span className="text-emerald-600 font-medium">{formatCurrency(c.strategyPrice)}</span></div>
          <div className="mt-1">
            <EditableCell
              value={sku.finalPrice ?? c.strategyPrice}
              onChange={(v) => updateSKU(productId, sku.skuId, { finalPrice: v as number })}
              prefix="RM"
              highlight={!!sku.finalPrice}
            />
            <div className="text-[9px] text-slate-400 mt-0.5">最终定价（点击编辑）</div>
          </div>
        </div>
        <div className="bg-white px-3 py-2">
          <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> 利润分析
          </div>
          <div className="text-sm font-bold" style={{ color: marginColor }}>
            {formatCurrency(c.actualNetProfit)}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge
              variant="outline"
              className="text-[10px] h-4 px-1"
              style={{ color: marginColor, borderColor: marginColor }}
            >
              {formatPercent(c.actualMargin)}
            </Badge>
            <EditableCell
              value={(sku.returnRate ?? 0.05) * 100}
              onChange={(v) => updateSKU(productId, sku.skuId, { returnRate: v as number })}
              suffix="% 退货"
              isPercent
            />
          </div>
          <div className="mt-1 flex items-center gap-1">
            {c.isProfitable ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
            )}
            <span className="text-[10px] text-slate-500">{getMarginStatus(c.actualMargin)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SKUTable ─────────────────────────────────────────────────────────────────

export function SKUTable({ productId, skus }: SKUTableProps) {
  const { addSKU, deleteSKU } = useStore();

  const handleDelete = (skuId: string) => {
    if (skus.length <= 1) return;
    deleteSKU(productId, skuId);
  };

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block">
        <DesktopTable
          productId={productId}
          skus={skus}
          onDelete={handleDelete}
          onAdd={() => addSKU(productId, true)}
        />
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-2 p-3">
        {skus.map((sku) => (
          <MobileCard
            key={sku.skuId}
            sku={sku}
            productId={productId}
            onDelete={() => handleDelete(sku.skuId)}
          />
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => addSKU(productId, true)}
          className="w-full h-9 border-dashed text-slate-500"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          添加 SKU
        </Button>
      </div>
    </>
  );
}
