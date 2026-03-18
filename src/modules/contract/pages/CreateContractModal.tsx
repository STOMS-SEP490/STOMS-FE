import { useEffect, useMemo, useState } from 'react';
import { message, Select, Spin } from 'antd';
import { Dialog } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import contractApi from '../api/contractApi';
import teachingHistoryApi from '../api/teachingHistoryApi';
import type { TeachingHistoryItem } from '../teachingHistory';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  initialSessionId?: number | null;
};

export default function CreateContractModal({
  open,
  onClose,
  onCreated,
  initialSessionId,
}: Props) {
  const [contractCode, setContractCode] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<TeachingHistoryItem[]>([]);

  const memberId =
    Number(JSON.parse(localStorage.getItem('user') || '{}')?.memberId || 0) || undefined;

  useEffect(() => {
    if (!open || !memberId) return;

    const fetchHistory = async () => {
      try {
        setSessionsLoading(true);
        const res = await teachingHistoryApi.getTeachingHistory(memberId, {
          pageNumber: 1,
          pageSize: 100,
          sessionStatus: 'Completed',
        });
        setHistoryItems(res.items || []);

        // Nếu có initialSessionId (từ lịch sử giảng dạy), ưu tiên set sẵn
        if (initialSessionId) {
          setSessionId(initialSessionId);
        }
      } catch (err) {
        console.error('fetch teaching history error', err);
        message.error('Không tải được danh sách buổi học đã dạy');
      } finally {
        setSessionsLoading(false);
      }
    };

    fetchHistory();
  }, [open, memberId, initialSessionId]);

  const completedSessions = useMemo(
    () =>
      historyItems.filter((item) => {
        if (!item) return false;
        const status = String(item.status ?? '').toUpperCase();
        return status.includes('HOÀN THÀNH') || status === 'COMPLETED';
      }),
    [historyItems]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const code = contractCode.trim();
    if (!code) {
      setError('Vui lòng nhập mã hợp đồng');
      return;
    }

    const amountNumber = amount ? Number(amount.replace(/\D/g, '')) : undefined;
    if (!amountNumber || Number.isNaN(amountNumber) || amountNumber <= 0) {
      setError('Số tiền không hợp lệ (phải > 0)');
      return;
    }

    if (!memberId) {
      setError('Không xác định được giảng viên (memberId). Vui lòng đăng nhập lại.');
      return;
    }

    if (!sessionId) {
      setError('Vui lòng chọn buổi học để tạo hợp đồng');
      return;
    }

    try {
      setLoading(true);
      await contractApi.create({
        contractCode: code,
        amount: amountNumber,
        sessionId,
        createdByMemberId: memberId,
      });
      message.success('Tạo hợp đồng thành công');
      resetForm();
      onClose();
      onCreated?.();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      message.error(msg || 'Tạo hợp đồng thất bại');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setContractCode('');
    setAmount('');
    setSessionId(null);
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
      title="Tạo hợp đồng"
      description="Thêm hợp đồng mới cho giảng viên/buổi học"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="contractCode" className="text-black font-medium">
            Mã hợp đồng <span className="text-red-500">*</span>
          </Label>
          <Input
            id="contractCode"
            value={contractCode}
            onChange={(e) => setContractCode(e.target.value)}
            placeholder="Ví dụ: CTR-2024-001"
            className="h-10 text-black placeholder:text-gray-500 border-gray-200"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount" className="text-black font-medium">
            Số tiền (VNĐ)
          </Label>
          <Input
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Ví dụ: 5000000"
            className="h-10 text-black placeholder:text-gray-500 border-gray-200"
          />
        </div>

        {!initialSessionId && (
          <div className="space-y-2">
            <Label className="text-black font-medium">
              Buổi học (đã hoàn thành & đã phân công)
            </Label>
            <Select
              value={sessionId ?? undefined}
              onChange={(value: number) => setSessionId(value)}
              placeholder="Chọn buổi học"
              loading={sessionsLoading}
              className="w-full"
              notFoundContent={sessionsLoading ? <Spin size="small" /> : 'Không có buổi học phù hợp'}
            >
              {completedSessions.map((item) => (
                <Select.Option key={item.sessionId} value={item.sessionId}>
                  {`${item.sessionTitle || `Buổi ${item.sessionId}`} — ${new Date(
                    item.startAt
                  ).toLocaleString('vi-VN')} (${item.location || '—'})`}
                </Select.Option>
              ))}
            </Select>
          </div>
        )}

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
            {loading ? 'Đang tạo...' : 'Tạo hợp đồng'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

