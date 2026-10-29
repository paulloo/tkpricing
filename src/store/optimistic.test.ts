import { describe, expect, it } from 'vitest';
import { pick, reinsert, rollback } from './optimistic';

describe('rollback', () => {
  it('还原本次写入的字段', () => {
    expect(rollback({ a: 2, b: 'x' }, { a: 2 }, { a: 1 })).toEqual({ a: 1, b: 'x' });
  });

  it('字段已被后续修改覆盖时保留新值', () => {
    // 第一次请求写入 a=2，随后用户改成 3 并成功；第一次请求失败不应把 3 改回 1
    expect(rollback({ a: 3 }, { a: 2 }, { a: 1 })).toEqual({ a: 3 });
  });

  it('不修改入参', () => {
    const current = { a: 2 };
    rollback(current, { a: 2 }, { a: 1 });
    expect(current).toEqual({ a: 2 });
  });
});

describe('reinsert', () => {
  it('放回原位置', () => {
    expect(reinsert([{ id: 'a' }, { id: 'c' }], { id: 'b' }, 1).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('已存在时不重复插入', () => {
    const list = [{ id: 'a' }];
    expect(reinsert(list, { id: 'a' }, 0)).toBe(list);
  });
});

describe('pick', () => {
  it('取出指定字段', () => {
    expect(pick({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });
});
