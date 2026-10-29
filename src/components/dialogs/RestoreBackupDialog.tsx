// 恢复备份：上传 JSON 文件，恢复为新店铺（不会覆盖现有数据）

import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface RestoreBackupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

export function RestoreBackupDialog({ open, onOpenChange }: RestoreBackupDialogProps) {
  const restoreBackup = useStore((s) => s.restoreBackup);
  const fileRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState<unknown>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setContent(null);
    setFileName('');
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const readFile = async (file: File) => {
    reset();
    if (file.size > MAX_BACKUP_BYTES) {
      setError('文件超过 20MB');
      return;
    }
    try {
      setContent(JSON.parse(await file.text()));
      setFileName(file.name);
    } catch {
      setError('不是有效的 JSON 文件');
    }
  };

  const handleRestore = async () => {
    setBusy(true);
    const result = await restoreBackup(content);
    setBusy(false);
    if (result) {
      toast.success(`已恢复 ${result.shops} 个店铺、${result.products} 个商品、${result.skus} 个 SKU`);
      reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>恢复备份</DialogTitle>
          <DialogDescription>备份中的每个店铺都会作为新店铺恢复，现有数据不受影响。支持旧版（v2.x）导出的备份。</DialogDescription>
        </DialogHeader>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-lg border-2 border-dashed border-slate-200 p-6 text-center hover:border-slate-300"
        >
          <Upload className="mx-auto mb-2 h-7 w-7 text-slate-400" />
          <span className="text-sm text-slate-700">{fileName || '选择备份 JSON 文件'}</span>
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void readFile(f); }} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>取消</Button>
          <Button onClick={handleRestore} disabled={content == null || busy}>{busy ? '恢复中…' : '恢复'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
