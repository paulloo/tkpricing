// 商品与 SKU 数据访问

import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type {
  CreateProductInput,
  CreateSkuInput,
  ProductDTO,
  SkuDTO,
  UpdateProductInput,
  UpdateSkuInput,
} from '@/domain/contracts';
import { notFound } from '../http';
import { toProductDTO, toSkuDTO } from '../mappers';

const withVariants = { variants: { orderBy: { createdAt: 'asc' } } } as const;

type SkuData = Omit<Prisma.SKUUncheckedCreateInput, 'productId'>;

/** 契约字段 → 数据库字段（只有 weightKg 与列名不同） */
function skuData(input: CreateSkuInput | UpdateSkuInput): SkuData {
  const { weightKg, ...rest } = input;
  return { ...rest, ...(weightKg !== undefined ? { weight: weightKg } : {}) };
}

async function nextDisplayOrder(shopId: string, db: Db = prisma): Promise<number> {
  const last = await db.product.findFirst({
    where: { shopId },
    orderBy: { displayOrder: 'desc' },
    select: { displayOrder: true },
  });
  return (last?.displayOrder ?? -1) + 1;
}

export async function listProducts(shopId: string): Promise<ProductDTO[]> {
  const products = await prisma.product.findMany({
    where: { shopId },
    include: withVariants,
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return products.map(toProductDTO);
}

export async function createProduct(shopId: string, input: CreateProductInput): Promise<ProductDTO> {
  const { variants, ...fields } = input;
  const product = await prisma.product.create({
    data: {
      ...fields,
      displayOrder: fields.displayOrder ?? (await nextDisplayOrder(shopId)),
      shopId,
      variants: { create: (variants?.length ? variants : [{}]).map(skuData) },
    },
    include: withVariants,
  });
  return toProductDTO(product);
}

export async function updateProduct(id: string, input: UpdateProductInput): Promise<ProductDTO> {
  const product = await prisma.product.update({
    where: { id },
    data: input,
    include: withVariants,
  });
  return toProductDTO(product);
}

export async function deleteProduct(id: string): Promise<void> {
  await prisma.product.delete({ where: { id } });
}

type Db = Prisma.TransactionClient;

/**
 * 批量导入：预先生成 id，用两条 createMany 完成。
 * 传入 tx 时在调用方的事务中执行（用于恢复备份），否则自行开启事务。
 */
export async function importProducts(
  shopId: string,
  products: CreateProductInput[],
  tx?: Db,
): Promise<{ products: number; skus: number }> {
  const db = tx ?? prisma;
  const start = await nextDisplayOrder(shopId, db);
  const rows = products.map(({ variants, ...fields }, i) => ({
    product: { ...fields, id: randomUUID(), shopId, displayOrder: start + i },
    variants: variants?.length ? variants : [{}],
  }));
  const skuRows = rows.flatMap(({ product, variants }) =>
    variants.map((v) => ({ ...skuData(v), productId: product.id })),
  );

  const write = async (client: Db) => {
    await client.product.createMany({ data: rows.map((r) => r.product) });
    await client.sKU.createMany({ data: skuRows });
  };
  if (tx) await write(tx);
  else await prisma.$transaction(write);
  return { products: rows.length, skus: skuRows.length };
}

export async function assertShopExists(shopId: string): Promise<void> {
  const shop = await prisma.shop.findUnique({ where: { id: shopId }, select: { id: true } });
  if (!shop) throw notFound('店铺');
}

export async function createSku(productId: string, input: CreateSkuInput): Promise<SkuDTO> {
  const sku = await prisma.sKU.create({ data: { ...skuData(input), productId } });
  return toSkuDTO(sku);
}

export async function updateSku(id: string, input: UpdateSkuInput): Promise<SkuDTO> {
  const sku = await prisma.sKU.update({ where: { id }, data: skuData(input) });
  return toSkuDTO(sku);
}

export async function deleteSku(id: string): Promise<void> {
  await prisma.sKU.delete({ where: { id } });
}
