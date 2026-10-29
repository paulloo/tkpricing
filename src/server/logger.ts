// 服务端日志：开源项目保持零依赖，自托管时可替换为 pino 等

type Level = 'info' | 'warn' | 'error';

function write(level: Level, message: string, error?: unknown): void {
  const detail = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error;
  const line = JSON.stringify({ level, time: new Date().toISOString(), message, ...(detail ? { detail } : {}) });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
}

export const logger = {
  info: (message: string) => write('info', message),
  warn: (message: string, error?: unknown) => write('warn', message, error),
  error: (message: string, error?: unknown) => write('error', message, error),
};
