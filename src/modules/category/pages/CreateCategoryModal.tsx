import { useState } from 'react';
import { message } from 'antd';
import categoryApi from '../api/categoryApi';
import { Dialog } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

export default function CreateCategoryModal({ open, onClose, onCreated }: Props) {
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const name = categoryName.trim();
    if (!name) {
      setError('Vui lòng nhập tên danh mục');
      return;
    }
    const desc = description.trim();
    if (!desc) {
      setError('Vui lòng nhập mô tả danh mục');
      return;
    }
    try {
      setLoading(true);
      await categoryApi.create({
        categoryName: name,
        description: desc,
      });
      message.success('Tạo danh mục thành công');
      setCategoryName('');
      setDescription('');
      onClose();
      onCreated?.();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      message.error(msg || 'Tạo danh mục thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCategoryName('');
    setDescription('');
    setError('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Tạo danh mục thiết bị"
      description="Thêm danh mục mới để phân loại thiết bị"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="categoryName" className="text-black font-medium">
            Tên danh mục <span className="text-red-500">*</span>
          </Label>
          <Input
            id="categoryName"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="Ví dụ: Laptop, Màn hình..."
            className="h-10 text-black placeholder:text-gray-500 border-gray-200"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description" className="text-black font-medium">
            Mô tả <span className="text-red-500">*</span>
          </Label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          placeholder="Mô tả ngắn về danh mục"
            rows={3}
            className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 resize-none"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleClose}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-[#2197C0] hover:bg-[#208AAE] text-white"
            disabled={loading}
          >
            {loading ? 'Đang tạo...' : 'Tạo danh mục'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
