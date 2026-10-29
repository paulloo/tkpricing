// ============================================
// 妙手 ERP 商品导出 CSV 解析
// ============================================

import type { CreateProductInput } from '../contracts';

/** 妙手导出 CSV 的列索引 */
const COL = {
  TIKTOK_SKU_ID: 0,
  GLOBAL_PRODUCT_ID: 2,
  PRODUCT_NAME: 3,
  SPEC: 10,
  CURRENT_PRICE: 12,
  INVENTORY: 13,
  SKU_IMAGE: 14,
  PRODUCT_IMAGES: 15,
  WEIGHT: 16,
  SOURCE_URL: 22,
  PURCHASE_COST: 24,
} as const;

const MIN_COLUMNS = COL.PURCHASE_COST + 1;

/** RFC 4180 风格的 CSV 解析：支持引号、"" 转义和字段内换行 */
export function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    if (row.some((cell) => cell.trim() !== '')) rows.push(row);
    row = [];
  };

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      endField();
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i++;
      endRow();
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) endRow();
  return rows;
}

function toNumber(raw: string | undefined): number | null {
  const value = Number.parseFloat((raw ?? '').trim());
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export interface MiaoshouParseOptions {
  weightUnit?: 'kg' | 'g';
}

export interface MiaoshouParseResult {
  products: CreateProductInput[];
  /** 缺少全球产品 ID 或列数不足而跳过的行数 */
  skippedRows: number;
}

export function parseMiaoshouCsv(text: string, options: MiaoshouParseOptions = {}): MiaoshouParseResult {
  const weightFactor = options.weightUnit === 'g' ? 0.001 : 1;
  const [, ...dataRows] = parseCsv(text);
  const groups = new Map<string, CreateProductInput>();
  let skippedRows = 0;

  for (const cols of dataRows) {
    const groupId = cols[COL.GLOBAL_PRODUCT_ID]?.trim();
    if (cols.length < MIN_COLUMNS || !groupId) {
      skippedRows++;
      continue;
    }

    const existing = groups.get(groupId) ?? {
      name: cols[COL.PRODUCT_NAME].trim(),
      url: cols[COL.SOURCE_URL].trim() || null,
      imageUrl: cols[COL.PRODUCT_IMAGES].split(',')[0].trim() || null,
      isExpanded: true,
      variants: [],
    };

    const sku = {
      skuName: cols[COL.SPEC].trim(),
      tiktokSkuId: cols[COL.TIKTOK_SKU_ID].trim() || null,
      imageUrl: cols[COL.SKU_IMAGE].trim() || null,
      purchaseCost: toNumber(cols[COL.PURCHASE_COST]) ?? 0,
      weightKg: (toNumber(cols[COL.WEIGHT]) ?? 0) * weightFactor,
      currentPrice: toNumber(cols[COL.CURRENT_PRICE]),
      inventory: (() => {
        const n = toNumber(cols[COL.INVENTORY]);
        return n == null ? null : Math.floor(n);
      })(),
    };

    groups.set(groupId, { ...existing, variants: [...(existing.variants ?? []), sku] });
  }

  return { products: [...groups.values()], skippedRows };
}
