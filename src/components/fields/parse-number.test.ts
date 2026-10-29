import { describe, expect, it } from 'vitest';
import { parseInput, toDisplay } from './parse-number';

describe('parse-number', () => {
  it('百分比字段显示为 0–100，并去掉浮点尾巴', () => {
    expect(toDisplay(0.0378, true)).toBe('3.78');
    expect(toDisplay(0.07, true)).toBe('7');
    expect(toDisplay(null, true)).toBe('');
  });

  it('解析输入', () => {
    expect(parseInput('3.78', true, false)).toBeCloseTo(0.0378);
    expect(parseInput(' 12 ', false, false)).toBe(12);
    expect(parseInput('', false, true)).toBeNull();
    expect(parseInput('', false, false)).toBeUndefined();
    expect(parseInput('abc', false, true)).toBeUndefined();
  });
});
