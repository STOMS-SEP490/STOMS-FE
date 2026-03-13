import { useState } from 'react';
import { message } from 'antd';
import { Dialog } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import transactionApi from '../api/transactionApi';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
};

export default function TeacherContributeModal({ open, onClose, onSubmitted }: Props) {
  const [amount, setAmount] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetState = () => {
    setAmount('');
    setImageFile(null);
    setImagePreview('');
    setNote('');
    setError('');
  };

  const handleClose = () => {
    if (loading) return;
    resetState();
    onClose();
  };

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setImageFile(null);
      setImagePreview('');
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      message.warning('Vui lòng chọn ảnh PNG hoặc JPG.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      message.warning('Ảnh tối đa 5MB.');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImagePreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amountNumber = Number((amount || '').replace(/\D/g, ''));
    if (!amountNumber || Number.isNaN(amountNumber) || amountNumber <= 0) {
      setError('Vui lòng nhập số tiền đóng góp hợp lệ.');
      return;
    }
    if (!imageFile || !imagePreview) {
      setError('Vui lòng tải lên ảnh chứng từ chuyển khoản.');
      return;
    }

    const rawUser = localStorage.getItem('user');
    let memberId = 0;
    try {
      memberId = Number(JSON.parse(rawUser || '{}')?.memberId || 0) || 0;
    } catch {
      memberId = 0;
    }
    if (!memberId) {
      setError('Không tìm thấy thông tin giáo viên. Vui lòng đăng nhập lại.');
      return;
    }

    try {
      setLoading(true);
      await transactionApi.create({
        memberId,
        amount: amountNumber,
        type: 'Contribution',
        description: note.trim(),
        paymentImg: imagePreview,
      } as any);
      message.success('Đóng góp quỹ thành công.');
      resetState();
      onClose();
      onSubmitted?.();
    } catch (err) {
      console.error('teacher contribute error:', err);
      message.error('Đóng góp quỹ thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Đóng góp vào quỹ"
      description="Nhập số tiền bạn muốn đóng góp và tải lên ảnh chứng từ chuyển khoản."
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-black">
            Số tiền đóng góp <span className="text-red-500">*</span>
          </Label>
          <Input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Nhập số tiền bạn muốn đóng góp vào quỹ"
            className="h-10 text-black placeholder:text-gray-500 border-gray-200"
          />
          <p className="text-xs text-gray-500">Nhập số tiền bạn muốn đóng góp vào quỹ</p>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-black">
            Ảnh chuyển khoản <span className="text-red-500">*</span>
          </Label>
          <label className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-xl py-8 px-4 cursor-pointer bg-slate-50 hover:bg-slate-100 transition">
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              disabled={loading}
            />
            {imagePreview ? (
              <img src={imagePreview} alt="Chứng từ" className="max-h-40 rounded-md object-contain" />
            ) : (
              <div className="text-center space-y-1">
                <div className="text-sm font-medium text-slate-700">Nhấn để tải lên ảnh chứng từ</div>
                <div className="text-xs text-slate-500">PNG, JPG (tối đa 5MB)</div>
              </div>
            )}
          </label>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-black">Ghi chú (Tùy chọn)</Label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Thêm ghi chú về khoản đóng góp của bạn..."
            className="w-full min-h-[80px] rounded-md border border-gray-200 px-3 py-2 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="px-4"
            onClick={handleClose}
            disabled={loading}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            className="px-5 bg-[#2197C0] hover:bg-[#208AAE] text-white"
            disabled={loading}
          >
            {loading ? 'Đang xác nhận...' : 'Xác nhận đóng góp'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

