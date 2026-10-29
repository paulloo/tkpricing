// GET / PATCH / DELETE /api/shops/:shopId

import { updateShopSchema } from '@/domain/contracts';
import { ok, readJson, route, type IdParams } from '@/server/http';
import { deleteShop, findShop, updateShop } from '@/server/repositories/shop-repository';

type Ctx = IdParams<'shopId'>;

export const GET = route<Ctx>(async (_request, { params }) => {
  const { shopId } = await params;
  return ok(await findShop(shopId));
});

export const PATCH = route<Ctx>(async (request, { params }) => {
  const { shopId } = await params;
  const input = await readJson(request, updateShopSchema);
  return ok(await updateShop(shopId, input));
});

export const DELETE = route<Ctx>(async (_request, { params }) => {
  const { shopId } = await params;
  await deleteShop(shopId);
  return ok({ id: shopId });
});
