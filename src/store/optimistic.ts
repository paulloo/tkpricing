// 乐观更新的回滚工具（纯函数）

/** 取出 patch 涉及字段的旧值，用于失败回滚 */
export function pick<T extends object>(source: T, keys: readonly (keyof T)[]): Partial<T> {
  return Object.fromEntries(keys.map((k) => [k, source[k]])) as Partial<T>;
}

/**
 * 失败回滚：只还原仍等于本次写入值的字段。
 * 若期间用户又改了同一字段（后一次请求已成功），保留较新的值。
 */
export function rollback<T extends object>(current: T, written: Partial<T>, previous: Partial<T>): T {
  const keys = (Object.keys(written) as (keyof T)[]).filter((k) => current[k] === written[k]);
  return { ...current, ...pick(previous as T, keys) };
}

/** 把删除失败的元素放回原来的位置（已存在则不重复插入） */
export function reinsert<T extends { id: string }>(list: T[], item: T, index: number): T[] {
  if (list.some((x) => x.id === item.id)) return list;
  return [...list.slice(0, index), item, ...list.slice(index)];
}
