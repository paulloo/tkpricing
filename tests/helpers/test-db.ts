// 集成测试数据库：优先 TEST_DATABASE_URL，否则在 DATABASE_URL 的库名后加 _test
// 两者都没有时集成测试会被跳过

import 'dotenv/config';

export function testDatabaseUrl(): string | null {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const base = process.env.DATABASE_URL;
  if (!base) return null;
  const url = new URL(base);
  url.pathname = `${url.pathname.replace(/_test$/, '')}_test`;
  return url.toString();
}
