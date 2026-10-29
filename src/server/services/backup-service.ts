// 备份导出 / 恢复（恢复总是新建店铺，不覆盖已有数据；整份备份在一个事务里，失败则全部回滚）

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BACKUP_FORMAT, BACKUP_VERSION, type Backup, type BackupShop } from '@/domain/backup';
import type { CreateProductInput, ProductDTO, ShopDTO } from '@/domain/contracts';
import { listProducts, importProducts } from '../repositories/product-repository';
import { listShops, findShop } from '../repositories/shop-repository';

function productToInput({ id: _id, shopId: _shopId, variants, ...fields }: ProductDTO): CreateProductInput {
  return {
    ...fields,
    variants: variants.map(({ id: _skuId, productId: _productId, ...sku }) => sku),
  };
}

async function shopToBackup(shop: ShopDTO): Promise<BackupShop> {
  const products = await listProducts(shop.id);
  return {
    name: shop.name,
    site: shop.site,
    presetId: shop.presetId,
    config: shop.config,
    products: products.map(productToInput),
  };
}

export async function exportBackup(shopId?: string): Promise<Backup> {
  const shops = shopId ? [await findShop(shopId)] : await listShops();
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    shops: await Promise.all(shops.map(shopToBackup)),
  };
}

export interface RestoreResult {
  shops: number;
  products: number;
  skus: number;
}

/** 大备份导入可能较慢，放宽交互式事务的超时 */
const RESTORE_TIMEOUT_MS = 120_000;

export async function restoreBackup(backup: Backup): Promise<RestoreResult> {
  return prisma.$transaction(
    async (tx) => {
      const totals = { shops: 0, products: 0, skus: 0 };
      for (const shop of backup.shops) {
        const created = await tx.shop.create({
          data: {
            name: shop.name,
            site: shop.site,
            presetId: shop.presetId,
            config: shop.config as unknown as Prisma.InputJsonValue,
          },
        });
        totals.shops++;
        if (shop.products.length === 0) continue;
        const counts = await importProducts(created.id, shop.products, tx);
        totals.products += counts.products;
        totals.skus += counts.skus;
      }
      return totals;
    },
    { timeout: RESTORE_TIMEOUT_MS },
  );
}
