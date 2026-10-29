// "60x40x25" / "60*40*25" / "60 40 25" ↔ 长宽高

export interface Dims {
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
}

const MAX_CM = 1000;

/** 返回 null 表示输入无效；空字符串表示清空尺寸 */
export function parseDimensions(text: string): Dims | null {
  const trimmed = text.trim();
  if (trimmed === '') return { lengthCm: null, widthCm: null, heightCm: null };
  const parts = trimmed.split(/\s*[x×*,\s]\s*/i).filter(Boolean).map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n) || n <= 0 || n > MAX_CM)) return null;
  const [lengthCm, widthCm, heightCm] = parts;
  return { lengthCm, widthCm, heightCm };
}

export function formatDimensions(d: Dims): string {
  if (d.lengthCm == null || d.widthCm == null || d.heightCm == null) return '';
  return `${d.lengthCm}×${d.widthCm}×${d.heightCm}`;
}
