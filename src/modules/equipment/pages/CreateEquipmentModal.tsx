import { useState, useEffect } from 'react';
import { message } from 'antd';
import equipmentApi from '../api/equipmentApi';
import categoryApi from '@/modules/category/api/categoryApi';
import type { CategoryListItem } from '@/modules/category/category';
import { EQUIPMENT_STATUS_OPTIONS } from '@/constants/equipment';
import { Dialog } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

export default function CreateEquipmentModal({ open, onClose, onCreated }: Props) {
  const [equipmentName, setEquipmentName] = useState('');
  const [equipmentCode, setEquipmentCode] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [sponsoredBy, setSponsoredBy] = useState('');
  const [handoverMinute, setHandoverMinute] = useState('');
  const [status, setStatus] = useState('AVAILABLE');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      categoryApi.getCategories({ pageSize: 500 }).then((res) => setCategories(res.items ?? []));
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const name = equipmentName.trim();
    const code = equipmentCode.trim();
    if (!name) {
      setError('Vui lòng nhập tên thiết bị');
      return;
    }
    if (!code) {
      setError('Vui lòng nhập mã thiết bị');
      return;
    }
    if (!categoryId) {
      setError('Vui lòng chọn danh mục');
      return;
    }
    try {
      setLoading(true);
      await equipmentApi.create({
        categoryId: Number(categoryId),
        equipmentName: name,
        equipmentCode: code,
        sponsoredBy: sponsoredBy.trim(),
        handoverMinute: handoverMinute.trim(),
        description: description.trim(),
      });
      message.success('Tạo thiết bị thành công');
      resetForm();
      onClose();
      onCreated?.();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      message.error(msg || 'Tạo thiết bị thất bại');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEquipmentName('');
    setEquipmentCode('');
    setCategoryId('');
    setSponsoredBy('');
    setHandoverMinute('');
    setStatus('AVAILABLE');
    setDescription('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Tạo thiết bị"
      description="Thêm thiết bị mới vào danh sách"
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="equipmentName" className="text-black font-medium">
            Tên thiết bị <span className="text-red-500">*</span>
          </Label>
          <Input
            id="equipmentName"
            value={equipmentName}
            onChange={(e) => setEquipmentName(e.target.value)}
            placeholder="Ví dụ: Dell Latitude 5420"
            className="h-9 text-black placeholder:text-gray-500 border-gray-200"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="equipmentCode" className="text-black font-medium">
            Mã thiết bị <span className="text-red-500">*</span>
          </Label>
          <Input
            id="equipmentCode"
            value={equipmentCode}
            onChange={(e) => setEquipmentCode(e.target.value)}
            placeholder="Ví dụ: EQP-2024-001"
            className="h-9 text-black placeholder:text-gray-500 border-gray-200"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-black font-medium">
            Danh mục <span className="text-red-500">*</span>
          </Label>
          <Select value={categoryId || undefined} onValueChange={setCategoryId}>
            <SelectTrigger className="h-9 w-full text-black border-gray-200">
              <SelectValue placeholder="Chọn danh mục" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.categoryId} value={String(c.categoryId)} className="text-black">
                  {c.categoryName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sponsoredBy" className="text-black font-medium">Bên cung cấp</Label>
          <Input
            id="sponsoredBy"
            value={sponsoredBy}
            onChange={(e) => setSponsoredBy(e.target.value)}
            placeholder="Tùy chọn"
            className="h-9 text-black placeholder:text-gray-500 border-gray-200"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="handoverMinute" className="text-black font-medium">Biên bản bàn giao</Label>
          <Input
            id="handoverMinute"
            value={handoverMinute}
            onChange={(e) => setHandoverMinute(e.target.value)}
            placeholder="Mã/số biên bản"
            className="h-9 text-black placeholder:text-gray-500 border-gray-200"
          />
        </div>
       
        <div className="space-y-1.5">
          <Label htmlFor="description" className="text-black font-medium">Mô tả</Label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả (tùy chọn)"
            rows={2}
            className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 resize-none"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
            Hủy
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-[#2197C0] hover:bg-[#208AAE] text-white"
            disabled={loading}
          >
            {loading ? 'Đang tạo...' : 'Tạo thiết bị'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
