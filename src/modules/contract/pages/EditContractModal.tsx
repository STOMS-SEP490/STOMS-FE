import { useEffect, useState } from 'react';
import { message } from 'antd';
import { Dialog } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import contractApi from '../api/contractApi';
import type { ContractListItem } from '../contract';

type Props = {
  open: boolean;
  onClose: () => void;
  contract: ContractListItem | null;
  onUpdated?: () => void;
};

export default function EditContractModal({ open, onClose, contract, onUpdated }: Props) {
  const [contractCode, setContractCode] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && contract) {
      setContractCode(contract.contractCode ?? '');
      setAmount(contract.amount != null ? String(contract.amount) : '');
      setError('');
    }
  }, [open, contract]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;
    setError('');

    const code = contractCode.trim();
    if (!code) {
      setError('Vui lòng nhập mã hợp đồng');
      return;
    }

    const amountNumber = amount ? Number(amount.replace(/\D/g, '')) : undefined;
    if (amount && (Number.isNaN(amountNumber) || amountNumber! <= 0)) {
      setError('Số tiền không hợp lệ');
      return;
    }

    try {
      setLoading(true);
      await contractApi.update(contract.contractId, {
        contractCode: code,
        amount: amountNumber,
      });
      message.success('Cập nhật hợp đồng thành công');
      onClose();
      onUpdated?.();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      message.error(msg || 'Cập nhật hợp đồng thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setContractCode('');
    setAmount('');
    setError('');
    onClose();
  };

  if (!contract) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Chỉnh sửa hợp đồng"
      description={`Cập nhật thông tin hợp đồng "${contract.contractCode}"`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-contractCode" className="text-black font-medium">
            Mã hợp đồng <span className="text-red-500">*</span>
          </Label>
          <Input
            id="edit-contractCode"
            value={contractCode}
            onChange={(e) => setContractCode(e.target.value)}
            placeholder="Nhập mã hợp đồng"
            className="h-10 text-black placeholder:text-gray-500 border-gray-200"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-amount" className="text-black font-medium">
            Số tiền (VNĐ)
          </Label>
          <Input
            id="edit-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Nhập số tiền"
            className="h-10 text-black placeholder:text-gray-500 border-gray-200"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

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
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

