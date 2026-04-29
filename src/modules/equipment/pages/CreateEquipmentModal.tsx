import { useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import equipmentApi from '../api/equipmentApi';
import categoryApi from '@/modules/category/api/categoryApi';
import type { CategoryListItem } from '@/modules/category/category';
import { Dialog } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { getErrorMessage } from '@/shared/lib/errorMessage';
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
  const [description, setDescription] = useState('');
  const [handoverMinuteImgFile, setHandoverMinuteImgFile] = useState<File | null>(null);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [error, setError] = useState('');

  const handoverMinuteInputRef = useRef<HTMLInputElement | null>(null);
  const imgInputRef = useRef<HTMLInputElement | null>(null);

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
    const sponsor = sponsoredBy.trim();
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
    if (!sponsor) {
      setError('Vui lòng nhập bên cung cấp');
      return;
    }
    if (!handoverMinuteImgFile) {
      setError('Vui lòng chọn ảnh biên bản bàn giao');
      return;
    }
    if (handoverMinuteImgFile.size <= 0 || handoverMinuteImgFile.size > 10 * 1024 * 1024) {
      setError('Kích thước ảnh biên bản bàn giao tối đa 10MB');
      return;
    }
    if (imgFile && (imgFile.size <= 0 || imgFile.size > 10 * 1024 * 1024)) {
      setError('Kích thước ảnh thiết bị tối đa 10MB');
      return;
    }
    try {
      setLoading(true);
      await equipmentApi.create({
        categoryId: Number(categoryId),
        equipmentName: name,
        equipmentCode: code,
        sponsoredBy: sponsor,
        handoverMinuteImgFile,
        description: description.trim() || undefined,
        imgFile: imgFile ?? null,
      });
      message.success('Tạo thiết bị thành công');
      resetForm();
      onClose();
      onCreated?.();
    } catch (err: unknown) {
      const data =
        err && typeof err === 'object' && err != null && 'response' in err
          ? (err as { response?: { data?: unknown } }).response?.data
          : undefined;

      const msgFromBe = (() => {
        if (!data) return null;
        if (typeof data === 'string') return data.trim() || null;
        if (typeof data !== 'object') return null;

        const d = data as Record<string, unknown>;
        const direct =
          (typeof d.message === 'string' && d.message) ||
          (typeof d.Message === 'string' && d.Message) ||
          (typeof d.error === 'string' && d.error) ||
          (typeof d.title === 'string' && d.title) ||
          null;
        if (direct) return String(direct).trim() || null;

        const errors = d.errors;
        if (Array.isArray(errors)) {
          const first = errors.find((x) => typeof x === 'string' && x.trim());
          return typeof first === 'string' ? first.trim() : null;
        }

        return null;
      })();

      message.error(msgFromBe || getErrorMessage(err) || 'Tạo thiết bị thất bại');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEquipmentName('');
    setEquipmentCode('');
    setCategoryId('');
    setSponsoredBy('');
    setDescription('');
    setHandoverMinuteImgFile(null);
    setImgFile(null);
    setError('');
    if (handoverMinuteInputRef.current) handoverMinuteInputRef.current.value = '';
    if (imgInputRef.current) imgInputRef.current.value = '';
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
            placeholder="Ví dụ: Intel / Samsung /..."
            className="h-9 text-black placeholder:text-gray-500 border-gray-200"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="handoverMinuteImg" className="text-black font-medium">
            Biên bản bàn giao (ảnh) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="handoverMinuteImg"
            ref={handoverMinuteInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              if (!file) { setHandoverMinuteImgFile(null); return; }
              if (file.size > 10 * 1024 * 1024) {
                message.warning('Ảnh biên bản bàn giao tối đa 10MB.');
                e.target.value = '';
                return;
              }
              setHandoverMinuteImgFile(file);
            }}
            className="h-auto text-black border-gray-200"
          />
          {handoverMinuteImgFile && (
            <p className="text-xs text-gray-600 break-all">{handoverMinuteImgFile.name}</p>
          )}
          <p className="text-xs text-gray-500">JPG/PNG/GIF/WebP, tối đa 10MB.</p>
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
        <div className="space-y-1.5">
          <Label htmlFor="img" className="text-black font-medium">Hình ảnh (ảnh)</Label>
          <Input
            id="img"
            ref={imgInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              if (!file) { setImgFile(null); return; }
              if (file.size > 10 * 1024 * 1024) {
                message.warning('Ảnh thiết bị tối đa 10MB.');
                e.target.value = '';
                return;
              }
              setImgFile(file);
            }}
            className="h-auto text-black border-gray-200"
          />
          {imgFile && <p className="text-xs text-gray-600 break-all">{imgFile.name}</p>}
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
