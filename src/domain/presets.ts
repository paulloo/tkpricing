// ============================================
// 站点与费率预设
// 预设只是"起点"：创建店铺时复制一份到店铺配置，之后各店独立修改。
// 费率经常调整，贡献/更新预设请同时更新 verifiedAt 与 sources（见 docs/fee-presets.md）。
// ============================================

import type { ShopConfig } from './shop-config';

export interface SiteInfo {
  code: string;
  name: string;
  currency: string;
  /** 1 CNY ≈ ? 销售币种，仅作创建店铺时的初值 */
  approxCnyRate: number;
}

export const SITES: readonly SiteInfo[] = [
  { code: 'MY', name: '马来西亚', currency: 'MYR', approxCnyRate: 0.58 },
  { code: 'TH', name: '泰国', currency: 'THB', approxCnyRate: 4.5 },
  { code: 'PH', name: '菲律宾', currency: 'PHP', approxCnyRate: 8.0 },
  { code: 'VN', name: '越南', currency: 'VND', approxCnyRate: 3500 },
  { code: 'SG', name: '新加坡', currency: 'SGD', approxCnyRate: 0.18 },
  { code: 'ID', name: '印度尼西亚', currency: 'IDR', approxCnyRate: 2250 },
];

export function findSite(code: string): SiteInfo | undefined {
  return SITES.find((s) => s.code === code);
}

export interface ShopPreset {
  id: string;
  site: string;
  name: string;
  description: string;
  /** 最近一次核对费率的日期 (YYYY-MM-DD)，null 表示未核对的空白模板 */
  verifiedAt: string | null;
  sources: string[];
  config: ShopConfig;
}

const MY_CROSS_BORDER: ShopPreset = {
  id: 'my-cross-border-2026-10',
  site: 'MY',
  name: '马来西亚 · 跨境店（2026-10）',
  description:
    '按 2026 年 10 月公开资料整理。佣金按类目不同，运动户外多数子类目约 8.10%，泳衣等约 10.26%；物流费为示例值，请按货代/平台运费表修改。',
  verifiedAt: '2026-10-28',
  sources: [
    'https://seller-my.tiktok.com/university/essay?knowledge_id=1882697591703303&lang=en',
    'https://inseller.my/blog/tiktok-shop-seller-fees-malaysia-2026',
    'https://chinadigitalretailreport.substack.com/p/tiktok-shop-watch-6-southeast-asia',
  ],
  config: {
    schemaVersion: 1,
    currency: { sale: 'MYR', cost: 'CNY', rate: 0.58, buffer: 0.02 },
    fees: [
      {
        id: 'commission',
        label: '平台佣金',
        kind: 'percent',
        value: 0.081,
        cap: null,
        maxPrice: null,
        refundOnReturn: true,
        enabled: true,
        note: '含 SST，按类目不同；商品可单独覆盖。2026-10-31 起本地店佣金调整，跨境店请以卖家中心为准',
      },
      {
        id: 'transaction',
        label: '交易手续费',
        kind: 'percent',
        value: 0.0378,
        cap: null,
        maxPrice: null,
        refundOnReturn: true,
        enabled: true,
        note: '含 SST',
      },
      {
        id: 'platform-support',
        label: '平台支持费',
        kind: 'fixed',
        value: 0.54,
        cap: null,
        maxPrice: null,
        refundOnReturn: false,
        enabled: true,
        note: '每笔成功配送订单 RM0.54（含 SST），2026-02-15 起',
      },
      {
        id: 'lvg',
        label: 'LVG 低值商品税',
        kind: 'percent',
        value: 0.1,
        cap: null,
        maxPrice: 500,
        refundOnReturn: true,
        enabled: true,
        note: '跨境低值商品（≤ RM500）10% 销售税',
      },
      {
        id: 'bonus-cashback',
        label: 'Bonus Cashback',
        kind: 'percent',
        value: 0.0486,
        cap: 50,
        maxPrice: null,
        refundOnReturn: true,
        enabled: false,
        note: '自愿参加，含 SST，单笔封顶 RM50',
      },
    ],
    marketing: { affiliateRate: 0.12, adsRate: 0.08 },
    firstLeg: { ratePerKg: 35, minCharge: 5, handlingFee: 2, volumetricDivisor: 6000 },
    lastMile: { firstWeightKg: 0.5, firstWeightFee: 3, stepKg: 0.5, stepFee: 1.5, taxRate: 0.06 },
    returns: { rate: 0.05, resaleRate: 0.5, returnShippingFee: 3 },
    pricing: {
      targetMargins: { drainage: 0.03, profit: 0.15, anchor: 0.3 },
      defaultStrategy: 'profit',
      rounding: { step: 1, ending: 0.9 },
    },
  },
};

function blankPreset(site: SiteInfo): ShopPreset {
  const largeCurrency = site.approxCnyRate >= 100;
  return {
    id: `${site.code.toLowerCase()}-blank`,
    site: site.code,
    name: `${site.name} · 空白模板`,
    description: '尚无社区核对过的费率，请按卖家中心费率表填写，欢迎提交 PR 补充预设。',
    verifiedAt: null,
    sources: [],
    config: {
      schemaVersion: 1,
      currency: { sale: site.currency, cost: 'CNY', rate: site.approxCnyRate, buffer: 0.02 },
      fees: [
        {
          id: 'commission',
          label: '平台佣金',
          kind: 'percent',
          value: 0,
          cap: null,
          maxPrice: null,
          refundOnReturn: true,
          enabled: true,
          note: '请填写',
        },
        {
          id: 'transaction',
          label: '交易手续费',
          kind: 'percent',
          value: 0,
          cap: null,
          maxPrice: null,
          refundOnReturn: true,
          enabled: true,
          note: '请填写',
        },
      ],
      marketing: { affiliateRate: 0.1, adsRate: 0.08 },
      firstLeg: { ratePerKg: 35, minCharge: 5, handlingFee: 2, volumetricDivisor: 6000 },
      lastMile: { firstWeightKg: 0.5, firstWeightFee: 0, stepKg: 0.5, stepFee: 0, taxRate: 0 },
      returns: { rate: 0.05, resaleRate: 0.5, returnShippingFee: 0 },
      pricing: {
        targetMargins: { drainage: 0.03, profit: 0.15, anchor: 0.3 },
        defaultStrategy: 'profit',
        rounding: largeCurrency ? { step: 100, ending: 0 } : { step: 1, ending: 0.9 },
      },
    },
  };
}

export const PRESETS: readonly ShopPreset[] = [
  MY_CROSS_BORDER,
  ...SITES.map(blankPreset),
];

export function findPreset(id: string): ShopPreset | undefined {
  return PRESETS.find((p) => p.id === id);
}
