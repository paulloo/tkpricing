// POST /api/shops/:shopId/import — 批量导入商品（妙手 CSV 解析后的数据等）

import { importProductsSchema } from '@/domain/contracts';
import { ok, readJson, route, type IdParams } from '@/server/http';
import { assertShopExists, importProducts } from '@/server/repositories/product-repository';

type Ctx = IdParams<'shopId'>;

export const POST = route<Ctx>(async (request, { params }) => {
  const { shopId } = await params;
  const { products } = await readJson(request, importProductsSchema);
  await assertShopExists(shopId);
  return ok(await importProducts(shopId, products), 201);
});
