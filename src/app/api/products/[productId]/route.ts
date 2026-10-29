// PATCH / DELETE /api/products/:productId

import { updateProductSchema } from '@/domain/contracts';
import { ok, readJson, route, type IdParams } from '@/server/http';
import { deleteProduct, updateProduct } from '@/server/repositories/product-repository';

type Ctx = IdParams<'productId'>;

export const PATCH = route<Ctx>(async (request, { params }) => {
  const { productId } = await params;
  const input = await readJson(request, updateProductSchema);
  return ok(await updateProduct(productId, input));
});

export const DELETE = route<Ctx>(async (_request, { params }) => {
  const { productId } = await params;
  await deleteProduct(productId);
  return ok({ id: productId });
});
