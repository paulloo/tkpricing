// 统一的错误提示，store 与组件共用

import { toast } from 'sonner';

export function errorMessage(error: unknown, fallback = '操作失败'): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function notifyError(error: unknown, fallback?: string): void {
  toast.error(errorMessage(error, fallback));
}
