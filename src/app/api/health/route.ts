// GET /api/health — 健康检查（Docker / 反向代理探活）

import { prisma } from '@/lib/prisma';
import { ok, route } from '@/server/http';

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  await prisma.$queryRaw`SELECT 1`;
  return ok({ status: 'ok' });
});
