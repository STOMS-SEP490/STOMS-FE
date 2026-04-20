import { useEffect, useState } from 'react';
import { message, Select, Spin } from 'antd';
import { Dialog } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import sessionApi from '@/modules/request/api/sessionApi';
import type { SessionResponse } from '@/modules/request/session.types';
import contractApi from '../api/contractApi';
import { hasExplicitNegativeAmountSign } from '../utils/amountInput';
import { getErrorMessage } from '@/shared/lib/errorMessage';

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
  const [sessionOptions, setSessionOptions] = useState<
    Array<Pick<SessionResponse, 'SessionId' | 'SessionNo' | 'RequestId' | 'StartAt' | 'Location'>>
  >([]);

  const memberId =
    Number(JSON.parse(localStorage.getItem('user') || '{}')?.memberId || 0) || undefined;

  useEffect(() => {
    if (!open || !memberId) return;

    const fetchSessions = async () => {
      try {
        setSessionsLoading(true);
        const res = await sessionApi.getFilter({
          Statuses: ['COMPLETED'],
          MemberId: memberId,
          HasContract: false,
          PageNumber: 1,
          PageSize: 100,
        });
        const rows = (res.Items ?? [])
          .map((raw) => ({
            SessionId: Number(raw.SessionId ?? 0),
            SessionNo: Number(raw.SessionNo ?? 0),
            RequestId: Number(raw.RequestId ?? 0),
            StartAt: String(raw.StartAt ?? ''),
            Location: String(raw.Location ?? ''),
          }))
          .filter((x) => x.SessionId > 0);
        setSessionOptions(rows);

        // Nếu có initialSessionId (từ lịch sử giảng dạy), ưu tiên set sẵn
        if (initialSessionId) {
          setSessionId(initialSessionId);
        }
      } catch (err) {
        console.error('fetch sessions for contract error', err);
        const apiMsg = getErrorMessage(err);
        message.error(
          apiMsg === 'Có lỗi xảy ra' ? 'Không tải được danh sách buổi phù hợp' : apiMsg,
        );
      } finally {
        setSessionsLoading(false);
      }
    };

    void fetchSessions();
  }, [open, memberId, initialSessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const code = contractCode.trim();
    if (!code) {
      setError('Vui lòng nhập mã hợp đồng');
      return;
    }

    if (hasExplicitNegativeAmountSign(amount)) {
      setError('Số tiền không hợp lệ (phải > 0)');
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
      setError('Vui lòng chọn buổi để tạo hợp đồng');
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
      const apiMsg = getErrorMessage(err);
      const display = apiMsg === 'Có lỗi xảy ra' ? 'Tạo hợp đồng thất bại' : apiMsg;
      setError(display);
      message.error(display);
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
      description="Thêm hợp đồng mới"
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
              placeholder="Chọn buổi"
              loading={sessionsLoading}
              className="w-full"
              notFoundContent={sessionsLoading ? <Spin size="small" /> : 'Không có buổi phù hợp'}
            >
              {sessionOptions.map((item) => (
                <Select.Option key={item.SessionId} value={item.SessionId}>
                  {`Request #${item.RequestId} - Buổi ${item.SessionNo || item.SessionId} — ${new Date(
                    item.StartAt,
                  ).toLocaleString('vi-VN')} (${item.Location || '—'})`}
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

