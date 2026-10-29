// 店铺设置：编辑的是草稿，商品利润实时预览，点"保存"才写入数据库

import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Megaphone, RotateCcw, Save, Store, Target, Truck, Undo2, Wallet } from 'lucide-react';
import { PRESETS, findSite } from '@/domain/presets';
import type { ShopConfig } from '@/domain/shop-config';
import { useCurrentShop, useEffectiveConfig, useStore } from '@/store/useStore';
import { formatMoney, formatPercent } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { NumberField } from '@/components/fields/NumberField';
import { FeeLinesEditor } from './FeeLinesEditor';

function Section({ title, icon, children, defaultOpen = false }: { title: string; icon: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-md border border-slate-100">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between bg-slate-50 px-3 py-2 transition-colors hover:bg-slate-100"
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
          {icon}
          {title}
        </span>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
      </button>
      {open && <div className="space-y-2.5 bg-white p-3">{children}</div>}
    </div>
  );
}

const Grid = ({ children }: { children: ReactNode }) => <div className="grid grid-cols-2 gap-2">{children}</div>;

export function ShopSettingsPanel() {
  const shop = useCurrentShop();
  const config = useEffectiveConfig();
  const { draftConfig, setDraftConfig, discardDraft, saveDraft } = useStore();
  const [saving, setSaving] = useState(false);

  if (!shop || !config) return null;

  const sale = config.currency.sale;
  const cost = config.currency.cost;
  const dirty = draftConfig != null;
  const sitePresets = PRESETS.filter((p) => p.site === shop.site);

  const patch = <K extends keyof ShopConfig>(key: K, value: Partial<ShopConfig[K]>) =>
    setDraftConfig({ ...config, [key]: { ...(config[key] as object), ...value } } as ShopConfig);

  const percentTotal = config.fees
    .filter((f) => f.enabled && f.kind === 'percent')
    .reduce((acc, f) => acc + f.value, 0);
  const fixedTotal = config.fees.filter((f) => f.enabled && f.kind === 'fixed').reduce((acc, f) => acc + f.value, 0);
  const marketingTotal = config.marketing.affiliateRate + config.marketing.adsRate;

  const handleSave = async () => {
    setSaving(true);
    await saveDraft();
    setSaving(false);
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2.5">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-800">{shop.name} · 店铺设置</div>
          <div className="text-[10px] text-slate-400">
            {findSite(shop.site)?.name ?? shop.site} · {sale} · {dirty ? <span className="text-amber-600">有未保存的修改（已实时预览）</span> : '已保存'}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="sm" disabled={!dirty || saving} onClick={discardDraft} className="h-7 px-2 text-xs">
            <Undo2 className="mr-1 h-3 w-3" />
            放弃
          </Button>
          <Button size="sm" disabled={!dirty || saving} onClick={handleSave} className="h-7 bg-blue-600 px-2 text-xs hover:bg-blue-700">
            <Save className="mr-1 h-3 w-3" />
            {saving ? '保存中' : '保存'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50 text-center">
        <div className="px-2 py-2">
          <div className="text-[10px] text-slate-400">平台费（按售价）</div>
          <div className="text-sm font-bold text-red-600">{formatPercent(percentTotal)}</div>
        </div>
        <div className="px-2 py-2">
          <div className="text-[10px] text-slate-400">每单固定费</div>
          <div className="text-sm font-bold text-red-600">{formatMoney(fixedTotal, sale)}</div>
        </div>
        <div className="px-2 py-2">
          <div className="text-[10px] text-slate-400">达人 + 广告</div>
          <div className="text-sm font-bold text-orange-500">{formatPercent(marketingTotal)}</div>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        <Section title="定价目标" icon={<Target className="h-3.5 w-3.5 text-emerald-500" />} defaultOpen>
          <p className="text-[10px] leading-tight text-slate-400">
            目标是"期望净利率"：已扣除平台费、达人佣金、广告、物流和退货损失后，每单落到手里的利润占售价的比例。
          </p>
          <div className="grid grid-cols-3 gap-2">
            <NumberField label="引流款" percent min={-1} max={0.95} value={config.pricing.targetMargins.drainage}
              onChange={(v) => patch('pricing', { targetMargins: { ...config.pricing.targetMargins, drainage: v ?? 0 } })} />
            <NumberField label="利润款" percent min={-1} max={0.95} value={config.pricing.targetMargins.profit}
              onChange={(v) => patch('pricing', { targetMargins: { ...config.pricing.targetMargins, profit: v ?? 0 } })} />
            <NumberField label="锚定款" percent min={-1} max={0.95} value={config.pricing.targetMargins.anchor}
              onChange={(v) => patch('pricing', { targetMargins: { ...config.pricing.targetMargins, anchor: v ?? 0 } })} />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] text-slate-500">默认策略</span>
            <div className="grid grid-cols-3 gap-1">
              {(['drainage', 'profit', 'anchor'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => patch('pricing', { defaultStrategy: s })}
                  className={`h-7 rounded border text-[11px] ${config.pricing.defaultStrategy === s ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {{ drainage: '引流款', profit: '利润款', anchor: '锚定款' }[s]}
                </button>
              ))}
            </div>
          </div>
          <Grid>
            <NumberField label="价格取整步长" value={config.pricing.rounding.step} suffix={sale} min={0.01}
              hint="1 = 取整到元；大面额币种可设 100、1000"
              onChange={(v) => patch('pricing', { rounding: { ...config.pricing.rounding, step: v ?? 1 } })} />
            <NumberField label="价格尾数" value={config.pricing.rounding.ending} suffix={sale}
              hint="0.9 → 价格以 .90 结尾"
              onChange={(v) => patch('pricing', { rounding: { ...config.pricing.rounding, ending: v ?? 0 } })} />
          </Grid>
        </Section>

        <Section title="平台费用" icon={<Store className="h-3.5 w-3.5 text-purple-500" />}>
          <FeeLinesEditor fees={config.fees} currency={sale} onChange={(fees) => setDraftConfig({ ...config, fees })} />
        </Section>

        <Section title="达人与广告" icon={<Megaphone className="h-3.5 w-3.5 text-pink-500" />}>
          <Grid>
            <NumberField label="达人佣金" percent value={config.marketing.affiliateRate} hint="退货订单不结算"
              onChange={(v) => patch('marketing', { affiliateRate: v ?? 0 })} />
            <NumberField label="广告费占比" percent value={config.marketing.adsRate} hint="退货订单也已花出"
              onChange={(v) => patch('marketing', { adsRate: v ?? 0 })} />
          </Grid>
        </Section>

        <Section title="汇率" icon={<Wallet className="h-3.5 w-3.5 text-blue-500" />}>
          <Grid>
            <NumberField label={`1 ${cost} = ? ${sale}`} value={config.currency.rate} min={0.000001}
              onChange={(v) => v && patch('currency', { rate: v })} />
            <NumberField label="汇率缓冲" percent max={0.5} value={config.currency.buffer} hint="按更差汇率计成本，抵御波动"
              onChange={(v) => patch('currency', { buffer: v ?? 0 })} />
          </Grid>
        </Section>

        <Section title="物流" icon={<Truck className="h-3.5 w-3.5 text-cyan-600" />}>
          <div className="text-[11px] font-medium text-slate-600">头程（{cost}）</div>
          <Grid>
            <NumberField label="单价 /kg" value={config.firstLeg.ratePerKg} suffix={cost} onChange={(v) => patch('firstLeg', { ratePerKg: v ?? 0 })} />
            <NumberField label="最低收费" value={config.firstLeg.minCharge} suffix={cost} onChange={(v) => patch('firstLeg', { minCharge: v ?? 0 })} />
            <NumberField label="贴单/操作费" value={config.firstLeg.handlingFee} suffix={cost} onChange={(v) => patch('firstLeg', { handlingFee: v ?? 0 })} />
            <NumberField label="体积重除数" value={config.firstLeg.volumetricDivisor} hint="长×宽×高(cm)÷除数；0 = 不计体积重"
              onChange={(v) => patch('firstLeg', { volumetricDivisor: v ?? 0 })} />
          </Grid>
          <div className="pt-1 text-[11px] font-medium text-slate-600">尾程 / 平台物流（{sale}）</div>
          <Grid>
            <NumberField label="首重 kg" value={config.lastMile.firstWeightKg} onChange={(v) => patch('lastMile', { firstWeightKg: v ?? 0 })} />
            <NumberField label="首重费" value={config.lastMile.firstWeightFee} suffix={sale} onChange={(v) => patch('lastMile', { firstWeightFee: v ?? 0 })} />
            <NumberField label="续重每档 kg" value={config.lastMile.stepKg} hint="0 = 固定运费" onChange={(v) => patch('lastMile', { stepKg: v ?? 0 })} />
            <NumberField label="续重每档费" value={config.lastMile.stepFee} suffix={sale} onChange={(v) => patch('lastMile', { stepFee: v ?? 0 })} />
            <NumberField label="运费税" percent value={config.lastMile.taxRate} hint="如马来西亚运费 6% SST" onChange={(v) => patch('lastMile', { taxRate: v ?? 0 })} />
          </Grid>
        </Section>

        <Section title="退货" icon={<RotateCcw className="h-3.5 w-3.5 text-amber-600" />}>
          <Grid>
            <NumberField label="退货率" percent value={config.returns.rate} hint="每 100 单退几单" onChange={(v) => patch('returns', { rate: v ?? 0 })} />
            <NumberField label="可二次销售比例" percent value={config.returns.resaleRate} hint="退回后还能卖的比例"
              onChange={(v) => patch('returns', { resaleRate: v ?? 0 })} />
            <NumberField label="每单退货运费" value={config.returns.returnShippingFee} suffix={sale}
              hint="买家无理由退货时卖家承担的退回运费" onChange={(v) => patch('returns', { returnShippingFee: v ?? 0 })} />
          </Grid>
        </Section>

        {sitePresets.length > 0 && (
          <div className="space-y-1.5 rounded-md border border-dashed border-slate-200 p-3">
            <div className="text-[11px] font-medium text-slate-600">用预设覆盖当前设置</div>
            {sitePresets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDraftConfig(p.config)}
                className="w-full rounded border border-slate-200 px-2 py-1.5 text-left hover:bg-slate-50"
              >
                <div className="text-xs text-slate-700">{p.name}</div>
                <div className="text-[10px] leading-tight text-slate-400">{p.description}</div>
              </button>
            ))}
            <p className="text-[10px] text-slate-400">覆盖后同样需要点"保存"才会生效。</p>
          </div>
        )}
      </div>
    </div>
  );
}
