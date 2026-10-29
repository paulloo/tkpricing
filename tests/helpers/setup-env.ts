// 在任何业务模块（含 prisma 单例）加载之前，把连接指向测试库

import { testDatabaseUrl } from './test-db';

const url = testDatabaseUrl();
if (url) process.env.DATABASE_URL = url;
