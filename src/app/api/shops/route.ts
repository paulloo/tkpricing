// GET /api/shops — 店铺列表；POST /api/shops — 新建店铺（基于预设或复制已有店铺）

import { createShopSchema } from '@/domain/contracts';
import { ok, readJson, route } from '@/server/http';
import { createShop, listShops } from '@/server/repositories/shop-repository';

export const GET = route(async () => ok(await listShops()));

export const POST = route(async (request) => {
  const input = await readJson(request, createShopSchema);
  return ok(await createShop(input), 201);
});
