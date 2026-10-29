// 数据库记录 → DTO（Decimal → number，Date → ISO 字符串）

import type { Prisma, Product, Shop, SKU } from '@prisma/client';
import type { ProductDTO, ShopDTO, SkuDTO } from '@/domain/contracts';
import { PRESETS } from '@/domain/presets';
import { pricingStrategySchema, shopConfigSchema, type PricingStrategy, type ShopConfig } from '@/domain/shop-config';
import { logger } from './logger';

type Decimalish = Prisma.Decimal | null;

const num = (d: Prisma.Decimal): number => d.toNumber();
const numOrNull = (d: Decimalish): number | null => (d == null ? null : d.toNumber());

function strategyOrNull(value: string | null): PricingStrategy | null {
  const parsed = pricingStrategySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function toSkuDTO(sku: SKU): SkuDTO {
  return {
    id: sku.id,
    productId: sku.productId,
    skuName: sku.skuName,
    skuCode: sku.skuCode,
    tiktokSkuId: sku.tiktokSkuId,
    imageUrl: sku.imageUrl,
    currentPrice: numOrNull(sku.currentPrice),
    inventory: sku.inventory,
    purchaseCost: num(sku.purchaseCost),
    domesticShipping: num(sku.domesticShipping),
    packagingFee: num(sku.packagingFee),
    weightKg: num(sku.weight),
    lengthCm: numOrNull(sku.lengthCm),
    widthCm: numOrNull(sku.widthCm),
    heightCm: numOrNull(sku.heightCm),
    returnRate: numOrNull(sku.returnRate),
    finalPrice: numOrNull(sku.finalPrice),
    pricingStrategy: strategyOrNull(sku.pricingStrategy),
    customMargin: numOrNull(sku.customMargin),
  };
}

export function toProductDTO(product: Product & { variants: SKU[] }): ProductDTO {
  return {
    id: product.id,
    shopId: product.shopId,
    name: product.name,
    url: product.url,
    description: product.description,
    imageUrl: product.imageUrl,
    category: product.category,
    commissionRate: numOrNull(product.commissionRate),
    isExpanded: product.isExpanded,
    displayOrder: product.displayOrder,
    variants: product.variants.map(toSkuDTO),
  };
}

/** 数据库中的配置无法通过校验时（手工改库、旧版本遗留），回退到站点预设，避免整个应用无法加载 */
function readStoredConfig(shopId: string, site: string, raw: unknown): { config: ShopConfig; configIssue: boolean } {
  const parsed = shopConfigSchema.safeParse(raw);
  if (parsed.success) return { config: parsed.data, configIssue: false };
  logger.warn(`店铺 ${shopId} 的配置无效，已回退到预设`, parsed.error.issues);
  const fallback = PRESETS.find((p) => p.site === site) ?? PRESETS[0];
  return { config: fallback.config, configIssue: true };
}

export function toShopDTO(shop: Shop & { _count?: { products: number } }): ShopDTO {
  return {
    id: shop.id,
    name: shop.name,
    site: shop.site,
    presetId: shop.presetId,
    ...readStoredConfig(shop.id, shop.site, shop.config),
    displayOrder: shop.displayOrder,
    productCount: shop._count?.products ?? 0,
    createdAt: shop.createdAt.toISOString(),
    updatedAt: shop.updatedAt.toISOString(),
  };
}
