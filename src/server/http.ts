// ============================================
// API 路由公共工具：统一响应格式、请求体校验、错误处理
// ============================================

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import type { ZodType } from 'zod';
import type { ApiFailure, ApiSuccess } from '@/domain/contracts';
import { logger } from './logger';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const notFound = (what: string) => new HttpError(404, `${what}不存在`);

export function ok<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

function fail(status: number, error: string, details?: unknown): NextResponse<ApiFailure> {
  return NextResponse.json({ success: false, error, ...(details ? { details } : {}) }, { status });
}

/** 读取并校验 JSON 请求体，失败时抛出 400 */
export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, '请求体不是有效的 JSON');
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HttpError(400, '请求参数无效', result.error.issues);
  }
  return result.data;
}

function toResponse(error: unknown): NextResponse<ApiFailure> {
  if (error instanceof HttpError) return fail(error.status, error.message, error.details);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') return fail(404, '记录不存在');
    if (error.code === 'P2003') return fail(400, '关联的记录不存在');
  }
  logger.error('API 未处理的错误', error);
  return fail(500, '服务器内部错误');
}

type Handler<Ctx> = (request: Request, context: Ctx) => Promise<Response>;

/** 包装路由处理函数，把异常转换成统一的错误响应 */
export function route<Ctx>(handler: Handler<Ctx>): Handler<Ctx> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return toResponse(error);
    }
  };
}

export interface IdParams<K extends string> {
  params: Promise<Record<K, string>>;
}
