// GET /api/presets — 站点列表与费率预设

import { PRESETS, SITES } from '@/domain/presets';
import { ok, route } from '@/server/http';

export const GET = route(async () => ok({ sites: SITES, presets: PRESETS }));
