// 新建店铺：选站点 → 选费率预设，或复制已有店铺的设置

import { useMemo, useState, type FormEvent } from 'react';
import { PRESETS, SITES } from '@/domain/presets';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateShopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COPY_PREFIX = 'copy:';

export function CreateShopDialog({ open, onOpenChange }: CreateShopDialogProps) {
  const { shops, createShop } = useStore();
  const [name, setName] = useState('');
  const [site, setSite] = useState('MY');
  const [selected, setSource] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const presets = useMemo(() => PRESETS.filter((p) => p.site === site), [site]);
  const sameSiteShops = shops.filter((s) => s.site === site);

  const validSources = [...presets.map((p) => p.id), ...sameSiteShops.map((s) => COPY_PREFIX + s.id)];
  const source = validSources.includes(selected) ? selected : (presets[0]?.id ?? '');

  const reset = () => {
    setName('');
    setSite('MY');
    setSubmitting(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    const copyFromShopId = source.startsWith(COPY_PREFIX) ? source.slice(COPY_PREFIX.length) : undefined;
    const created = await createShop({
      name: name.trim(),
      site,
      ...(copyFromShopId ? { copyFromShopId } : { presetId: source || undefined }),
    });
    setSubmitting(false);
    if (created) {
      reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>新建店铺</DialogTitle>
            <DialogDescription>每个店铺有独立的费率、物流、退货和定价目标，互不影响。</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="shop-name">店铺名称</Label>
            <Input id="shop-name" autoFocus value={name} maxLength={100} placeholder="例如：运动户外 · 马来西亚" onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>站点</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {SITES.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => setSite(s.code)}
                  className={cn(
                    'h-9 rounded-md border text-xs',
                    site === s.code ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50',
                  )}
                >
                  {s.name} <span className="text-slate-400">{s.currency}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>初始设置</Label>
            <div className="max-h-56 space-y-1.5 overflow-y-auto">
              {presets.map((p) => (
                <label key={p.id} className={cn('flex cursor-pointer gap-2 rounded-md border p-2', source === p.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200')}>
                  <input type="radio" name="source" className="mt-0.5" checked={source === p.id} onChange={() => setSource(p.id)} />
                  <span>
                    <span className="block text-xs font-medium text-slate-700">
                      {p.name}
                      {p.verifiedAt ? <span className="ml-1 text-[10px] text-emerald-600">核对于 {p.verifiedAt}</span> : <span className="ml-1 text-[10px] text-amber-600">需自行填写</span>}
                    </span>
                    <span className="block text-[11px] leading-snug text-slate-500">{p.description}</span>
                  </span>
                </label>
              ))}
              {sameSiteShops.map((s) => (
                <label key={s.id} className={cn('flex cursor-pointer gap-2 rounded-md border p-2', source === COPY_PREFIX + s.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200')}>
                  <input type="radio" name="source" className="mt-0.5" checked={source === COPY_PREFIX + s.id} onChange={() => setSource(COPY_PREFIX + s.id)} />
                  <span className="text-xs text-slate-700">复制「{s.name}」的设置</span>
                </label>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>取消</Button>
            <Button type="submit" disabled={!name.trim() || !source || submitting} className="bg-blue-600 hover:bg-blue-700">
              {submitting ? '创建中…' : '创建店铺'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
