// 删除店铺（需输入店铺名确认）

import { useState } from 'react';
import { useCurrentShop, useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface DeleteShopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteShopDialog({ open, onOpenChange }: DeleteShopDialogProps) {
  const shop = useCurrentShop();
  const deleteShop = useStore((s) => s.deleteShop);
  const [confirm, setConfirm] = useState('');

  if (!shop) return null;

  const close = () => {
    setConfirm('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600">删除店铺「{shop.name}」</DialogTitle>
          <DialogDescription>
            将同时删除该店铺的 {shop.productCount} 个商品和全部 SKU，无法恢复。建议先在"更多 → 备份当前店铺"导出。
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-slate-600">请输入店铺名称确认：</p>
        <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={shop.name} />
        <DialogFooter>
          <Button variant="outline" onClick={close}>取消</Button>
          <Button
            variant="destructive"
            disabled={confirm !== shop.name}
            onClick={async () => {
              await deleteShop(shop.id);
              close();
            }}
          >
            删除店铺
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
