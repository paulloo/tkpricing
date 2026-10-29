import { describe, expect, it } from 'vitest';
import { formatDimensions, parseDimensions } from './parse-dimensions';

describe('parseDimensions', () => {
  it.each(['60x40x25', '60*40*25', '60 40 25', '60×40×25', ' 60 x 40 x 25 '])('解析 %s', (text) => {
    expect(parseDimensions(text)).toEqual({ lengthCm: 60, widthCm: 40, heightCm: 25 });
  });

  it('空字符串清空尺寸', () => {
    expect(parseDimensions('')).toEqual({ lengthCm: null, widthCm: null, heightCm: null });
  });

  it.each(['60x40', 'axbxc', '0x1x1', '60x40x2000'])('拒绝无效输入 %s', (text) => {
    expect(parseDimensions(text)).toBeNull();
  });

  it('格式化', () => {
    expect(formatDimensions({ lengthCm: 60, widthCm: 40, heightCm: 25.5 })).toBe('60×40×25.5');
    expect(formatDimensions({ lengthCm: 60, widthCm: null, heightCm: 25 })).toBe('');
  });
});
