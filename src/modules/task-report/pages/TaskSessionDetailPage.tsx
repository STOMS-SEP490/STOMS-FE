import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clock, FileText, MapPin, Plus, Trash2, Users, Wallet, X, Image as ImageIcon, ImageOff } from 'lucide-react';
import { message, Spin, Timeline } from 'antd';
import dayjs from 'dayjs';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { DatePicker } from 'antd';
import type { Dayjs } from 'dayjs';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Dialog } from '@/shared/components/ui/dialog';
import { getExpenseStatusInfo, EXPENSE_STATUS } from '@/constants/status';

import sessionApi from '@/modules/request/api/sessionApi';
import type { SessionResponse } from '@/modules/request/session.types';
import { taskReportApi } from '../api/taskReportApi';
import type { TaskReport, TaskReportExpense } from '../taskReport';
import requestApi from '@/modules/request/api/requestApi';
import type { RequestListItem } from '@/modules/request/request';
import { expenseApi } from '@/modules/transaction/api/expenseApi';
import { walletApi, type WalletListItem } from '@/modules/transaction/api/walletApi';

type TaskItem = {
  TaskId?: number;
  Title?: string | null;
  Description?: string | null;
  Status?: string | null;
};

type RequestWithTasks = RequestListItem & {
  Tasks?: TaskItem[];
};

const DEFAULT_AVATAR = '/img/ava.png';

function getAvatarSrc(src?: string | null) {
  return src && String(src).trim() ? String(src) : DEFAULT_AVATAR;
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start || !end) return '—';
  try {
    const s = format(new Date(start), 'HH:mm dd/MM/yyyy', { locale: vi });
    const e = format(new Date(end), 'HH:mm dd/MM/yyyy', { locale: vi });
    return `${s} – ${e}`;
  } catch {
    return `${start} – ${end}`;
  }
}

type MemberSlot = {
  memberId: number;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
};

type ReportFormState = {
  title: string;
  description: string;
  startAt: string;
  endAt: string;
};

type CreateExpenseRow = {
  key: string;
  amount: string;
  description: string;
  file: File | null;
  preview: string;
};

export default function TaskSessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const rolePrefix = location.pathname.startsWith('/teacher/') ? '/teacher' : location.pathname.startsWith('/tl/') ? '/tl' : '/manager';
  const isManager = rolePrefix === '/manager';

  const parsedSessionId = Number(sessionId ?? 0);

  // ── Session data ──
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // ── Request data (for common tasks) ──
  const [request, setRequest] = useState<RequestWithTasks | null>(null);

  // ── Members derived from assignments ──
  const members = useMemo<MemberSlot[]>(() => {
    if (!session?.Assignments) return [];
    const seen = new Set<number>();
    const result: MemberSlot[] = [];
    for (const a of session.Assignments) {
      const sm = a.StaffMember;
      if (!sm) continue;
      const mid = sm.MemberId;
      if (!mid || seen.has(mid)) continue;
      seen.add(mid);
      result.push({
        memberId: mid,
        fullName: sm.FullName ?? '—',
        email: sm.Email ?? sm.User?.Email ?? '',
        avatarUrl: sm.AvatarUrl ?? null,
        role: a.StaffRole ?? '',
      });
    }
    return result;
  }, [session]);

  // ── Selected member ──
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  // ── Task reports for selected member ──
  const [reports, setReports] = useState<TaskReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // ── Expanded expenses ──
  const [expandedExpensesReportId, setExpandedExpensesReportId] = useState<number | null>(null);

  // ── Image preview popup ──
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // ── Expense detail popup ──
  const [selectedExpense, setSelectedExpense] = useState<TaskReportExpense | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingExpense, setProcessingExpense] = useState(false);
  
  // ── Wallets for approval ──
  const [wallets, setWallets] = useState<WalletListItem[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null);
  const [walletsLoading, setWalletsLoading] = useState(false);

  // ── Create/Edit modal ──
  const [openModal, setOpenModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formState, setFormState] = useState<ReportFormState>({ title: '', description: '', startAt: '', endAt: '' });
  const [saving, setSaving] = useState(false);

  // ── Expense rows for create (non-manager only) ──
  const [hasExpense, setHasExpense] = useState(false);
  const [createExpenses, setCreateExpenses] = useState<CreateExpenseRow[]>([]);

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
      if (!file) { updateCreateExpense(key, { file: null, preview: '' }); return; }
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        message.warning('Vui lòng chọn ảnh PNG hoặc JPG.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { message.warning('Ảnh tối đa 5MB.'); return; }
      updateCreateExpense(key, { file, preview: '' });
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') updateCreateExpense(key, { preview: reader.result });
      };
      reader.readAsDataURL(file);
    },
    [updateCreateExpense],
  );

  // ── Load session ──
  useEffect(() => {
    if (!parsedSessionId) return;
    let cancelled = false;
    const run = async () => {
      setSessionLoading(true);
      try {
        const s = await sessionApi.getById(parsedSessionId);
        if (cancelled) return;
        setSession(s);
        
        // Load request if exists
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
  }, [parsedSessionId]);

  // ── Load wallets (for manager) ──
  useEffect(() => {
    if (!isManager) return;
    let cancelled = false;
    const run = async () => {
      setWalletsLoading(true);
      try {
        const res = await walletApi.getWallets({ pageNumber: 1, pageSize: 50 });
        if (cancelled) return;
        setWallets(res.items ?? []);
        if (res.items && res.items.length > 0) {
          setSelectedWalletId(res.items[0].walletId);
        }
      } catch {
        if (cancelled) return;
        message.error('Không tải được danh sách ví.');
      } finally {
        if (cancelled) return;
        setWalletsLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [isManager]);

  // ── Auto-select first member ──
  useEffect(() => {
    if (members.length > 0 && selectedMemberId === null) {
      setSelectedMemberId(members[0].memberId);
    }
  }, [members, selectedMemberId]);

  // ── Load reports when member changes ──
  useEffect(() => {
    if (!selectedMemberId || !parsedSessionId) return;
    let cancelled = false;
    const run = async () => {
      setReportsLoading(true);
      setReports([]);
      try {
        const res = await taskReportApi.getAll({
          sessionId: parsedSessionId,
          MemberId: selectedMemberId,
          pageNumber: 1,
          pageSize: 100,
        });
        if (cancelled) return;
        setReports(res.items ?? []);
      } catch {
        if (cancelled) return;
        message.error('Không tải được báo cáo.');
      } finally {
        if (cancelled) return;
        setReportsLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [selectedMemberId, parsedSessionId]);

  const sortedReports = useMemo(
    () => [...reports].sort((a, b) => {
      const t1 = a.startAt ? new Date(a.startAt).getTime() : 0;
      const t2 = b.startAt ? new Date(b.startAt).getTime() : 0;
      return t1 - t2;
    }),
    [reports],
  );

  const selectedMember = useMemo(
    () => members.find((m) => m.memberId === selectedMemberId) ?? null,
    [members, selectedMemberId],
  );

  const openAddModal = useCallback(() => {
    setEditingId(null);
    setFormState({ title: '', description: '', startAt: '', endAt: '' });
    setHasExpense(false);
    setCreateExpenses([]);
    setOpenModal(true);
  }, []);

  const startEdit = useCallback((r: TaskReport) => {
    setEditingId(r.taskReportId);
    setFormState({ title: r.title ?? '', description: r.description ?? '', startAt: r.startAt ?? '', endAt: r.endAt ?? '' });
    setHasExpense(false);
    setCreateExpenses([]);
    setOpenModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setOpenModal(false);
    setEditingId(null);
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
          sessionId: parsedSessionId,
          title: formState.title.trim(),
          description: formState.description.trim(),
          startAt: formState.startAt || null,
          endAt: formState.endAt || null,
        });
        setReports((prev) => prev.map((r) => (r.taskReportId === editingId ? updated : r)));
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
          sessionId: parsedSessionId,
          title: formState.title.trim(),
          description: formState.description.trim(),
          startAt: formState.startAt || null,
          endAt: formState.endAt || null,
          ...(expensesInput && paymentImages ? { expenses: expensesInput, paymentImages } : {}),
        });
        setReports((prev) => [...prev, created]);
        message.success('Đã tạo báo cáo.');
      }
      closeModal();
    } catch (err) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Lưu thất bại.';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  }, [formState, editingId, parsedSessionId, hasExpense, createExpenses, closeModal]);

  const handleDelete = useCallback(async (taskReportId: number) => {
    try {
      await taskReportApi.remove(taskReportId);
      setReports((prev) => prev.filter((r) => r.taskReportId !== taskReportId));
      message.success('Đã xóa báo cáo.');
    } catch {
      message.error('Xóa thất bại.');
    }
  }, []);

  const handleApproveExpense = useCallback(async () => {
    if (!selectedExpense || !selectedWalletId) {
      message.warning('Vui lòng chọn ví để thanh toán.');
      return;
    }
    setProcessingExpense(true);
    try {
      await expenseApi.approve({ walletId: selectedWalletId, expenseIds: [selectedExpense.expenseId] });
      
      // Update local state
      setReports((prev) =>
        prev.map((r) => ({
          ...r,
          expenses: r.expenses?.map((e) =>
            e.expenseId === selectedExpense.expenseId ? { ...e, status: 2 } : e
          ) ?? null,
        }))
      );
      
      message.success('Đã duyệt khoản chi.');
      setSelectedExpense(null);
      setRejectReason('');
    } catch (err) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Duyệt thất bại.';
      message.error(msg);
    } finally {
      setProcessingExpense(false);
    }
  }, [selectedExpense, selectedWalletId]);

  const handleRejectExpense = useCallback(async () => {
    if (!selectedExpense || !rejectReason.trim()) {
      message.warning('Vui lòng nhập lý do từ chối.');
      return;
    }
    setProcessingExpense(true);
    try {
      await expenseApi.reject({ expenseId: selectedExpense.expenseId, reason: rejectReason.trim() });
      
      // Update local state
      setReports((prev) =>
        prev.map((r) => ({
          ...r,
          expenses: r.expenses?.map((e) =>
            e.expenseId === selectedExpense.expenseId
              ? { ...e, status: 3, rejectReason: rejectReason.trim() }
              : e
          ) ?? null,
        }))
      );
      
      message.success('Đã từ chối khoản chi.');
      setSelectedExpense(null);
      setRejectReason('');
    } catch (err) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Từ chối thất bại.';
      message.error(msg);
    } finally {
      setProcessingExpense(false);
    }
  }, [selectedExpense, rejectReason]);

  const sessionTitle = session
    ? (session.SubjectSession?.Title ?? session.EventSession?.Title ?? session.Notes ?? `Buổi ${session.SessionNo}`)
    : '—';

  return (
    <div
      className="flex flex-col gap-4 p-6 app-page-bg overflow-hidden"
      style={{ height: 'var(--content-height, 100vh)' }}
    >
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <button
          type="button"
          onClick={() => navigate(`${rolePrefix}/tasks`)}
          className="flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
          title="Quay lại"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="h-5 w-px bg-slate-200" />
        <div className="min-w-0 flex-1">
          {sessionLoading ? (
            <div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
          ) : (
            <>
              <h2 className="text-lg font-semibold text-slate-900 truncate">
                Buổi {session?.SessionNo ?? '—'} — {sessionTitle}
              </h2>
              <div className="flex flex-wrap items-center gap-3 mt-0.5 text-xs text-slate-500">
                {session?.StartAt && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {dayjs(session.StartAt).format('DD/MM/YYYY')}
                  </span>
                )}
                {session?.StartAt && session?.EndAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {dayjs(session.StartAt).format('HH:mm')} – {dayjs(session.EndAt).format('HH:mm')}
                  </span>
                )}
                {session?.Location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {session.Location}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* Left: Reports area */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
          {/* Selected member header + add button */}
          <div className="shrink-0 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              {selectedMember ? (
                <>
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-sky-100">
                    <img
                      src={getAvatarSrc(selectedMember.avatarUrl)}
                      alt={selectedMember.fullName}
                      className="h-full w-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR; }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{selectedMember.fullName}</p>
                    <p className="text-xs text-slate-500 truncate">{selectedMember.email || selectedMember.role || '—'}</p>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-slate-400">
                  <Users className="h-5 w-5" />
                  <span className="text-sm">Chọn thành viên bên phải để xem báo cáo</span>
                </div>
              )}
            </div>
            {selectedMember && !isManager && (
              <Button
                type="button"
                size="sm"
                className="shrink-0 gap-1.5 bg-[#2197C0] hover:bg-[#208AAE] text-white text-xs"
                onClick={openAddModal}
              >
                <Plus className="h-3.5 w-3.5" />
                Tạo báo cáo
              </Button>
            )}
          </div>

          {/* Reports list */}
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
            {!selectedMember ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="text-center py-12">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                    <FileText className="h-7 w-7 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Chọn thành viên để xem báo cáo</p>
                  <p className="mt-1 text-xs text-slate-400">Danh sách thành viên ở cột bên phải</p>
                </div>
              </div>
            ) : reportsLoading ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                <Spin />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Common Tasks from Request */}
                {request?.Tasks && request.Tasks.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-5 py-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-sky-600" />
                      Công việc chung
                    </h3>
                    <div className="space-y-2">
                      {request.Tasks.map((task, idx) => (
                        <div key={task.TaskId ?? idx} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="text-sm font-semibold text-slate-900">{task.Title || '—'}</div>
                          {task.Description && (
                            <p className="mt-1 text-xs text-slate-600">{task.Description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Individual Task Reports */}
                {sortedReports.length === 0 && (!request?.Tasks || request.Tasks.length === 0) ? (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="text-center py-12">
                      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                        <FileText className="h-7 w-7 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-700">
                        {isManager ? 'Chưa có báo cáo nào' : 'Chưa có báo cáo nào'}
                      </p>
                      {!isManager && (
                        <p className="mt-1 text-xs text-slate-400">
                          Nhấn <strong className="text-sky-600">Tạo báo cáo</strong> để thêm
                        </p>
                      )}
                    </div>
                  </div>
                ) : sortedReports.length > 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-5 py-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-sky-600" />
                      Báo cáo công việc cá nhân
                    </h3>
                    <Timeline
                      className="mt-4"
                      items={sortedReports.map((r) => {
                        const hasExpenses = (r.expenses?.length ?? 0) > 0;
                        return {
                          dot: <div className="h-2.5 w-2.5 rounded-full bg-sky-500 border-2 border-white shadow-sm" />,
                          children: (
                            <div className="pb-2">
                              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                <div className="text-xs font-medium text-sky-700">
                                  {formatDateRange(r.startAt, r.endAt)}
                                </div>
                                <div className="mt-0.5 text-sm font-semibold text-slate-900">{r.title || '—'}</div>
                                <p className="mt-1 text-xs text-slate-600 line-clamp-3">{r.description || '—'}</p>

                                <div className="mt-3 flex items-center justify-between">
                                  <div>
                                    {hasExpenses ? (
                                      <button
                                        type="button"
                                        onClick={() => setExpandedExpensesReportId((prev) => prev === r.taskReportId ? null : r.taskReportId)}
                                        className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-800 hover:bg-sky-100 transition shadow-sm"
                                      >
                                        <Wallet className="h-3 w-3" />
                                        Chi phí ({r.expenses!.length})
                                      </button>
                                    ) : (
                                      <span className="text-xs text-slate-400">Không có chi phí</span>
                                    )}
                                  </div>
                                  {!isManager && (
                                    <div className="flex items-center gap-1">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-xs text-slate-600"
                                        onClick={() => startEdit(r)}
                                      >
                                        Sửa
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-1.5 text-red-500 hover:bg-red-50"
                                        onClick={() => void handleDelete(r.taskReportId)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  )}
                                </div>

                                {/* Expenses expanded - Simplified list */}
                                {hasExpenses && expandedExpensesReportId === r.taskReportId && (
                                  <div className="mt-3 space-y-0 border-t border-slate-100 pt-3">
                                    {r.expenses!.map((exp, idx) => {
                                      const info = getExpenseStatusInfo(exp.status);
                                      const amountColor =
                                        info.code === EXPENSE_STATUS.PENDING ? 'text-amber-900'
                                        : info.code === EXPENSE_STATUS.APPROVED ? 'text-emerald-900'
                                        : info.code === EXPENSE_STATUS.REJECTED ? 'text-rose-900'
                                        : 'text-slate-900';
                                      return (
                                        <button
                                          key={exp.expenseId ?? idx}
                                          type="button"
                                          onClick={() => setSelectedExpense(exp)}
                                          className="w-full bg-white border-t border-b border-slate-200 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                                        >
                                          <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                              <p className="text-sm font-medium text-slate-900">{exp.description || `Khoản chi ${idx + 1}`}</p>
                                              <div className="mt-1 flex items-center gap-2">
                                                <span className="text-xs text-slate-600">Trạng thái:</span>
                                                <Badge className={`text-[10px] px-2 py-0.5 ${info.className}`}>{info.label}</Badge>
                                              </div>
                                            </div>
                                            <span className={`shrink-0 text-sm font-bold tabular-nums whitespace-nowrap ${amountColor}`}>
                                              {exp.amount != null
                                                ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(exp.amount)
                                                : '—'}
                                            </span>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          ),
                        };
                      })}
                    />
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Right: Member list */}
        <div className="flex w-[280px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="shrink-0 border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-900">Thành viên buổi</h3>
              {members.length > 0 && (
                <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {members.length}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-2 space-y-1">
            {sessionLoading ? (
              <div className="flex justify-center py-8"><Spin size="small" /></div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                <Users className="h-8 w-8 text-slate-300" />
                <p className="text-xs text-slate-500">Chưa có thành viên được phân công.</p>
              </div>
            ) : (
              members.map((m) => {
                const isSelected = m.memberId === selectedMemberId;
                return (
                  <button
                    key={m.memberId}
                    type="button"
                    onClick={() => setSelectedMemberId(m.memberId)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-sky-50 border border-sky-200 shadow-sm'
                        : 'border border-transparent hover:bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-100">
                      <img
                        src={getAvatarSrc(m.avatarUrl)}
                        alt={m.fullName}
                        className="h-full w-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR; }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold truncate ${isSelected ? 'text-sky-800' : 'text-slate-900'}`}>
                        {m.fullName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{m.email || '—'}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit modal */}
      <Dialog
        open={openModal}
        onClose={closeModal}
        title={editingId != null ? 'Chỉnh sửa báo cáo' : 'Tạo báo cáo'}
        description={editingId != null ? 'Chỉnh sửa nội dung báo cáo công việc.' : 'Điền thông tin báo cáo công việc.'}
        className="max-w-lg"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Thời gian bắt đầu</label>
              <DatePicker
                showTime
                format="DD/MM/YYYY HH:mm"
                className="w-full [&_.ant-picker-input>input]:text-black"
                value={formState.startAt ? dayjs(formState.startAt) : null}
                onChange={(d: Dayjs | null) => setFormState((p) => ({ ...p, startAt: d ? d.toISOString() : '' }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Thời gian kết thúc</label>
              <DatePicker
                showTime
                format="DD/MM/YYYY HH:mm"
                className="w-full [&_.ant-picker-input>input]:text-black"
                value={formState.endAt ? dayjs(formState.endAt) : null}
                onChange={(d: Dayjs | null) => setFormState((p) => ({ ...p, endAt: d ? d.toISOString() : '' }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tiêu đề *</label>
            <input
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Ví dụ: Chuẩn bị bài, Giảng phần 1..."
              value={formState.title}
              onChange={(e) => setFormState((p) => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Mô tả *</label>
            <textarea
              className="w-full min-h-[80px] resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Nội dung công việc đã làm..."
              value={formState.description}
              onChange={(e) => setFormState((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          {/* Expense section – only for create mode and non-manager */}
          {editingId == null && !isManager && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasExpense}
                  onChange={(e) => handleHasExpenseToggle(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                />
                <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <Wallet className="h-4 w-4 text-sky-600" />
                  Chi phí phát sinh
                </span>
              </label>

              {hasExpense && (
                <div className="space-y-3">
                  {createExpenses.map((exp, idx) => (
                    <div key={exp.key} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-600">Khoản chi #{idx + 1}</span>
                        {createExpenses.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setCreateExpenses((prev) => prev.filter((e) => e.key !== exp.key))}
                            className="text-rose-400 hover:text-rose-600 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <input
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        placeholder="Số tiền (VNĐ)"
                        value={exp.amount}
                        onChange={(e) => updateCreateExpense(exp.key, { amount: e.target.value.replace(/\D/g, '') })}
                      />
                      <input
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        placeholder="Mô tả khoản chi"
                        value={exp.description}
                        onChange={(e) => updateCreateExpense(exp.key, { description: e.target.value })}
                      />
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-600">
                          Ảnh chứng từ *
                        </label>
                        {exp.preview ? (
                          <div className="relative">
                            <img src={exp.preview} alt="preview" className="h-24 w-full rounded-lg object-cover border border-slate-200" />
                            <button
                              type="button"
                              onClick={() => updateCreateExpense(exp.key, { file: null, preview: '' })}
                              className="absolute top-1 right-1 rounded-full bg-white/80 p-0.5 text-slate-600 hover:text-rose-600 shadow"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-3 py-3 text-xs text-slate-500 hover:border-sky-400 hover:text-sky-600 transition-colors">
                            <ImageIcon className="h-4 w-4" />
                            Chọn ảnh PNG/JPG (tối đa 5MB)
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg"
                              className="hidden"
                              onChange={(e) => handleCreateExpenseImgChange(exp.key, e.target.files?.[0] ?? null)}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCreateExpenses((prev) => [...prev, createEmptyExpense()])}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-sky-300 py-2 text-xs font-medium text-sky-600 hover:bg-sky-50 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Thêm khoản chi
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={closeModal} disabled={saving}>
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? 'Đang lưu...' : editingId != null ? 'Cập nhật' : 'Tạo báo cáo'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Expense Detail Popup */}
      {selectedExpense && (
        <Dialog
          open={!!selectedExpense}
          onClose={() => {
            setSelectedExpense(null);
            setRejectReason('');
          }}
          title="Chi tiết khoản chi"
          description="Thông tin chi tiết về khoản chi phí"
          className="max-w-lg"
        >
          <div className="space-y-4">
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
              <p className="text-sm text-slate-900">{selectedExpense.description || '—'}</p>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Số tiền</label>
              <p className="text-lg font-bold text-slate-900">
                {selectedExpense.amount != null
                  ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedExpense.amount)
                  : '—'}
              </p>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label>
              <Badge className={`${getExpenseStatusInfo(selectedExpense.status).className}`}>
                {getExpenseStatusInfo(selectedExpense.status).label}
              </Badge>
            </div>

            {/* Reject Reason (if rejected) */}
            {selectedExpense.status === 3 && selectedExpense.rejectReason && (
              <div>
                <label className="block text-sm font-medium text-rose-700 mb-1">Lý do từ chối</label>
                <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                  {selectedExpense.rejectReason}
                </p>
              </div>
            )}

            {/* Payment Image */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Ảnh minh chứng</label>
              {selectedExpense.paymentImg ? (
                <button
                  type="button"
                  onClick={() => setPreviewImage(selectedExpense.paymentImg)}
                  className="w-full border border-slate-200 rounded-lg overflow-hidden hover:border-sky-400 transition-colors"
                >
                  <img
                    src={selectedExpense.paymentImg}
                    alt="Ảnh minh chứng"
                    className="w-full h-auto object-contain max-h-64"
                  />
                </button>
              ) : (
                <div className="flex items-center justify-center w-full h-32 border border-slate-200 rounded-lg bg-slate-50">
                  <div className="text-center">
                    <ImageOff className="h-8 w-8 text-slate-300 mx-auto mb-1" />
                    <p className="text-xs text-slate-400">Không có ảnh</p>
                  </div>
                </div>
              )}
            </div>

            {/* Approve/Reject Actions (for pending status and manager role) */}
            {selectedExpense.status === 1 && isManager && (
              <div className="space-y-3 pt-3 border-t border-slate-200">
                {/* Wallet Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Chọn ví thanh toán *</label>
                  {walletsLoading ? (
                    <div className="text-sm text-slate-500">Đang tải danh sách ví...</div>
                  ) : wallets.length === 0 ? (
                    <div className="text-sm text-rose-600">Không có ví nào khả dụng</div>
                  ) : (
                    <select
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-sky-500"
                      value={selectedWalletId ?? ''}
                      onChange={(e) => setSelectedWalletId(Number(e.target.value))}
                    >
                      {wallets.map((wallet) => (
                        <option key={wallet.walletId} value={wallet.walletId}>
                          {wallet.walletName} - {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(wallet.balance)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Reject Reason */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Lý do từ chối (nếu từ chối)</label>
                  <textarea
                    className="w-full min-h-[60px] resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="Nhập lý do từ chối..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-rose-200 text-rose-700 hover:bg-rose-50"
                    onClick={() => void handleRejectExpense()}
                    disabled={processingExpense || !rejectReason.trim()}
                  >
                    Từ chối
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => void handleApproveExpense()}
                    disabled={processingExpense || !selectedWalletId || wallets.length === 0}
                  >
                    {processingExpense ? 'Đang xử lý...' : 'Duyệt'}
                  </Button>
                </div>
              </div>
            )}

            {/* Close button for non-pending or non-manager */}
            {(selectedExpense.status !== 1 || !isManager) && (
              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedExpense(null);
                    setRejectReason('');
                  }}
                >
                  Đóng
                </Button>
              </div>
            )}
          </div>
        </Dialog>
      )}

      {/* Image Preview Popup */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="h-8 w-8" />
            </button>
            <img
              src={previewImage}
              alt="Ảnh minh chứng"
              className="max-h-[90vh] max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
