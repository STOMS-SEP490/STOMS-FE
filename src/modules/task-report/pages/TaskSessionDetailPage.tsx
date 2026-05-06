import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clock, FileText, MapPin, Plus, RotateCcw, Trash2, Users, Wallet, X, Image as ImageIcon, ImageOff } from 'lucide-react';
import { message, Spin, Switch, Timeline } from 'antd';
import dayjs from 'dayjs';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { DatePicker } from 'antd';
import type { Dayjs } from 'dayjs';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Dialog } from '@/shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import HoverSearch from '@/shared/components/ui/search';
import { getExpenseStatusInfo, EXPENSE_STATUS } from '@/constants/status';
import { getStaffRoleId, getRoleLabel, getRoleBadgeClass } from '@/constants/role';

import type { TaskReport } from '../taskReport';
import { useManagerTaskSession } from '../hooks/useManagerTaskSession';
import { useExpenseManagement } from '../hooks/useExpenseManagement';
import { useExpenseForm } from '../hooks/useExpenseForm';
import { useWalletSelection } from '../hooks/useWalletSelection';



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
  roleLabel?: string; // Giảng viên, Sinh viên, TA
};

type ReportFormState = {
  title: string;
  description: string;
  startAt: string;
  endAt: string;
};

export default function TaskSessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const rolePrefix = location.pathname.startsWith('/teacher/') ? '/teacher' : location.pathname.startsWith('/tl/') ? '/tl' : '/manager';
  const isManager = rolePrefix === '/manager';

  const parsedSessionId = Number(sessionId ?? 0);

  // ── Selected member ──
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [showPendingExpenseOnly, setShowPendingExpenseOnly] = useState(false);

  // ── Use manager task session hook ──
  const {
    session,
    request,
    requestReports,
    sessionReports,
    sessionLoading,
    requestReportsLoading,
    sessionReportsLoading,
    searchTitle,
    setSearchTitle,
    refetch,
  } = useManagerTaskSession(parsedSessionId, selectedMemberId, showPendingExpenseOnly);

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
      
      // Determine role using centralized utilities
      const roleId = getStaffRoleId(a.StaffRole);
      const roleLabel = getRoleLabel(roleId);
      
      result.push({
        memberId: mid,
        fullName: sm.FullName ?? '—',
        email: sm.Email ?? sm.User?.Email ?? '',
        avatarUrl: sm.AvatarUrl ?? null,
        role: a.StaffRole ?? '',
        roleLabel,
      });
    }
    return result;
  }, [session]);

  // ── Expanded expenses ──
  const [expandedExpensesReportId, setExpandedExpensesReportId] = useState<number | null>(null);

  // ── Use custom hooks ──
  const expenseManagement = useExpenseManagement(refetch);
  const expenseForm = useExpenseForm(refetch);
  const { wallets, selectedWalletId, setSelectedWalletId, walletsLoading } = useWalletSelection(isManager);

  // ── Create/Edit modal ──
  const [openModal, setOpenModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formState, setFormState] = useState<ReportFormState>({ title: '', description: '', startAt: '', endAt: '' });

  // ── Auto-select first member ──
  useEffect(() => {
    if (members.length > 0 && selectedMemberId === null) {
      setSelectedMemberId(members[0].memberId);
    }
  }, [members, selectedMemberId]);

  const { sortedRequestReports, sortedSessionReports } = useMemo(() => {
    const filterByTitle = (reports: typeof requestReports) => {
      if (!searchTitle.trim()) return reports;
      return reports.filter(r => 
        r.title?.toLowerCase().includes(searchTitle.toLowerCase())
      );
    };

    return {
      sortedRequestReports: filterByTitle(requestReports).sort((a, b) => {
        const t1 = a.startAt ? new Date(a.startAt).getTime() : 0;
        const t2 = b.startAt ? new Date(b.startAt).getTime() : 0;
        return t1 - t2;
      }),
      sortedSessionReports: filterByTitle(sessionReports).sort((a, b) => {
        const t1 = a.startAt ? new Date(a.startAt).getTime() : 0;
        const t2 = b.startAt ? new Date(b.startAt).getTime() : 0;
        return t1 - t2;
      })
    };
  }, [requestReports, sessionReports, searchTitle]);

  const selectedMember = useMemo(
    () => members.find((m) => m.memberId === selectedMemberId) ?? null,
    [members, selectedMemberId],
  );

  const openAddModal = useCallback(() => {
    setEditingId(null);
    setFormState({ title: '', description: '', startAt: '', endAt: '' });
    expenseForm.resetCreateExpenses();
    setOpenModal(true);
  }, [expenseForm]);

  const startEdit = useCallback((r: TaskReport) => {
    setEditingId(r.taskReportId);
    setFormState({ title: r.title ?? '', description: r.description ?? '', startAt: r.startAt ?? '', endAt: r.endAt ?? '' });
    expenseForm.resetCreateExpenses();
    setOpenModal(true);
  }, [expenseForm]);

  const closeModal = useCallback(() => {
    setOpenModal(false);
    setEditingId(null);
    setFormState({ title: '', description: '', startAt: '', endAt: '' });
    expenseForm.resetCreateExpenses();
  }, [expenseForm]);

  const handleSave = useCallback(async () => {
    // Manager không thể tạo/sửa báo cáo
    message.warning('Bạn không có quyền tạo/sửa báo cáo.');
  }, []);

  const handleDelete = useCallback(async () => {
    // Manager không thể xóa báo cáo
    message.warning('Bạn không có quyền xóa báo cáo.');
  }, []);

  // Destructure hooks for easier access
  const {
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
  } = expenseManagement;

  const {
    hasExpense,
    createExpenses,
    setCreateExpenses,
    handleHasExpenseToggle,
    updateCreateExpense,
    handleCreateExpenseImgChange,
    createEmptyExpense,
    editExpenseMode,
    setEditExpenseMode,
    editExpenseAmount,
    setEditExpenseAmount,
    editExpenseDescription,
    setEditExpenseDescription,
    setEditExpenseFile,
    editExpensePreview,
    setEditExpensePreview,
    savingExpense,
    openEditExpense,
    handleSaveEditExpense,
  } = expenseForm;

  const sessionTitle = session
    ? (session.SubjectSession?.Title ?? session.EventSession?.Title ?? session.Notes ?? `Buổi ${session.SessionNo}`)
    : '—';

  const resetFilters = () => {
    setSearchTitle('');
    setShowPendingExpenseOnly(false);
  };

  return (
    <div
      className="flex flex-col gap-2 p-6 app-page-bg overflow-hidden"
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

      {/* Search bar */}
      <div className="shrink-0 flex items-center justify-end gap-3">
        <HoverSearch 
          placeholder="Tìm theo tiêu đề..." 
          value={searchTitle} 
          onChange={(v) => setSearchTitle(v)} 
        />
        {isManager && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <Switch
              checked={showPendingExpenseOnly}
              onChange={(v) => setShowPendingExpenseOnly(v)}
              style={{ backgroundColor: showPendingExpenseOnly ? '#2197C0' : undefined }}
            />
            <span className="text-sm text-slate-700 whitespace-nowrap">Có khoản chi chưa duyệt</span>
          </div>
        )}
        <Button 
          variant="outline" 
          size="icon" 
          className="h-9 w-9 bg-[#2197C0] hover:bg-[#208AAE] text-white border-[#2197C0]" 
          onClick={resetFilters}
        >
          <RotateCcw size={16} />
        </Button>
      </div>

      {/* Main content */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* Left: Reports area */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
          {/* Selected member header + add button */}
          {!isManager && rolePrefix !== '/teacher' && (
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
              {selectedMember && (
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
          )}

          {/* Teacher: Simple header with create button */}
          {rolePrefix === '/teacher' && (
            <div className="shrink-0 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 text-[#1a7a99]" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">Báo cáo công việc của tôi</p>
                  <p className="text-xs text-slate-500">Quản lý các báo cáo công việc cho buổi này</p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                className="shrink-0 gap-1.5 bg-[#2197C0] hover:bg-[#208AAE] text-white text-xs"
                onClick={openAddModal}
              >
                <Plus className="h-3.5 w-3.5" />
                Tạo báo cáo
              </Button>
            </div>
          )}

          {/* Reports list */}
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
            {!selectedMember && rolePrefix !== '/teacher' ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="text-center py-12">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                    <FileText className="h-7 w-7 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Chọn thành viên để xem báo cáo</p>
                  <p className="mt-1 text-xs text-slate-400">Danh sách thành viên ở cột bên phải</p>
                </div>
              </div>
            ) : requestReportsLoading || sessionReportsLoading ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                <Spin />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Request-level Task Reports */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-5 py-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#1a7a99]" />
                    Báo cáo công việc cho yêu cầu
                  </h3>
                  {sortedRequestReports.length > 0 ? (
                    <Timeline
                      className="mt-4"
                      items={sortedRequestReports.map((r) => {
                        const hasExpenses = (r.expenses?.length ?? 0) > 0;
                        const hasPendingExpense = hasExpenses && r.expenses!.some((e) => 
                          e.status === 1 || e.status === EXPENSE_STATUS.PENDING
                        );
                        return {
                          dot: <div className="h-2.5 w-2.5 rounded-full bg-[#1a7a99] border-2 border-white shadow-sm" />,
                          children: (
                            <div className="pb-2">
                              <div className="border-l-4 border-l-[#1a7a99] bg-white px-4 py-3 shadow-sm">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-xs font-medium text-[#1a7a99]">
                                    {formatDateRange(r.startAt, r.endAt)}
                                  </div>
                                  {hasPendingExpense && (
                                    <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-2 py-0.5 whitespace-nowrap">
                                      Cần duyệt
                                    </Badge>
                                  )}
                                </div>
                                <div className="mt-0.5 text-sm font-semibold text-slate-900">{r.title || '—'}</div>
                                <p className="mt-1 text-xs text-slate-600 line-clamp-3">{r.description || '—'}</p>

                                <div className="mt-3 flex items-center justify-between">
                                  <div>
                                    {hasExpenses ? (
                                      <button
                                        type="button"
                                        onClick={() => setExpandedExpensesReportId((prev) => prev === r.taskReportId ? null : r.taskReportId)}
                                        className="inline-flex items-center gap-1 rounded-full border border-[#1a7a99]/30 bg-[#1a7a99]/10 px-2.5 py-0.5 text-xs font-medium text-slate-900 hover:bg-sky-100 transition shadow-sm"
                                      >
                                        <Wallet className="h-3 w-3" />
                                        Chi phí ({r.expenses!.length})
                                      </button>
                                    ) : (
                                      <span className="text-xs text-slate-400">Không có chi phí</span>
                                    )}
                                  </div>
                                </div>

                                {/* Expenses expanded */}
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
                                          onClick={() => setSelectedExpense(exp)}
                                          className="w-full bg-white border-t border-b border-slate-200 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                                        >
                                          <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                              <p className="text-sm font-medium text-[#1a7a99]">{exp.description || `Khoản chi ${idx + 1}`}</p>
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
                  ) : (
                    <div className="text-center py-8">
                      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                        <FileText className="h-5 w-5 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-500">Chưa có báo cáo cho yêu cầu</p>
                    </div>
                  )}
                </div>

                {/* Common Tasks from Request */}
                {request?.Tasks && request.Tasks.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-5 py-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#1a7a99]" />
                      Công việc chung cho yêu cầu
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

                {/* Session-level Task Reports */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-5 py-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#1a7a99]" />
                    Báo cáo công việc trong buổi
                  </h3>
                  {sortedSessionReports.length > 0 ? (
                    <Timeline
                      className="mt-4"
                      items={sortedSessionReports.map((r) => {
                        const hasExpenses = (r.expenses?.length ?? 0) > 0;
                        const hasPendingExpense = hasExpenses && r.expenses!.some((e) => 
                          e.status === 1 || e.status === EXPENSE_STATUS.PENDING
                        );
                        return {
                          dot: <div className="h-2.5 w-2.5 rounded-full bg-[#1a7a99] border-2 border-white shadow-sm" />,
                          children: (
                            <div className="pb-2">
                              <div className="border-l-4 border-l-[#1a7a99] bg-white px-4 py-3 shadow-sm">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-xs font-medium text-[#1a7a99]">
                                    {formatDateRange(r.startAt, r.endAt)}
                                  </div>
                                  {hasPendingExpense && (
                                    <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-2 py-0.5 whitespace-nowrap">
                                      Cần duyệt
                                    </Badge>
                                  )}
                                </div>
                                <div className="mt-0.5 text-sm font-semibold text-slate-900">{r.title || '—'}</div>
                                <p className="mt-1 text-xs text-slate-600 line-clamp-3">{r.description || '—'}</p>

                                <div className="mt-3 flex items-center justify-between">
                                  <div>
                                    {hasExpenses ? (
                                      <button
                                        type="button"
                                        onClick={() => setExpandedExpensesReportId((prev) => prev === r.taskReportId ? null : r.taskReportId)}
                                        className="inline-flex items-center gap-1 rounded-full border border-[#1a7a99]/30 bg-[#1a7a99]/10 px-2.5 py-0.5 text-xs font-medium text-slate-900 hover:bg-sky-100 transition shadow-sm"
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
                                        onClick={() => void handleDelete()}
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
                                              <p className="text-sm font-medium text-[#1a7a99]">{exp.description || `Khoản chi ${idx + 1}`}</p>
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
                  ) : (
                    <div className="text-center py-8">
                      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                        <FileText className="h-5 w-5 text-slate-400" />
                      </div>
                      <p className="text-sm text-slate-500">Chưa có báo cáo cho buổi</p>
                    </div>
                  )}
                </div>
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
                const roleId = getStaffRoleId(m.role);
                const badgeClass = getRoleBadgeClass(roleId);
                
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
                      <p className={`text-sm font-semibold truncate ${isSelected ? 'text-slate-900' : 'text-[#1a7a99]'}`}>
                        {m.fullName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {m.email || '—'}
                      </p>
                      {!isManager && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${badgeClass}`}>
                            {m.roleLabel}
                          </span>
                        </div>
                      )}
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
            <label className="mb-1 block text-sm font-medium text-gray-700">Tên công việc*</label>
            <input
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              value={formState.title}
              onChange={(e) => setFormState((p) => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Mô tả *</label>
            <textarea
              className="w-full min-h-[80px] resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
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
                  className="h-4 w-4 rounded border-gray-300 text-[#1a7a99] focus:ring-sky-500"
                />
                <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <Wallet className="h-4 w-4 text-[#1a7a99]" />
                  Chi phí phát sinh
                </span>
              </label>

              {hasExpense && (
                <div className="space-y-3">
                  {createExpenses.map((exp, idx) => (
                    <div key={exp.key} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-700">Khoản chi #{idx + 1}</span>
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
                          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-3 py-3 text-xs text-slate-500 hover:border-sky-400 hover:text-[#1a7a99] transition-colors">
                            <ImageIcon className="h-4 w-4" />
                            Chọn ảnh PNG/JPG (tối đa 10MB)
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
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-sky-300 py-2 text-xs font-medium text-[#1a7a99] hover:bg-sky-50 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Thêm khoản chi
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={closeModal}>
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
              onClick={() => void handleSave()}
            >
              {editingId != null ? 'Cập nhật' : 'Tạo báo cáo'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Expense Detail Popup */}
      {selectedExpense && (
        <Dialog
          open={!!selectedExpense}
          onClose={closeExpenseDetail}
          title={editExpenseMode ? 'Chỉnh sửa khoản chi' : 'Chi tiết khoản chi'}
          description={editExpenseMode ? 'Cập nhật thông tin khoản chi.' : 'Thông tin chi tiết về khoản chi phí'}
          className="max-w-lg"
        >
          {editExpenseMode ? (
            /* ── Edit form ── */
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Số tiền (VNĐ) *</label>
                <input
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Nhập số tiền"
                  value={editExpenseAmount}
                  onChange={(e) => setEditExpenseAmount(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Mô tả</label>
                <input
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Mô tả khoản chi"
                  value={editExpenseDescription}
                  onChange={(e) => setEditExpenseDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Ảnh chứng từ</label>
                {editExpensePreview ? (
                  <div className="relative">
                    <img src={editExpensePreview} alt="preview" className="h-32 w-full rounded-lg object-cover border border-slate-200" />
                    <button
                      type="button"
                      onClick={() => { setEditExpenseFile(null); setEditExpensePreview(''); }}
                      className="absolute top-1 right-1 rounded-full bg-white/80 p-0.5 text-slate-600 hover:text-rose-600 shadow"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-3 py-3 text-xs text-slate-500 hover:border-sky-400 hover:text-[#1a7a99] transition-colors">
                    <ImageIcon className="h-4 w-4" />
                    Chọn ảnh PNG/JPG (tối đa 10MB)
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        if (!file) return;
                        if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
                          message.warning('Vui lòng chọn ảnh PNG hoặc JPG.');
                          e.target.value = '';
                          return;
                        }
                        if (file.size > 10 * 1024 * 1024) {
                          message.warning('Ảnh tối đa 10MB.');
                          e.target.value = '';
                          return;
                        }
                        setEditExpenseFile(file);
                        const reader = new FileReader();
                        reader.onload = () => { if (typeof reader.result === 'string') setEditExpensePreview(reader.result); };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditExpenseMode(false)}>Hủy</Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
                  disabled={savingExpense}
                  onClick={() => void handleSaveEditExpense(selectedExpense)}
                >
                  {savingExpense ? 'Đang lưu...' : 'Lưu'}
                </Button>
              </div>
            </div>
          ) : (
            /* ── Detail view ── */
            <div className="space-y-0 divide-y divide-slate-200">
              <div className="pb-4">
                <label className="block text-xs font-semibold text-slate-500 mb-2">Mô tả</label>
                <p className="text-sm text-slate-900">{selectedExpense.description || '—'}</p>
              </div>
              <div className="py-4">
                <label className="block text-xs font-semibold text-slate-500 mb-2">Số tiền</label>
                <p className="text-2xl font-bold text-slate-900">
                  {selectedExpense.amount != null
                    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedExpense.amount)
                    : '—'}
                </p>
              </div>
              <div className="py-4">
                <label className="block text-xs font-semibold text-slate-500 mb-2">Trạng thái</label>
                <Badge className={`${getExpenseStatusInfo(selectedExpense.status).className}`}>
                  {getExpenseStatusInfo(selectedExpense.status).label}
                </Badge>
              </div>
              {selectedExpense.status === 3 && selectedExpense.rejectReason && (
                <div className="py-4">
                  <label className="block text-xs font-semibold text-rose-600 mb-2">Lý do từ chối</label>
                  <p className="text-sm text-rose-700 bg-rose-50 px-3 py-2">
                    {selectedExpense.rejectReason}
                  </p>
                </div>
              )}
              <div className="py-4">
                <label className="block text-xs font-semibold text-slate-500 mb-3">Ảnh minh chứng</label>
                {selectedExpense.paymentImg ? (
                  <button
                    type="button"
                    onClick={() => setPreviewImage(selectedExpense.paymentImg)}
                    className="border border-slate-200 rounded-lg overflow-hidden hover:border-sky-400 transition-colors"
                  >
                    <img 
                      src={selectedExpense.paymentImg} 
                      alt="Ảnh minh chứng" 
                      className="w-32 h-32 object-cover"
                    />
                  </button>
                ) : (
                  <div className="flex items-center justify-center w-32 h-32 border border-slate-200 bg-slate-50">
                    <div className="text-center">
                      <ImageOff className="h-8 w-8 text-slate-300 mx-auto mb-1" />
                      <p className="text-xs text-slate-400">Không có ảnh</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Manager: approve/reject */}
              {getExpenseStatusInfo(selectedExpense.status).code === EXPENSE_STATUS.PENDING && isManager && (
                <div className="space-y-3 pt-4">
                  {!showRejectReason && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Chọn ví thanh toán *</label>
                      {walletsLoading ? (
                        <div className="text-sm text-slate-500">Đang tải danh sách ví...</div>
                      ) : wallets.length === 0 ? (
                        <div className="text-sm text-rose-600">Không có ví nào khả dụng</div>
                      ) : (
                        <Select value={selectedWalletId?.toString() ?? ''} onValueChange={(v) => setSelectedWalletId(Number(v))}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Chọn ví thanh toán" /></SelectTrigger>
                          <SelectContent>
                            {wallets.map((wallet) => (
                              <SelectItem key={wallet.walletId} value={wallet.walletId.toString()}>
                                {wallet.walletName}: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(wallet.balance)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                  {showRejectReason && (
                    <div>
                      <label className="block text-sm font-medium text-rose-700 mb-1">Lý do từ chối *</label>
                      <textarea
                        className="w-full min-h-[60px] resize-y rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                        placeholder="Nhập lý do từ chối..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    {showRejectReason ? (
                      <>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setShowRejectReason(false);
                            setRejectReason('');
                          }}
                        >
                          Hủy
                        </Button>
                        <Button 
                          type="button" 
                          size="sm" 
                          className="bg-rose-600 hover:bg-rose-700 text-white"
                          onClick={() => void handleRejectExpense()} 
                          disabled={processingExpense || !rejectReason.trim()}
                        >
                          {processingExpense ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          className="border-rose-200 text-rose-700 hover:bg-rose-50"
                          onClick={() => setShowRejectReason(true)}
                        >
                          Từ chối
                        </Button>
                        <Button 
                          type="button" 
                          size="sm" 
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => void handleApproveExpense(selectedWalletId)} 
                          disabled={processingExpense || !selectedWalletId || wallets.length === 0}
                        >
                          {processingExpense ? 'Đang xử lý...' : 'Duyệt'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Teacher: edit if pending */}
              {getExpenseStatusInfo(selectedExpense.status).code === EXPENSE_STATUS.PENDING && !isManager && (
                <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                  <Button type="button" variant="outline" size="sm" onClick={closeExpenseDetail}>Đóng</Button>
                  <Button type="button" size="sm" className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
                    onClick={() => openEditExpense(selectedExpense)}>
                    Chỉnh sửa
                  </Button>
                </div>
              )}

              {/* Non-pending: just close */}
              {getExpenseStatusInfo(selectedExpense.status).code !== EXPENSE_STATUS.PENDING && (
                <div className="flex justify-end pt-4 border-t border-slate-200">
                  <Button type="button" variant="outline" size="sm" onClick={closeExpenseDetail}>Đóng</Button>
                </div>
              )}
            </div>
          )}
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
