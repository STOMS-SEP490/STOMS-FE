import { useCallback, useState } from 'react';
import { message } from 'antd';
import { expenseApi } from '@/modules/transaction/api/expenseApi';
import type { TaskReportExpense } from '../taskReport';

export type CreateExpenseRow = {
  key: string;
  amount: string;
  description: string;
  file: File | null;
  preview: string;
};

export function useExpenseForm(refetch: () => void) {
  // Create expenses
  const [hasExpense, setHasExpense] = useState(false);
  const [createExpenses, setCreateExpenses] = useState<CreateExpenseRow[]>([]);

  // Edit expense
  const [editExpenseMode, setEditExpenseMode] = useState(false);
  const [editExpenseAmount, setEditExpenseAmount] = useState('');
  const [editExpenseDescription, setEditExpenseDescription] = useState('');
  const [editExpenseFile, setEditExpenseFile] = useState<File | null>(null);
  const [editExpensePreview, setEditExpensePreview] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);

  const createEmptyExpense = useCallback(
    (): CreateExpenseRow => ({
      key: `ce-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      amount: '',
      description: '',
      file: null,
      preview: '',
    }),
    [],
  );

  const handleHasExpenseToggle = useCallback(
    (checked: boolean) => {
      setHasExpense(checked);
      if (checked) {
        setCreateExpenses([createEmptyExpense()]);
      } else {
        setCreateExpenses([]);
      }
    },
    [createEmptyExpense],
  );

  const updateCreateExpense = useCallback(
    (key: string, patch: Partial<CreateExpenseRow>) => {
      setCreateExpenses((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)));
    },
    [],
  );

  const handleCreateExpenseImgChange = useCallback(
    (key: string, file: File | null) => {
      if (!file) { 
        updateCreateExpense(key, { file: null, preview: '' }); 
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
      updateCreateExpense(key, { file, preview: '' });
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') updateCreateExpense(key, { preview: reader.result });
      };
      reader.readAsDataURL(file);
    },
    [updateCreateExpense],
  );

  const openEditExpense = useCallback((exp: TaskReportExpense) => {
    setEditExpenseMode(true);
    setEditExpenseAmount(exp.amount != null ? String(exp.amount) : '');
    setEditExpenseDescription(exp.description ?? '');
    setEditExpenseFile(null);
    setEditExpensePreview(exp.paymentImg ?? '');
  }, []);

  const closeEditExpense = useCallback(() => {
    setEditExpenseMode(false);
    setEditExpenseAmount('');
    setEditExpenseDescription('');
    setEditExpenseFile(null);
    setEditExpensePreview('');
  }, []);

  const handleSaveEditExpense = useCallback(async (selectedExpense: TaskReportExpense | null) => {
    if (!selectedExpense) return;
    const amount = Number(editExpenseAmount.replace(/\D/g, ''));
    if (!amount || amount <= 0) { 
      message.warning('Vui lòng nhập số tiền hợp lệ.'); 
      return; 
    }
    if (editExpenseFile && editExpenseFile.size > 10 * 1024 * 1024) {
      message.warning('Ảnh chứng từ tối đa 10MB.');
      return;
    }
    setSavingExpense(true);
    try {
      await expenseApi.update({
        expenseId: selectedExpense.expenseId,
        amount,
        description: editExpenseDescription.trim() || undefined,
        paymentImg: editExpenseFile ?? undefined,
      });
      message.success('Đã cập nhật khoản chi.');
      closeEditExpense();
      refetch();
    } catch (err) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null;
      message.error(msg || 'Cập nhật khoản chi thất bại.');
    } finally {
      setSavingExpense(false);
    }
  }, [editExpenseAmount, editExpenseDescription, editExpenseFile, closeEditExpense, refetch]);

  const resetCreateExpenses = useCallback(() => {
    setHasExpense(false);
    setCreateExpenses([]);
  }, []);

  return {
    // Create
    hasExpense,
    createExpenses,
    setCreateExpenses,
    handleHasExpenseToggle,
    updateCreateExpense,
    handleCreateExpenseImgChange,
    createEmptyExpense,
    resetCreateExpenses,
    
    // Edit
    editExpenseMode,
    setEditExpenseMode,
    editExpenseAmount,
    setEditExpenseAmount,
    editExpenseDescription,
    setEditExpenseDescription,
    editExpenseFile,
    setEditExpenseFile,
    editExpensePreview,
    setEditExpensePreview,
    savingExpense,
    openEditExpense,
    closeEditExpense,
    handleSaveEditExpense,
  };
}
