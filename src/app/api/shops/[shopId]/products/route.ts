// GET /api/shops/:shopId/products — 店铺商品（含 SKU）；POST — 新建商品

import { createProductSchema } from '@/domain/contracts';
import { ok, readJson, route, type IdParams } from '@/server/http';
import { assertShopExists, createProduct, listProducts } from '@/server/repositories/product-repository';

type Ctx = IdParams<'shopId'>;

export const GET = route<Ctx>(async (_request, { params }) => {
  const { shopId } = await params;
  await assertShopExists(shopId);
  return ok(await listProducts(shopId));
});

export const POST = route<Ctx>(async (request, { params }) => {
  const { shopId } = await params;
  const input = await readJson(request, createProductSchema);
  await assertShopExists(shopId);
  return ok(await createProduct(shopId, input), 201);
});
