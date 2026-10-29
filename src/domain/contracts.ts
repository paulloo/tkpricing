// ============================================
// 前后端共享契约：DTO 类型 + 请求体校验
// 服务端用 schema 校验请求体；客户端复用同一套类型，避免字段名漂移。
// ============================================

import { z } from 'zod';
import { SITES } from './presets';
import { pricingStrategySchema, shopConfigSchema, type PricingStrategy, type ShopConfig } from './shop-config';

// ─── DTO ──────────────────────────────────────────────────────────────────────

export interface ShopDTO {
  id: string;
  name: string;
  site: string;
  presetId: string | null;
  config: ShopConfig;
  /** 存储的配置无效，已临时使用预设；需要用户检查后保存 */
  configIssue: boolean;
  displayOrder: number;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SkuDTO {
  id: string;
  productId: string;
  skuName: string;
  skuCode: string | null;
  tiktokSkuId: string | null;
  imageUrl: string | null;
  currentPrice: number | null;
  inventory: number | null;
  purchaseCost: number;
  domesticShipping: number;
  packagingFee: number;
  weightKg: number;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  returnRate: number | null;
  finalPrice: number | null;
  pricingStrategy: PricingStrategy | null;
  customMargin: number | null;
}

export interface ProductDTO {
  id: string;
  shopId: string;
  name: string;
  url: string | null;
  description: string | null;
  imageUrl: string | null;
  category: string | null;
  commissionRate: number | null;
  isExpanded: boolean;
  displayOrder: number;
  variants: SkuDTO[];
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

// ─── 请求体 ───────────────────────────────────────────────────────────────────

const money = z.number().min(0).max(1e9);
const rate = z.number().min(0).max(1);
const cm = z.number().positive().max(1000);
const optionalText = (max: number) => z.string().trim().max(max).nullable();

const siteCodes = SITES.map((s) => s.code) as [string, ...string[]];
export const siteSchema = z.enum(siteCodes);

export const skuFieldsSchema = z.object({
  skuName: z.string().trim().max(255),
  skuCode: optionalText(100),
  tiktokSkuId: optionalText(50),
  imageUrl: optionalText(2000),
  currentPrice: money.nullable(),
  inventory: z.number().int().min(0).nullable(),
  purchaseCost: money,
  domesticShipping: money,
  packagingFee: money,
  weightKg: z.number().min(0).max(1000),
  lengthCm: cm.nullable(),
  widthCm: cm.nullable(),
  heightCm: cm.nullable(),
  returnRate: rate.nullable(),
  finalPrice: money.nullable(),
  pricingStrategy: pricingStrategySchema.nullable(),
  customMargin: z.number().min(-1).max(0.95).nullable(),
});

export const createSkuSchema = skuFieldsSchema.partial();
export const updateSkuSchema = skuFieldsSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: '没有要更新的字段' });

export type SkuFields = z.infer<typeof skuFieldsSchema>;
export type CreateSkuInput = z.infer<typeof createSkuSchema>;
export type UpdateSkuInput = z.infer<typeof updateSkuSchema>;

export const productFieldsSchema = z.object({
  name: z.string().trim().max(255),
  url: optionalText(2000),
  description: optionalText(5000),
  imageUrl: optionalText(2000),
  category: optionalText(100),
  commissionRate: rate.nullable(),
  isExpanded: z.boolean(),
  displayOrder: z.number().int().min(0),
});

export const createProductSchema = productFieldsSchema.partial().extend({
  variants: z.array(createSkuSchema).max(200).optional(),
});
export const updateProductSchema = productFieldsSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: '没有要更新的字段' });

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const createShopSchema = z.object({
  name: z.string().trim().min(1).max(100),
  site: siteSchema,
  /** 以预设为起点；与 copyFromShopId 二选一，都不填时用该站点的第一个预设 */
  presetId: z.string().max(60).optional(),
  /** 复制另一家店的配置 */
  copyFromShopId: z.string().uuid().optional(),
});

export const updateShopSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    site: siteSchema,
    config: shopConfigSchema,
    displayOrder: z.number().int().min(0),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: '没有要更新的字段' });

export type CreateShopInput = z.infer<typeof createShopSchema>;
export type UpdateShopInput = z.infer<typeof updateShopSchema>;

export const MAX_IMPORT_PRODUCTS = 2000;

export const importProductsSchema = z.object({
  products: z.array(createProductSchema).min(1).max(MAX_IMPORT_PRODUCTS),
});

export type ImportProductsInput = z.infer<typeof importProductsSchema>;
