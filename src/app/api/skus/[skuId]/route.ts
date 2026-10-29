// PATCH / DELETE /api/skus/:skuId

import { updateSkuSchema } from '@/domain/contracts';
import { ok, readJson, route, type IdParams } from '@/server/http';
import { deleteSku, updateSku } from '@/server/repositories/product-repository';

type Ctx = IdParams<'skuId'>;

export const PATCH = route<Ctx>(async (request, { params }) => {
  const { skuId } = await params;
  const input = await readJson(request, updateSkuSchema);
  return ok(await updateSku(skuId, input));
});

export const DELETE = route<Ctx>(async (_request, { params }) => {
  const { skuId } = await params;
  await deleteSku(skuId);
  return ok({ id: skuId });
});
