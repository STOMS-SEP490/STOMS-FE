import { useCallback, useState } from 'react';
import { message } from 'antd';
import { expenseApi } from '@/modules/transaction/api/expenseApi';
import type { TaskReportExpense } from '../taskReport';

export function useExpenseManagement(refetch: () => void) {
  const [selectedExpense, setSelectedExpense] = useState<TaskReportExpense | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingExpense, setProcessingExpense] = useState(false);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleApproveExpense = useCallback(async (walletId: number | null) => {
    if (!selectedExpense || !walletId) {
      message.warning('Vui lòng chọn ví để thanh toán.');
      return;
    }
    setProcessingExpense(true);
    try {
      await expenseApi.approve({ walletId, expenseIds: [selectedExpense.expenseId] });
      message.success('Đã duyệt khoản chi.');
      setSelectedExpense(null);
      setRejectReason('');
      refetch();
    } catch (err) {
      const msg = err && typeof err === 'object' && 'message' in err 
        ? String((err as { message: unknown }).message) 
        : 'Duyệt thất bại.';
      message.error(msg);
    } finally {
      setProcessingExpense(false);
    }
  }, [selectedExpense, refetch]);

  const handleRejectExpense = useCallback(async () => {
    if (!selectedExpense || !rejectReason.trim()) {
      message.warning('Vui lòng nhập lý do từ chối.');
      return;
    }
    setProcessingExpense(true);
    try {
      await expenseApi.reject({ expenseId: selectedExpense.expenseId, reason: rejectReason.trim() });
      message.success('Đã từ chối khoản chi.');
      setSelectedExpense(null);
      setRejectReason('');
      refetch();
    } catch (err) {
      const msg = err && typeof err === 'object' && 'message' in err 
        ? String((err as { message: unknown }).message) 
        : 'Từ chối thất bại.';
      message.error(msg);
    } finally {
      setProcessingExpense(false);
    }
  }, [selectedExpense, rejectReason, refetch]);

  const closeExpenseDetail = useCallback(() => {
    setSelectedExpense(null);
    setRejectReason('');
    setShowRejectReason(false);
  }, []);

  return {
    selectedExpense,
    setSelectedExpense,
    rejectReason,
    setRejectReason,
    processingExpense,
    showRejectReason,
    setShowRejectReason,
    previewImage,
    setPreviewImage,
    handleApproveExpense,
    handleRejectExpense,
    closeExpenseDetail,
  };
}
