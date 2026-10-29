// GET /api/backup — 导出全部店铺；POST /api/backup — 恢复备份（新建店铺，兼容旧版 v1 格式）

import { z, ZodError } from 'zod';
import { parseBackup, type Backup } from '@/domain/backup';
import { HttpError, ok, readJson, route } from '@/server/http';
import { exportBackup, restoreBackup } from '@/server/services/backup-service';

export const GET = route(async () => ok(await exportBackup()));

export const POST = route(async (request) => {
  const raw = await readJson(request, z.unknown());
  let backup: Backup;
  try {
    backup = parseBackup(raw);
  } catch (error) {
    if (error instanceof ZodError) throw new HttpError(400, '无法识别的备份文件', error.issues);
    throw error;
  }
  return ok(await restoreBackup(backup), 201);
});
