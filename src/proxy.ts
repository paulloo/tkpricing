// 可选的 HTTP Basic 认证：设置 BASIC_AUTH_USER 与 BASIC_AUTH_PASSWORD 后启用。
// 本应用没有多用户系统，部署到公网时请务必开启，或放在内网 / VPN 之后。

import { NextResponse, type NextRequest } from 'next/server';

/** 先取 SHA-256 再逐字节比较：长度固定，不泄露凭据长度，比较耗时与内容无关 */
async function digestEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);
  const x = new Uint8Array(da);
  const y = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/** 解析 Basic 认证头；按 UTF-8 解码，支持非 ASCII 密码 */
function decodeBasic(header: string | null): [string, string] | null {
  if (!header?.startsWith('Basic ')) return null;
  try {
    const bytes = Uint8Array.from(atob(header.slice(6)), (ch) => ch.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    const sep = decoded.indexOf(':');
    return sep < 0 ? null : [decoded.slice(0, sep), decoded.slice(sep + 1)];
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const password = process.env.BASIC_AUTH_PASSWORD;
  if (!user || !password) return NextResponse.next();

  const credentials = decodeBasic(request.headers.get('authorization'));
  if (credentials) {
    const [userOk, passwordOk] = await Promise.all([
      digestEqual(credentials[0], user),
      digestEqual(credentials[1], password),
    ]);
    if (userOk && passwordOk) return NextResponse.next();
  }
  return new NextResponse('需要登录', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="tkpricing", charset="UTF-8"' },
  });
}

export const config = {
  // 健康检查不需要认证，便于容器探活
  matcher: ['/((?!api/health|_next/static|_next/image|favicon.ico).*)'],
};
