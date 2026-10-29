// 添加商品

import { useState, type FormEvent } from 'react';
import { Link2, Package } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddProductDialog({ open, onOpenChange }: AddProductDialogProps) {
  const addProduct = useStore((s) => s.addProduct);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    setName('');
    setUrl('');
    setCategory('');
    onOpenChange(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    const created = await addProduct({ name: name.trim(), url: url.trim() || null, category: category.trim() || null });
    setSubmitting(false);
    if (created) close();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              添加商品
            </DialogTitle>
            <DialogDescription>创建后在表格中填写各 SKU 的成本、重量和尺寸，价格会自动算出。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="product-name">商品名称 <span className="text-red-500">*</span></Label>
            <Input id="product-name" autoFocus value={name} maxLength={255} placeholder="例如：碳纤维登山杖 三节伸缩" onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-category">类目 <span className="font-normal text-slate-400">（可选）</span></Label>
            <Input id="product-category" value={category} maxLength={100} placeholder="例如：Camping & Hiking" onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-url">货源链接 <span className="font-normal text-slate-400">（可选）</span></Label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input id="product-url" value={url} placeholder="https://detail.1688.com/..." onChange={(e) => setUrl(e.target.value)} className="pl-10" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={submitting}>取消</Button>
            <Button type="submit" disabled={!name.trim() || submitting} className="bg-blue-600 hover:bg-blue-700">
              {submitting ? '创建中…' : '创建商品'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
