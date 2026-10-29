// 输入框文本 ↔ 数值（百分比字段在界面上显示为 0–100）

export function toDisplay(value: number | null, percent: boolean): string {
  if (value == null) return '';
  const shown = percent ? value * 100 : value;
  return String(Math.round(shown * 1e6) / 1e6);
}

/** 返回 undefined 表示输入无效（应还原），null 表示清空 */
export function parseInput(text: string, percent: boolean, nullable: boolean): number | null | undefined {
  const trimmed = text.trim();
  if (trimmed === '') return nullable ? null : undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return undefined;
  return percent ? n / 100 : n;
}
