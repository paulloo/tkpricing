// SKU 表格（桌面端）— ERP 分组列头

import { Plus, Trash2 } from 'lucide-react';
import type { CalculatedSku } from '@/domain/pricing/portfolio';
import type { ShopConfig } from '@/domain/shop-config';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { formatMoney, formatPercent, marginLevel, MARGIN_BADGE_CLASS, MARGIN_TEXT_CLASS } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { EditableNumber, EditableText } from '@/components/fields/EditableCell';
import { PriceBreakdown } from './PriceBreakdown';
import { DimensionsCell, StrategyCell, WarningBadges } from './SkuCells';
import { SkuMobileCard } from './SkuMobileCard';

interface SkuTableProps {
  productId: string;
  skus: CalculatedSku[];
  config: ShopConfig;
}

const TH = 'whitespace-nowrap border-b border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-500';
const TD = 'border-b border-slate-100 px-2 py-1 align-middle';
const GROUP = 'border-x border-b px-2 py-0.5 text-center text-[10px] font-semibold';

function DeltaVsFinal({ current, final, sale }: { current: number; final: number; sale: string }) {
  const pct = final > 0 ? current / final - 1 : 0;
  return (
    <div className="text-right">
      <div className="text-[11px] text-slate-700">{formatMoney(current, sale)}</div>
      <div className={cn('text-[9px]', pct < -0.02 ? 'text-red-500' : pct > 0.02 ? 'text-emerald-600' : 'text-slate-400')}>
        {pct >= 0 ? '+' : ''}
        {formatPercent(pct)}
      </div>
    </div>
  );
}

export function SkuTable({ productId, skus, config }: SkuTableProps) {
  const { addSku, updateSku, deleteSku } = useStore();
  const sale = config.currency.sale;
  const cost = config.currency.cost;
  const update = (skuId: string) => (patch: Parameters<typeof updateSku>[2]) => updateSku(productId, skuId, patch);
  const canDelete = skus.length > 1;

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1280px] border-collapse text-xs">
          <thead>
            <tr>
              <th rowSpan={2} className={cn(TH, 'sticky left-0 z-10 w-36 border-r text-left')}>SKU</th>
              <th colSpan={3} className={cn(GROUP, 'border-blue-100 bg-blue-50 text-blue-700')}>货值（{cost}）</th>
              <th colSpan={3} className={cn(GROUP, 'border-cyan-100 bg-cyan-50 text-cyan-700')}>包裹</th>
              <th colSpan={4} className={cn(GROUP, 'border-emerald-100 bg-emerald-50 text-emerald-700')}>定价（{sale}）</th>
              <th colSpan={5} className={cn(GROUP, 'border-amber-100 bg-amber-50 text-amber-700')}>利润（每单期望）</th>
              <th rowSpan={2} className={cn(TH, 'w-8')} />
            </tr>
            <tr>
              <th className={cn(TH, 'text-right')}>采购</th>
              <th className={cn(TH, 'text-right')}>国内运费</th>
              <th className={cn(TH, 'text-right')}>包装</th>
              <th className={cn(TH, 'text-right')}>重量kg</th>
              <th className={cn(TH, 'text-center')}>尺寸cm</th>
              <th className={cn(TH, 'text-right')}>计费重</th>
              <th className={cn(TH, 'text-left')}>策略</th>
              <th className={cn(TH, 'text-right')}>建议价</th>
              <th className={cn(TH, 'text-right')}>最终价</th>
              <th className={cn(TH, 'text-right')}>现价</th>
              <th className={cn(TH, 'text-right')}>单件成本</th>
              <th className={cn(TH, 'text-right')}>期望净利</th>
              <th className={cn(TH, 'text-right')}>退货率</th>
              <th className={cn(TH, 'text-right')}>可让利</th>
              <th className={cn(TH, 'text-right')}>预警</th>
            </tr>
          </thead>
          <tbody>
            {skus.map(({ sku, calc }) => {
              const level = marginLevel(calc.atFinal.expectedMargin);
              const onPatch = update(sku.id);
              return (
                <tr key={sku.id} className="hover:bg-slate-50/70">
                  <td className={cn(TD, 'sticky left-0 border-r bg-white')}>
                    <div className="flex items-center gap-1.5">
                      {sku.imageUrl && (
                        <img src={sku.imageUrl} alt="" loading="lazy" className="h-7 w-7 shrink-0 rounded border border-slate-100 object-cover" />
                      )}
                      <EditableText ariaLabel="SKU 名称" value={sku.skuName} placeholder="未命名 SKU" onCommit={(skuName) => onPatch({ skuName })} />
                    </div>
                  </td>
                  <td className={TD}><EditableNumber ariaLabel="采购价" value={sku.purchaseCost} onCommit={(v) => onPatch({ purchaseCost: v ?? 0 })} /></td>
                  <td className={TD}><EditableNumber ariaLabel="国内运费" value={sku.domesticShipping} onCommit={(v) => onPatch({ domesticShipping: v ?? 0 })} /></td>
                  <td className={TD}><EditableNumber ariaLabel="包装费" value={sku.packagingFee} onCommit={(v) => onPatch({ packagingFee: v ?? 0 })} /></td>
                  <td className={TD}><EditableNumber ariaLabel="重量" value={sku.weightKg} onCommit={(v) => onPatch({ weightKg: v ?? 0 })} /></td>
                  <td className={cn(TD, 'text-center')}><DimensionsCell sku={sku} onCommit={onPatch} /></td>
                  <td className={cn(TD, 'text-right', calc.warnings.includes('volumetric') && 'font-medium text-amber-700')}>
                    {calc.cost.chargeableWeightKg.toFixed(2)}
                  </td>
                  <td className={TD}><StrategyCell sku={sku} config={config} onChange={onPatch} /></td>
                  <td className={cn(TD, 'text-right font-medium text-emerald-700')}>{formatMoney(calc.suggestedPrice, sale)}</td>
                  <td className={TD}>
                    <EditableNumber
                      ariaLabel="最终价（留空使用建议价）"
                      nullable
                      value={sku.finalPrice}
                      placeholder={formatMoney(calc.suggestedPrice, sale)}
                      format={(v) => formatMoney(v, sale)}
                      highlight={calc.isManualPrice}
                      onCommit={(finalPrice) => onPatch({ finalPrice })}
                    />
                  </td>
                  <td className={TD}>
                    {sku.currentPrice != null ? <DeltaVsFinal current={sku.currentPrice} final={calc.finalPrice} sale={sale} /> : <span className="block text-right text-[10px] text-slate-300">—</span>}
                  </td>
                  <td className={cn(TD, 'text-right text-slate-600')}>{formatMoney(calc.unitCost, sale)}</td>
                  <td className={cn(TD, 'text-right')}>
                    <PriceBreakdown calc={calc} config={config}>
                      <button type="button" className="ml-auto flex flex-col items-end rounded px-1 hover:bg-slate-100" aria-label="查看利润拆解">
                        <span className={cn('font-semibold', MARGIN_TEXT_CLASS[level])}>{formatMoney(calc.atFinal.expectedProfit, sale)}</span>
                        <span className={cn('rounded border px-1 text-[10px] leading-4', MARGIN_BADGE_CLASS[level])}>{formatPercent(calc.atFinal.expectedMargin)}</span>
                      </button>
                    </PriceBreakdown>
                  </td>
                  <td className={TD}>
                    <EditableNumber
                      ariaLabel="退货率（留空使用店铺默认）"
                      percent
                      nullable
                      value={sku.returnRate}
                      placeholder={formatPercent(config.returns.rate)}
                      onCommit={(returnRate) => onPatch({ returnRate })}
                    />
                  </td>
                  <td className={cn(TD, 'text-right text-slate-600')}>{formatPercent(calc.maxDiscount, 0)}</td>
                  <td className={TD}><WarningBadges warnings={calc.warnings} /></td>
                  <td className={cn(TD, 'text-center')}>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!canDelete}
                      onClick={() => deleteSku(productId, sku.id)}
                      className="h-6 w-6 p-0 text-slate-300 hover:bg-red-50 hover:text-red-500"
                      aria-label="删除 SKU"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 p-3 md:hidden">
        {skus.map((item) => (
          <SkuMobileCard
            key={item.sku.id}
            item={item}
            config={config}
            canDelete={canDelete}
            onPatch={update(item.sku.id)}
            onDelete={() => deleteSku(productId, item.sku.id)}
          />
        ))}
      </div>

      <div className="border-t border-slate-100 bg-slate-50 px-3 py-2">
        <Button variant="outline" size="sm" onClick={() => addSku(productId, true)} className="h-7 border-dashed text-xs text-slate-500">
          <Plus className="mr-1 h-3.5 w-3.5" />
          添加 SKU（复制上一个的成本）
        </Button>
      </div>
    </>
  );
}
