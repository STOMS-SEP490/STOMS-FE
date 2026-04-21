import { useCallback, useEffect, useState } from 'react';
import { message } from 'antd';
import sessionApi from '@/modules/request/api/sessionApi';
import type { SessionResponse } from '@/modules/request/session.types';
import requestApi from '@/modules/request/api/requestApi';
import type { RequestListItem } from '@/modules/request/request';
import { taskReportApi } from '../api/taskReportApi';
import type { TaskReport } from '../taskReport';
import type { ReportFormState, CreateExpenseRow, TaskItem } from '../taskReportForm.types';
import { getErrorMessage } from '@/shared/lib/errorMessage';

type RequestWithTasks = RequestListItem & {
  Tasks?: TaskItem[];
};

export function useTeacherTaskSession(sessionId: number) {
  // ── Session & Request data ──
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [request, setRequest] = useState<RequestWithTasks | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // ── Task reports ──
  const [requestReports, setRequestReports] = useState<TaskReport[]>([]);
  const [sessionReports, setSessionReports] = useState<TaskReport[]>([]);
  const [requestReportsLoading, setRequestReportsLoading] = useState(false);
  const [sessionReportsLoading, setSessionReportsLoading] = useState(false);

  // ── Expanded expenses ──
  const [expandedExpensesReportId, setExpandedExpensesReportId] = useState<number | null>(null);
  const [searchTitle, setSearchTitle] = useState('');

  // ── Create/Edit modal ──
  const [openModal, setOpenModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreatingForRequest, setIsCreatingForRequest] = useState(false);
  const [formState, setFormState] = useState<ReportFormState>({ 
    title: '', 
    description: '', 
    startAt: '', 
    endAt: '' 
  });
  const [saving, setSaving] = useState(false);

  // ── Expense management ──
  const [hasExpense, setHasExpense] = useState(false);
  const [createExpenses, setCreateExpenses] = useState<CreateExpenseRow[]>([]);

  // ── Load session & request ──
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const run = async () => {
      setSessionLoading(true);
      try {
        const s = await sessionApi.getById(sessionId);
        if (cancelled) return;
        setSession(s);
        
        if (s.RequestId) {
          try {
            const req = await requestApi.getById(s.RequestId);
            if (!cancelled) setRequest(req);
          } catch {
            if (!cancelled) message.error('Không tải được thông tin yêu cầu.');
          }
        }
      } catch {
        if (cancelled) return;
        message.error('Không tải được thông tin buổi.');
      } finally {
        if (cancelled) return;
        setSessionLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [sessionId]);

  // ── Load request reports ──
  useEffect(() => {
    if (!session?.RequestId) return;
    let cancelled = false;
    const run = async () => {
      setRequestReportsLoading(true);
      setRequestReports([]);
      try {
        const res = await taskReportApi.getAll({
          requestId: session.RequestId,
          pageNumber: 1,
          pageSize: 100,
        });
        if (cancelled) return;
        // Filter to only get reports that have requestId but no sessionId
        const filteredReports = (res.items ?? []).filter(r => r.requestId && !r.sessionId);
        setRequestReports(filteredReports);
      } catch {
        if (cancelled) return;
        message.error('Không tải được báo cáo cho yêu cầu.');
      } finally {
        if (cancelled) return;
        setRequestReportsLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [session?.RequestId]);

  // ── Load session reports ──
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const run = async () => {
      setSessionReportsLoading(true);
      setSessionReports([]);
      try {
        const res = await taskReportApi.getAll({
          sessionId,
          pageNumber: 1,
          pageSize: 100,
        });
        if (cancelled) return;
        setSessionReports(res.items ?? []);
      } catch {
        if (cancelled) return;
        message.error('Không tải được báo cáo cho buổi.');
      } finally {
        if (cancelled) return;
        setSessionReportsLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [sessionId]);

  // ── Expense helpers ──
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
      if (file.size > 5 * 1024 * 1024) { 
        message.warning('Ảnh tối đa 5MB.'); 
        return; 
      }
      updateCreateExpense(key, { file, preview: '' });
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          updateCreateExpense(key, { preview: reader.result });
        }
      };
      reader.readAsDataURL(file);
    },
    [updateCreateExpense],
  );

  // ── Modal actions ──
  const openAddModal = useCallback(() => {
    setEditingId(null);
    setIsCreatingForRequest(false);
    setFormState({ title: '', description: '', startAt: '', endAt: '' });
    setHasExpense(false);
    setCreateExpenses([]);
    setOpenModal(true);
  }, []);

  const openAddModalForRequest = useCallback(() => {
    setEditingId(null);
    setIsCreatingForRequest(true);
    setFormState({ title: '', description: '', startAt: '', endAt: '' });
    setHasExpense(false);
    setCreateExpenses([]);
    setOpenModal(true);
  }, []);

  const startEdit = useCallback((r: TaskReport) => {
    setEditingId(r.taskReportId);
    setIsCreatingForRequest(false);
    setFormState({ 
      title: r.title ?? '', 
      description: r.description ?? '', 
      startAt: r.startAt ?? '', 
      endAt: r.endAt ?? '' 
    });
    setHasExpense(false);
    setCreateExpenses([]);
    setOpenModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setOpenModal(false);
    setEditingId(null);
    setIsCreatingForRequest(false);
    setFormState({ title: '', description: '', startAt: '', endAt: '' });
    setHasExpense(false);
    setCreateExpenses([]);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formState.title.trim() || !formState.description.trim()) {
      message.warning('Vui lòng nhập tiêu đề và mô tả.');
      return;
    }

    // Validate expenses if toggled on (create mode only)
    if (editingId == null && hasExpense) {
      if (createExpenses.length === 0) {
        message.warning('Vui lòng thêm ít nhất 1 khoản chi phí.');
        return;
      }
      for (let i = 0; i < createExpenses.length; i++) {
        const exp = createExpenses[i];
        const amountNum = Number((exp.amount || '').replace(/\D/g, ''));
        if (!amountNum || amountNum <= 0) {
          message.warning(`Vui lòng nhập số tiền hợp lệ (khoản #${i + 1}).`);
          return;
        }
        if (!exp.description.trim()) {
          message.warning(`Vui lòng nhập mô tả cho khoản chi (khoản #${i + 1}).`);
          return;
        }
        if (!exp.file) {
          message.warning(`Mỗi khoản chi phí bắt buộc có ảnh chứng từ (khoản #${i + 1}).`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      if (editingId != null) {
        const updated = await taskReportApi.update(editingId, {
          sessionId,
          title: formState.title.trim(),
          description: formState.description.trim(),
          startAt: formState.startAt || null,
          endAt: formState.endAt || null,
        });
        // Update in the correct list based on the report type
        const isRequestReport = !updated.sessionId && updated.requestId;
        if (isRequestReport) {
          setRequestReports((prev) => prev.map((r) => (r.taskReportId === editingId ? updated : r)));
        } else {
          setSessionReports((prev) => prev.map((r) => (r.taskReportId === editingId ? updated : r)));
        }
        message.success('Đã cập nhật báo cáo.');
      } else {
        const expensesInput =
          hasExpense && createExpenses.length
            ? createExpenses.map((exp, idx) => ({
                amount: Number((exp.amount || '').replace(/\D/g, '')),
                description: exp.description.trim(),
                paymentImgIndex: idx,
              }))
            : undefined;

        const paymentImages =
          hasExpense && createExpenses.length
            ? createExpenses.map((exp) => exp.file!).filter(Boolean)
            : undefined;

        const created = await taskReportApi.create({
          sessionId,
          title: formState.title.trim(),
          description: formState.description.trim(),
          startAt: formState.startAt || null,
          endAt: formState.endAt || null,
          ...(expensesInput && paymentImages ? { expenses: expensesInput, paymentImages } : {}),
        });
        setSessionReports((prev) => [...prev, created]);
        message.success('Đã tạo báo cáo.');
      }
      closeModal();
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }, [formState, editingId, sessionId, hasExpense, createExpenses, closeModal]);

  const handleSaveForRequest = useCallback(async () => {
    if (!formState.title.trim() || !formState.description.trim()) {
      message.warning('Vui lòng nhập tiêu đề và mô tả.');
      return;
    }

    if (!session?.RequestId) {
      message.error('Không tìm thấy thông tin yêu cầu.');
      return;
    }

    // Validate expenses if toggled on
    if (hasExpense) {
      if (createExpenses.length === 0) {
        message.warning('Vui lòng thêm ít nhất 1 khoản chi phí.');
        return;
      }
      for (let i = 0; i < createExpenses.length; i++) {
        const exp = createExpenses[i];
        const amountNum = Number((exp.amount || '').replace(/\D/g, ''));
        if (!amountNum || amountNum <= 0) {
          message.warning(`Vui lòng nhập số tiền hợp lệ (khoản #${i + 1}).`);
          return;
        }
        if (!exp.description.trim()) {
          message.warning(`Vui lòng nhập mô tả cho khoản chi (khoản #${i + 1}).`);
          return;
        }
        if (!exp.file) {
          message.warning(`Mỗi khoản chi phí bắt buộc có ảnh chứng từ (khoản #${i + 1}).`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const expensesInput =
        hasExpense && createExpenses.length
          ? createExpenses.map((exp, idx) => ({
              amount: Number((exp.amount || '').replace(/\D/g, '')),
              description: exp.description.trim(),
              paymentImgIndex: idx,
            }))
          : undefined;

      const paymentImages =
        hasExpense && createExpenses.length
          ? createExpenses.map((exp) => exp.file!).filter(Boolean)
          : undefined;

      const created = await taskReportApi.create({
        requestId: session.RequestId,
        title: formState.title.trim(),
        description: formState.description.trim(),
        startAt: formState.startAt || null,
        endAt: formState.endAt || null,
        ...(expensesInput && paymentImages ? { expenses: expensesInput, paymentImages } : {}),
      });
      setRequestReports((prev) => [...prev, created]);
      message.success('Đã tạo báo cáo cho yêu cầu.');
      closeModal();
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }, [formState, session, hasExpense, createExpenses, closeModal]);

  const handleDelete = useCallback(async (taskReportId: number) => {
    try {
      await taskReportApi.remove(taskReportId);
      // Remove from both lists
      setRequestReports((prev) => prev.filter((r) => r.taskReportId !== taskReportId));
      setSessionReports((prev) => prev.filter((r) => r.taskReportId !== taskReportId));
      message.success('Đã xóa báo cáo.');
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  }, []);

  return {
    // Data
    session,
    request,
    requestReports,
    sessionReports,
    sessionLoading,
    requestReportsLoading,
    sessionReportsLoading,
    
    // Expense expansion
    expandedExpensesReportId,
    setExpandedExpensesReportId,
    searchTitle,
    setSearchTitle,
    
    // Modal state
    openModal,
    editingId,
    isCreatingForRequest,
    formState,
    setFormState,
    saving,
    setOpenModal,
    setEditingId,
    
    // Expense state
    hasExpense,
    createExpenses,
    setCreateExpenses,
    setHasExpense,
    
    // Actions
    openAddModal,
    openAddModalForRequest,
    startEdit,
    closeModal,
    handleSave,
    handleSaveForRequest,
    handleDelete,
    handleHasExpenseToggle,
    updateCreateExpense,
    handleCreateExpenseImgChange,
    createEmptyExpense,
  };
}
