// ============================================
// 添加商品对话框组件
// ============================================

import { useState } from 'react';
import { useStore } from '@/store/useStore';
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
import { Link2, Package } from 'lucide-react';

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddProductDialog({ open, onOpenChange }: AddProductDialogProps) {
  const { addProduct } = useStore();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    
    // 添加商品
    addProduct(name.trim(), url.trim());
    
    // 重置表单
    setName('');
    setUrl('');
    setIsSubmitting(false);
    onOpenChange(false);
  };

  const handleClose = () => {
    setName('');
    setUrl('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              添加新商品
            </DialogTitle>
            <DialogDescription>
              输入商品信息，创建后将自动展开编辑
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 商品名称 */}
            <div className="space-y-2">
              <Label htmlFor="product-name" className="text-sm font-medium">
                商品名称 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="product-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：FURYCUBE F75 机械键盘"
                className="h-10"
                autoFocus
              />
            </div>

            {/* 商品链接 */}
            <div className="space-y-2">
              <Label htmlFor="product-url" className="text-sm font-medium">
                商品链接 <span className="text-slate-400 font-normal">（可选）</span>
              </Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="product-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://detail.1688.com/..."
                  className="h-10 pl-10"
                />
              </div>
              <p className="text-xs text-slate-500">
                支持 1688、TikTok Shop 等链接，方便快速跳转
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button 
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? '创建中...' : '创建商品'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
