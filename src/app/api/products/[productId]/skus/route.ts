// POST /api/products/:productId/skus — 新建 SKU

import { createSkuSchema } from '@/domain/contracts';
import { ok, readJson, route, type IdParams } from '@/server/http';
import { createSku } from '@/server/repositories/product-repository';

type Ctx = IdParams<'productId'>;

export const POST = route<Ctx>(async (request, { params }) => {
  const { productId } = await params;
  const input = await readJson(request, createSkuSchema);
  return ok(await createSku(productId, input), 201);
});
