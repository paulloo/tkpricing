// ============================================
// 备份文件格式
// v2：多店铺 { format, version: 2, shops: [...] }
// v1：旧版单店 { globalParams, products }，导入时自动转换
// ============================================

import { z } from 'zod';
import { createProductSchema, siteSchema, type CreateProductInput } from './contracts';
import { shopConfigSchema, type FeeLine, type ShopConfig } from './shop-config';

export const BACKUP_FORMAT = 'tkpricing-backup';
export const BACKUP_VERSION = 2;

export const backupShopSchema = z.object({
  name: z.string().trim().min(1).max(100),
  site: siteSchema,
  presetId: z.string().max(60).nullable().default(null),
  config: shopConfigSchema,
  products: z.array(createProductSchema).max(5000),
});

export const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.string(),
  shops: z.array(backupShopSchema).min(1).max(50),
});

export type BackupShop = z.infer<typeof backupShopSchema>;
export type Backup = z.infer<typeof backupSchema>;

// ─── v1 兼容 ──────────────────────────────────────────────────────────────────

const num = (fallback: number) => z.number().catch(fallback);

const legacyParamsSchema = z.object({
  exchangeRate: num(0.58),
  shippingRate: num(35),
  handlingFee: num(2),
  minHandlingFee: num(5),
  lastMileFee: num(3),
  commissionRate: num(0.0432),
  transactionFee: num(0.0378),
  lvgTaxRate: num(0.1),
  marketingRate: num(0.054),
  sfpFee: num(0),
  affiliateRate: num(0.15),
  adsRate: num(0.08),
  returnRate: num(0.05),
  returnLossRate: num(0.5),
  targetProfitRate: num(0.2),
  pricingStrategy: z.string().catch('profit'),
});

const nullableNum = z.number().nullable().optional().transform((v) => v ?? null);

const legacySkuSchema = z.object({
  name: z.string().catch(''),
  purchaseCost: num(0),
  domesticShipping: num(0),
  packagingFee: num(0),
  weight: num(0),
  returnRate: nullableNum,
  finalPrice: nullableNum,
  pricingStrategy: z.string().nullable().optional(),
  tiktokSkuId: z.string().optional(),
  currentPrice: nullableNum,
  inventory: nullableNum,
  imageUrl: z.string().optional(),
});

const legacyBackupSchema = z.object({
  globalParams: legacyParamsSchema,
  products: z.array(
    z.object({
      name: z.string().catch(''),
      url: z.string().optional(),
      imageUrl: z.string().optional(),
      isExpanded: z.boolean().catch(true),
      variants: z.array(legacySkuSchema),
    }),
  ),
});

type LegacyParams = z.infer<typeof legacyParamsSchema>;
type LegacySku = z.infer<typeof legacySkuSchema>;

const percentFee = (id: string, label: string, value: number): FeeLine => ({
  id,
  label,
  kind: 'percent',
  value,
  cap: null,
  maxPrice: null,
  refundOnReturn: true,
  enabled: value > 0 || id === 'commission',
  note: '',
});

/** 旧版全局参数 → 店铺配置，口径与 prisma/migrations/20261028000000_multi_shop 一致 */
export function legacyParamsToConfig(p: LegacyParams): ShopConfig {
  const baseStrategies = ['drainage', 'profit', 'anchor'] as const;
  const defaultStrategy = baseStrategies.find((s) => s === p.pricingStrategy) ?? 'profit';
  return shopConfigSchema.parse({
    schemaVersion: 1,
    currency: { sale: 'MYR', cost: 'CNY', rate: p.exchangeRate, buffer: 0 },
    fees: [
      percentFee('commission', '平台佣金', p.commissionRate),
      percentFee('transaction', '交易手续费', p.transactionFee),
      percentFee('lvg', 'LVG 低值商品税', p.lvgTaxRate),
      percentFee('marketing', '营销活动费', p.marketingRate),
      percentFee('sfp', 'SFP 服务费', p.sfpFee),
    ],
    marketing: { affiliateRate: p.affiliateRate, adsRate: p.adsRate },
    firstLeg: {
      ratePerKg: p.shippingRate,
      minCharge: p.minHandlingFee,
      handlingFee: p.handlingFee,
      volumetricDivisor: 6000,
    },
    lastMile: { firstWeightKg: 0, firstWeightFee: p.lastMileFee, stepKg: 0, stepFee: 0, taxRate: 0 },
    returns: { rate: p.returnRate, resaleRate: 1 - p.returnLossRate, returnShippingFee: 0 },
    pricing: {
      targetMargins: { drainage: 0.03, profit: p.targetProfitRate, anchor: 0.3 },
      defaultStrategy,
      rounding: { step: 1, ending: 0 },
    },
  });
}

function legacySkuToInput(v: LegacySku): NonNullable<CreateProductInput['variants']>[number] {
  const strategy = v.pricingStrategy;
  const keep = strategy === 'drainage' || strategy === 'profit' || strategy === 'anchor';
  return {
    skuName: v.name,
    purchaseCost: v.purchaseCost,
    domesticShipping: v.domesticShipping,
    packagingFee: v.packagingFee,
    weightKg: v.weight,
    returnRate: v.returnRate,
    finalPrice: v.finalPrice,
    pricingStrategy: keep ? strategy : null,
    tiktokSkuId: v.tiktokSkuId ?? null,
    currentPrice: v.currentPrice,
    inventory: v.inventory,
    imageUrl: v.imageUrl ?? null,
  };
}

function convertLegacy(legacy: z.infer<typeof legacyBackupSchema>): Backup {
  return backupSchema.parse({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    shops: [
      {
        name: '导入的旧版备份',
        site: 'MY',
        presetId: null,
        config: legacyParamsToConfig(legacy.globalParams),
        products: legacy.products.map((p) => ({
          name: p.name,
          url: p.url ?? null,
          imageUrl: p.imageUrl ?? null,
          isExpanded: p.isExpanded,
          variants: p.variants.map(legacySkuToInput),
        })),
      },
    ],
  });
}

/** 解析任意版本的备份内容，统一返回 v2；无法识别时抛出 ZodError */
export function parseBackup(input: unknown): Backup {
  const v2 = backupSchema.safeParse(input);
  if (v2.success) return v2.data;
  const legacy = legacyBackupSchema.safeParse(input);
  if (legacy.success) return convertLegacy(legacy.data);
  throw v2.error;
}
