// ============================================
// 妙手商品导入对话框
// 解析妙手 CSV 导出文件，映射到 tkpricing 数据结构
// ============================================

import { useState, useRef, useCallback } from 'react';
import { useStore, type ImportProductPayload } from '@/store/useStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, AlertCircle, CheckCircle2, Package } from 'lucide-react';

// ─── 妙手 CSV 列索引 ──────────────────────────────────────────────────────────
const COL = {
  TIKTOK_SKU_ID: 0,
  PRODUCT_ID: 1,
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

// ─── 解析后的数据结构 ──────────────────────────────────────────────────────────
interface ParsedSKU {
  tiktokSkuId: string;
  skuName: string;
  purchaseCost: number;
  weight: number;
  currentPrice: number;
  inventory: number;
  imageUrl: string;
  // 默认值（导入前填写）
  domesticShipping: number;
  packagingFee: number;
}

interface ParsedProduct {
  globalProductId: string;
  name: string;
  url: string;
  imageUrl: string;
  variants: ParsedSKU[];
}

// ─── CSV 解析（处理带引号的多值字段）────────────────────────────────────────────
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseMiaoshouCSV(text: string): ParsedProduct[] {
  // 去除 BOM
  const cleaned = text.replace(/^\uFEFF/, '');
  const lines = cleaned.split('\n').filter((l) => l.trim());

  if (lines.length < 2) return [];

  // 跳过标题行
  const dataLines = lines.slice(1);

  // 按 全球产品ID 分组
  const productMap = new Map<string, ParsedProduct>();

  for (const line of dataLines) {
    const cols = parseCSVLine(line);
    if (cols.length < 25) continue;

    const globalProductId = cols[COL.GLOBAL_PRODUCT_ID].trim();
    if (!globalProductId) continue;

    const productName = cols[COL.PRODUCT_NAME].trim();
    const sourceUrl = cols[COL.SOURCE_URL].trim();
    // 产品主图取逗号分隔列表中的第一张
    const firstImage = cols[COL.PRODUCT_IMAGES].split(',')[0].trim();

    if (!productMap.has(globalProductId)) {
      productMap.set(globalProductId, {
        globalProductId,
        name: productName,
        url: sourceUrl,
        imageUrl: firstImage,
        variants: [],
      });
    }

    const product = productMap.get(globalProductId)!;

    const tiktokSkuId = cols[COL.TIKTOK_SKU_ID].trim();
    const skuName = cols[COL.SPEC].trim();
    const purchaseCost = parseFloat(cols[COL.PURCHASE_COST]) || 0;
    const weight = parseFloat(cols[COL.WEIGHT]) || 0;
    const currentPrice = parseFloat(cols[COL.CURRENT_PRICE]) || 0;
    const inventory = parseInt(cols[COL.INVENTORY], 10) || 0;
    const imageUrl = cols[COL.SKU_IMAGE].trim();

    product.variants.push({
      tiktokSkuId,
      skuName,
      purchaseCost,
      weight,
      currentPrice,
      inventory,
      imageUrl,
      domesticShipping: 0,
      packagingFee: 0,
    });
  }

  return Array.from(productMap.values());
}

// ─── 组件 Props ───────────────────────────────────────────────────────────────
interface MiaoshouImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── 主组件 ───────────────────────────────────────────────────────────────────
export function MiaoshouImportDialog({ open, onOpenChange }: MiaoshouImportDialogProps) {
  const { importData } = useStore();

  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedProduct[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [defaultDomesticShipping, setDefaultDomesticShipping] = useState('0');
  const [defaultPackagingFee, setDefaultPackagingFee] = useState('0');
  const [isImporting, setIsImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    setParseError('');
    setParsed(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const products = parseMiaoshouCSV(text);
        if (products.length === 0) {
          setParseError('未解析到有效商品，请确认文件为妙手导出的 CSV 格式');
        } else {
          setParsed(products);
        }
      } catch {
        setParseError('文件解析失败，请检查文件格式');
      }
    };
    reader.readAsText(file, 'utf-8');
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith('.csv')) handleFile(file);
  };

  const totalSKUs = parsed?.reduce((sum, p) => sum + p.variants.length, 0) ?? 0;

  const handleImport = async () => {
    if (!parsed) return;
    setIsImporting(true);

    const domesticShipping = parseFloat(defaultDomesticShipping) || 0;
    const packagingFee = parseFloat(defaultPackagingFee) || 0;

    const products: ImportProductPayload[] = parsed.map((p) => ({
      name: p.name,
      url: p.url || undefined,
      imageUrl: p.imageUrl || undefined,
      isExpanded: true,
      variants: p.variants.map((v) => ({
        skuName: v.skuName,
        tiktokSkuId: v.tiktokSkuId || undefined,
        imageUrl: v.imageUrl || undefined,
        purchaseCost: v.purchaseCost,
        domesticShipping,
        packagingFee,
        weight: v.weight,
        currentPrice: v.currentPrice || undefined,
        inventory: v.inventory || undefined,
      })),
    }));

    try {
      await importData({ products });
      onOpenChange(false);
      reset();
    } finally {
      setIsImporting(false);
    }
  };

  const reset = () => {
    setParsed(null);
    setFileName('');
    setParseError('');
    setDefaultDomesticShipping('0');
    setDefaultPackagingFee('0');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => {
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-500" />
            导入妙手商品
          </DialogTitle>
          <DialogDescription>
            上传从妙手导出的商品 CSV 文件，自动解析并导入商品与 SKU
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 文件上传区 */}
          {!parsed && (
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                isDragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">点击或拖拽上传 CSV 文件</p>
              <p className="text-xs text-slate-500 mt-1">妙手 → 商品管理 → 导出 → CSV 格式</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* 解析错误 */}
          {parseError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{parseError}</p>
            </div>
          )}

          {/* 解析预览 */}
          {parsed && (
            <>
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-800 truncate">{fileName}</p>
                  <p className="text-xs text-green-600">
                    解析成功：{parsed.length} 个商品，{totalSKUs} 个 SKU
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-slate-500"
                  onClick={reset}
                >
                  重选
                </Button>
              </div>

              {/* 商品预览列表 */}
              <div className="border rounded-md overflow-hidden max-h-40 overflow-y-auto">
                {parsed.map((p) => (
                  <div key={p.globalProductId} className="flex items-center gap-2 px-3 py-2 border-b last:border-b-0 text-xs">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 bg-slate-100 rounded shrink-0 flex items-center justify-center">
                        <FileText className="h-3 w-3 text-slate-400" />
                      </div>
                    )}
                    <span className="flex-1 truncate text-slate-700">{p.name}</span>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {p.variants.length} SKU
                    </Badge>
                  </div>
                ))}
              </div>

              {/* 默认成本设置 */}
              <div className="space-y-3 p-3 bg-slate-50 rounded-md">
                <p className="text-xs font-medium text-slate-600">导入默认值（可导入后单独修改）</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">国内段运费（RMB）</Label>
                    <Input
                      type="number"
                      value={defaultDomesticShipping}
                      onChange={(e) => setDefaultDomesticShipping(e.target.value)}
                      min={0}
                      step={0.1}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">包装/贴标费（RMB）</Label>
                    <Input
                      type="number"
                      value={defaultPackagingFee}
                      onChange={(e) => setDefaultPackagingFee(e.target.value)}
                      min={0}
                      step={0.1}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>
            取消
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parsed || isImporting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isImporting ? '导入中...' : `导入 ${totalSKUs > 0 ? `${totalSKUs} 个 SKU` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
