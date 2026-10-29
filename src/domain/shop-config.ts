// ============================================
// 店铺配置 — 每个店铺一份，保存在 shops.config (JSON)
// 平台费率变化频繁且各站点结构不同，所以费用项是一组可增删的"费用行"，
// 而不是写死在数据库列里。
// ============================================

import { z } from 'zod';

export const SHOP_CONFIG_SCHEMA_VERSION = 1;

const rate = z.number().min(0).max(1);
const amount = z.number().min(0);

/** 一条平台扣费规则（佣金、交易手续费、LVG 税、平台支持费……） */
export const feeLineSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(40),
  /** percent: 按售价比例收取；fixed: 每单固定金额（销售币种） */
  kind: z.enum(['percent', 'fixed']),
  value: z.number().min(0),
  /** 单笔封顶金额（仅 percent），如 Bonus Cashback 封顶 RM50 */
  cap: amount.nullable().default(null),
  /** 仅当售价 ≤ 此值时收取，如 LVG 仅对 ≤ RM500 的商品征收 */
  maxPrice: amount.nullable().default(null),
  /** 退货/退款时平台是否退还该费用 */
  refundOnReturn: z.boolean().default(true),
  enabled: z.boolean().default(true),
  note: z.string().max(200).default(''),
});

export const pricingStrategySchema = z.enum(['drainage', 'profit', 'anchor', 'custom']);

export const shopConfigSchema = z.object({
  schemaVersion: z.literal(SHOP_CONFIG_SCHEMA_VERSION).default(SHOP_CONFIG_SCHEMA_VERSION),
  currency: z.object({
    /** 销售币种，如 MYR */
    sale: z.string().min(3).max(3),
    /** 成本币种（采购/头程），通常 CNY */
    cost: z.string().min(3).max(3),
    /** 1 单位成本币种 = rate 单位销售币种 */
    rate: z.number().positive(),
    /** 汇率缓冲：按更差的汇率计算成本，抵御波动 */
    buffer: rate,
  }),
  fees: z.array(feeLineSchema).max(30),
  marketing: z.object({
    /** 达人佣金（按售价，退货时不结算） */
    affiliateRate: rate,
    /** 广告费占售价比例（退货时不返还） */
    adsRate: rate,
  }),
  /** 头程（成本币种） */
  firstLeg: z.object({
    ratePerKg: amount,
    minCharge: amount,
    handlingFee: amount,
    /** 体积重除数（cm³/kg），0 表示不计体积重 */
    volumetricDivisor: z.number().min(0),
  }),
  /** 尾程/平台物流（销售币种）：首重 + 续重 */
  lastMile: z.object({
    firstWeightKg: amount,
    firstWeightFee: amount,
    stepKg: amount,
    stepFee: amount,
    /** 运费上加收的税，如马来西亚 2026-09 起运费 6% SST */
    taxRate: rate,
  }),
  returns: z.object({
    /** 退货率（每 100 单退几单） */
    rate: rate,
    /** 退回商品可二次销售的比例 */
    resaleRate: rate,
    /** 每笔退货卖家承担的退货运费（销售币种） */
    returnShippingFee: amount,
  }),
  pricing: z.object({
    /** 各策略的目标"期望净利率" */
    targetMargins: z.object({
      drainage: z.number().min(-1).max(0.95),
      profit: z.number().min(-1).max(0.95),
      anchor: z.number().min(-1).max(0.95),
    }),
    defaultStrategy: pricingStrategySchema.exclude(['custom']),
    /** 价格尾数：向上取到 step 的整数倍再加 ending，如 step=1, ending=0.9 → 12.90 */
    rounding: z.object({
      step: z.number().positive(),
      ending: amount,
    }),
  }),
});

export type FeeLine = z.infer<typeof feeLineSchema>;
export type ShopConfig = z.infer<typeof shopConfigSchema>;
export type PricingStrategy = z.infer<typeof pricingStrategySchema>;
export type BaseStrategy = Exclude<PricingStrategy, 'custom'>;

/** 解析外部来的配置（数据库 JSON、导入文件），失败时抛出 ZodError */
export function parseShopConfig(input: unknown): ShopConfig {
  return shopConfigSchema.parse(input);
}
