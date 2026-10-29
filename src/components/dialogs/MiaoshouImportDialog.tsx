// 导入妙手 ERP 导出的商品 CSV 到当前店铺

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { AlertCircle, CheckCircle2, Package, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { MAX_IMPORT_PRODUCTS } from '@/domain/contracts';
import { parseMiaoshouCsv, type MiaoshouParseResult } from '@/domain/import/miaoshou';
import { useCurrentShop, useStore } from '@/store/useStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NumberField } from '@/components/fields/NumberField';

interface MiaoshouImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function MiaoshouImportDialog({ open, onOpenChange }: MiaoshouImportDialogProps) {
  const importProducts = useStore((s) => s.importProducts);
  const shop = useCurrentShop();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'g'>('kg');
  const [domesticShipping, setDomesticShipping] = useState<number | null>(0);
  const [packagingFee, setPackagingFee] = useState<number | null>(0);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const parsed: MiaoshouParseResult | null = text ? parseMiaoshouCsv(text, { weightUnit }) : null;
  const skuCount = parsed?.products.reduce((acc, p) => acc + (p.variants?.length ?? 0), 0) ?? 0;

  const reset = () => {
    setText(null);
    setFileName('');
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const readFile = (file: File) => {
    reset();
    if (file.size > MAX_FILE_BYTES) {
      setError('文件超过 10MB，请分批导出');
      return;
    }
    setFileName(file.name);
    file
      .text()
      .then((content) => {
        const result = parseMiaoshouCsv(content);
        if (result.products.length === 0) setError('没有解析到商品，请确认是妙手导出的 CSV（商品管理 → 导出 → CSV）');
        else if (result.products.length > MAX_IMPORT_PRODUCTS) setError(`单次最多导入 ${MAX_IMPORT_PRODUCTS} 个商品，请分批导出`);
        else setText(content);
      })
      .catch(() => setError('读取文件失败'));
  };

  const handleImport = async () => {
    if (!parsed) return;
    setImporting(true);
    const products = parsed.products.map((p) => ({
      ...p,
      variants: p.variants?.map((v) => ({ ...v, domesticShipping: domesticShipping ?? 0, packagingFee: packagingFee ?? 0 })),
    }));
    const okResult = await importProducts(products);
    setImporting(false);
    if (okResult) {
      toast.success(`已导入 ${products.length} 个商品、${skuCount} 个 SKU 到「${shop?.name}」`);
      reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-500" />
            导入妙手商品
          </DialogTitle>
          <DialogDescription>导入到当前店铺「{shop?.name}」。导入后请补充每个 SKU 的包裹尺寸，抛货才能算准。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!parsed && (
            <div
              role="button"
              tabIndex={0}
              className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
              onDragOver={(e: DragEvent) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e: DragEvent) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) readFile(f); }}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
            >
              <Upload className="mx-auto mb-2 h-8 w-8 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">点击或拖拽上传 CSV 文件</p>
              <p className="mt-1 text-xs text-slate-500">妙手 → 商品管理 → 导出 → CSV 格式</p>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) readFile(f); }} />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {parsed && (
            <>
              <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-green-800">{fileName}</p>
                  <p className="text-xs text-green-600">
                    {parsed.products.length} 个商品，{skuCount} 个 SKU{parsed.skippedRows > 0 && `，跳过 ${parsed.skippedRows} 行无效数据`}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={reset}>重选</Button>
              </div>

              <div className="max-h-36 overflow-y-auto rounded-md border">
                {parsed.products.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 border-b px-3 py-1.5 text-xs last:border-b-0">
                    <span className="flex-1 truncate text-slate-700">{p.name}</span>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">{p.variants?.length ?? 0} SKU</Badge>
                  </div>
                ))}
              </div>

              <div className="space-y-3 rounded-md bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-600">导入设置（导入后可逐个修改）</p>
                <div className="grid grid-cols-3 gap-3">
                  <NumberField label="国内运费 / SKU" value={domesticShipping} onChange={setDomesticShipping} suffix={shop?.config.currency.cost} />
                  <NumberField label="包装费 / SKU" value={packagingFee} onChange={setPackagingFee} suffix={shop?.config.currency.cost} />
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-500">CSV 重量单位</span>
                    <select value={weightUnit} onChange={(e) => setWeightUnit(e.target.value as 'kg' | 'g')} className="h-7 w-full rounded-md border border-input bg-white px-1.5 text-xs">
                      <option value="kg">千克 kg</option>
                      <option value="g">克 g</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>取消</Button>
          <Button onClick={handleImport} disabled={!parsed || importing} className="bg-blue-600 hover:bg-blue-700">
            {importing ? '导入中…' : `导入 ${skuCount} 个 SKU`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
