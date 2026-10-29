// GET /api/shops/:shopId/export — 导出单个店铺的备份

import { ok, route, type IdParams } from '@/server/http';
import { exportBackup } from '@/server/services/backup-service';

type Ctx = IdParams<'shopId'>;

export const GET = route<Ctx>(async (_request, { params }) => {
  const { shopId } = await params;
  return ok(await exportBackup(shopId));
});
