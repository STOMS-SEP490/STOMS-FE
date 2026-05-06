import { useEffect, useState } from 'react';
import { message } from 'antd';
import { Dialog } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { CloudUpload } from 'lucide-react';
import { contributionApi } from '../api/contributionApi';
import { walletApi, type WalletListItem } from '../api/walletApi';

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
};

export default function TeacherContributeModal({ open, onClose, onSubmitted }: Props) {
  const [amount, setAmount] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [wallets, setWallets] = useState<WalletListItem[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null);
  const [walletsLoading, setWalletsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetch = async () => {
      setWalletsLoading(true);
      try {
        const res = await walletApi.getWallets({ pageNumber: 1, pageSize: 50 });
        const list = res.items ?? [];
        setWallets(list);
        if (list.length === 1) setSelectedWalletId(list[0].walletId);
      } catch {
        setWallets([]);
      } finally {
        setWalletsLoading(false);
      }
    };
    void fetch();
  }, [open]);

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
    if (file.size > 10 * 1024 * 1024) {
      message.warning('Ảnh tối đa 10MB.');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedWalletId) {
      setError('Vui lòng chọn ví quỹ để đóng góp.');
      return;
    }

    const amountNumber = Number((amount || '').replace(/\D/g, ''));
    if (!amountNumber || Number.isNaN(amountNumber) || amountNumber <= 0) {
      setError('Vui lòng nhập số tiền đóng góp hợp lệ.');
      return;
    }
    if (!imageFile) {
      setError('Vui lòng tải lên ảnh chứng từ chuyển khoản.');
      return;
    }
    if (imageFile.size > 10 * 1024 * 1024) {
      setError('Ảnh chứng từ tối đa 10MB.');
      return;
    }

    try {
      setLoading(true);
      await contributionApi.submit({
        walletId: selectedWalletId,
        amount: amountNumber,
        description: note.trim() || undefined,
        paymentImg: imageFile,
      });
      message.success('Đóng góp quỹ thành công.');
      onSubmitted?.(); // Fetch lại data trước
      resetState();
      onClose(); // Đóng modal sau
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
      description="Nhập số tiền bạn đóng góp và tải lên ảnh chứng từ."
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {wallets.length > 1 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-black">
              Ví quỹ <span className="text-red-500">*</span>
            </Label>
            <Select
              value={selectedWalletId ? String(selectedWalletId) : ''}
              onValueChange={(v) => setSelectedWalletId(v ? Number(v) : null)}
              disabled={walletsLoading}
            >
              <SelectTrigger className="w-full bg-white text-black">
                <SelectValue placeholder="— Chọn ví quỹ —" />
              </SelectTrigger>
              <SelectContent>
                {wallets.map((w) => (
                  <SelectItem key={w.walletId} value={String(w.walletId)}>
                    <div className="flex items-center justify-between gap-3 w-full">
                      <span className="font-medium">{w.walletName}</span>
                      <span className="text-xs text-slate-500">
                        Số dư: {(w.balance ?? 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {wallets.length === 1 && (
          <div className="rounded-lg bg-sky-50 border border-sky-200 px-4 py-2.5">
            <div className="text-xs text-sky-700 font-medium">Đóng vào ví</div>
            <div className="text-sm text-black font-semibold mt-0.5">
              {wallets[0].walletName}{' '}
              <span className="text-xs text-gray-500 font-normal">
                (Số dư: {(wallets[0].balance ?? 0).toLocaleString('vi-VN')} đ)
              </span>
            </div>
          </div>
        )}

        {wallets.length === 0 && !walletsLoading && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            Chưa có ví quỹ nào trong hệ thống. Vui lòng liên hệ quản lý.
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm font-medium text-black">
            Số tiền đóng góp <span className="text-red-500">*</span>
          </Label>
          <div className="flex items-center rounded-md border border-gray-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-sky-500">
            <Input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              placeholder="Nhập số tiền"
              className="border-0 focus-visible:ring-0 text-black placeholder:text-gray-500"
            />
            <span className="px-3 py-2 text-sm text-gray-500 border-l border-gray-200">₫</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-black">
            Ảnh chuyển khoản <span className="text-red-500">*</span>
          </Label>
          <label className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-xl py-8 px-4 cursor-pointer bg-slate-50 hover:bg-slate-100 transition">
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              disabled={loading}
            />
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Chứng từ"
                className="max-h-40 rounded-md object-contain"
              />
            ) : (
              <div className="text-center space-y-1">
                <CloudUpload className="mx-auto h-8 w-8 text-slate-400" />
                <div className="text-sm font-medium text-slate-700">
                  Nhấn để tải lên ảnh chứng từ
                </div>
                <div className="text-xs text-slate-500">PNG, JPG (tối đa 10MB)</div>
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
            disabled={loading || wallets.length === 0}
          >
            {loading ? 'Đang xác nhận...' : 'Xác nhận đóng góp'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
