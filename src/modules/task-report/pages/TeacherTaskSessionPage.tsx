import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clock, FileText, MapPin, Pencil, Plus, RotateCcw, Trash2, Wallet, X, Image as ImageIcon, ImageOff } from 'lucide-react';
import { Spin, Timeline, message, Image as AntImage } from 'antd';
import dayjs from 'dayjs';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { DatePicker } from 'antd';
import type { Dayjs } from 'dayjs';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Dialog } from '@/shared/components/ui/dialog';
import HoverSearch from '@/shared/components/ui/search';
import { getExpenseStatusInfo, EXPENSE_STATUS } from '@/constants/status';
import { useTeacherTaskSession } from '../hooks/useTeacherTaskSession';


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

// Helper function to check if report has any approved or rejected expenses
function hasProcessedExpenses(expenses?: Array<{ status?: number | null }> | null) {
  if (!expenses || expenses.length === 0) return false;
  return expenses.some(exp => 
    exp.status === EXPENSE_STATUS.APPROVED || 
    exp.status === EXPENSE_STATUS.REJECTED
  );
}

export default function TeacherTaskSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const parsedSessionId = Number(sessionId ?? 0);

  const {
    session,
    request,
    requestReports,
    sessionReports,
    sessionLoading,
    requestReportsLoading,
    sessionReportsLoading,
    expandedExpensesReportId,
    setExpandedExpensesReportId,
    searchTitle,
    setSearchTitle,
    openModal,
    editingId,
    isCreatingForRequest,
    formState,
    setFormState,
    saving,
    hasExpense,
    createExpenses,
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
    setCreateExpenses,
    editExpenseOpen,
    editingExpense,
    setEditingExpense,
    savingExpense,
    closeEditExpense,
    handleSaveExpense,
    editingReportExpenses,
    saveExpenseDirect,
    handleAddExpenseToReport,
    handleDeleteExpense,
  } = useTeacherTaskSession(parsedSessionId);

  const [expandedExpenseId, setExpandedExpenseId] = useState<number | null>(null);
  const [inlineExpenseForm, setInlineExpenseForm] = useState<{ amount: string; description: string; file: File | null; preview: string; existingImgUrl: string | null }>({ amount: '', description: '', file: null, preview: '', existingImgUrl: null });
  const [isAddingNewExpense, setIsAddingNewExpense] = useState(false);
  const [newExpenseForm, setNewExpenseForm] = useState<{ amount: string; description: string; file: File | null; preview: string }>({ amount: '', description: '', file: null, preview: '' });
  const [deleteExpenseDialog, setDeleteExpenseDialog] = useState<{ open: boolean; expenseId: number | null; taskReportId: number | null }>({ open: false, expenseId: null, taskReportId: null });
  const [deleteReportDialog, setDeleteReportDialog] = useState<{ open: boolean; reportId: number | null }>({ open: false, reportId: null });
  const [selectedExpenseDetail, setSelectedExpenseDetail] = useState<import('../taskReport').TaskReportExpense | null>(null);
  const { requestReports: sortedRequestReports, sessionReports: sortedSessionReports } = useMemo(() => {
    const filterByTitle = (reports: typeof requestReports) => {
      if (!searchTitle.trim()) return reports;
      return reports.filter(r => 
        r.title?.toLowerCase().includes(searchTitle.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchTitle.toLowerCase())
      );
    };

    return {
      requestReports: filterByTitle(requestReports).sort((a, b) => {
        const t1 = a.startAt ? new Date(a.startAt).getTime() : 0;
        const t2 = b.startAt ? new Date(b.startAt).getTime() : 0;
        return t1 - t2;
      }),
      sessionReports: filterByTitle(sessionReports).sort((a, b) => {
        const t1 = a.startAt ? new Date(a.startAt).getTime() : 0;
        const t2 = b.startAt ? new Date(b.startAt).getTime() : 0;
        return t1 - t2;
      })
    };
  }, [requestReports, sessionReports, searchTitle]);

  const sessionTitle = session
    ? (session.SubjectSession?.Title ?? session.EventSession?.Title ?? session.Notes ?? `Buổi ${session.SessionNo}`)
    : '—';

  // Check if session ended more than 48 hours ago - REMOVED RESTRICTION
  const isExpired = useMemo(() => {
    return false; // Always allow creating reports
  }, []);

  const expiredTooltip = 'Tính năng tạo báo cáo luôn khả dụng';

  const resetFilters = () => {
    setSearchTitle('');
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
          onClick={() => navigate('/teacher/teaching-history')}
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
        <div className="flex items-center gap-2">
          <div className="relative group">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0 gap-1.5 text-xs border-[#2197C0] text-[#2197C0] hover:bg-[#2197C0]/10 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={openAddModalForRequest}
              disabled={isExpired}
              title={isExpired ? expiredTooltip : undefined}
            >
              <Plus className="h-3.5 w-3.5" />
              Báo cáo cho yêu cầu
            </Button>
            {isExpired && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                <div className="relative bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                  {expiredTooltip}
                  <div className="absolute top-full left-1/2 -translate-x-1/2">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-amber-200"></div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-amber-50"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="relative group">
            <Button
              type="button"
              size="sm"
              className="shrink-0 gap-1.5 bg-[#2197C0] hover:bg-[#208AAE] text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#2197C0]"
              onClick={openAddModal}
              disabled={isExpired}
              title={isExpired ? expiredTooltip : undefined}
            >
              <Plus className="h-3.5 w-3.5" />
              Báo cáo cho buổi
            </Button>
            {isExpired && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                <div className="relative bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                  {expiredTooltip}
                  <div className="absolute top-full left-1/2 -translate-x-1/2">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-amber-200"></div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-amber-50"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="shrink-0 flex items-center justify-end gap-3">
        <HoverSearch 
          placeholder="Tìm theo tiêu đề, mô tả..." 
          value={searchTitle} 
          onChange={(v) => setSearchTitle(v)} 
        />
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
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        {/* Reports list */}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
          {requestReportsLoading || sessionReportsLoading ? (
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
                      const canEdit = !hasProcessedExpenses(r.expenses);
                      return {
                        icon: <div className="h-2.5 w-2.5 rounded-full bg-[#1a7a99] border-2 border-white shadow-sm" />,
                        content: (
                          <div className="pb-2">
                            <div className="border-l-4 border-l-[#1a7a99] bg-white px-4 py-3 shadow-sm">
                              <div className="text-xs font-medium text-[#1a7a99]">
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
                                      className="inline-flex items-center gap-1 rounded-full border border-[#1a7a99]/30 bg-[#1a7a99]/10 px-2.5 py-0.5 text-xs font-medium text-slate-900 hover:bg-sky-100 transition shadow-sm"
                                    >
                                      <Wallet className="h-3 w-3" />
                                      Chi phí ({r.expenses!.length})
                                    </button>
                                  ) : (
                                    <span className="text-xs text-slate-400">Không có chi phí</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-slate-500 hover:text-[#2197C0] disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => {
                                      if (!canEdit) {
                                        message.warning('Chỉ được sửa khi chưa có khoản chi nào được duyệt hoặc từ chối');
                                        return;
                                      }
                                      startEdit(r);
                                    }}
                                    disabled={!canEdit}
                                    title={!canEdit ? 'Không thể sửa khi có khoản chi đã được duyệt/từ chối' : 'Sửa báo cáo'}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => {
                                      if (!canEdit) {
                                        message.warning('Chỉ được xóa khi chưa có khoản chi nào được duyệt hoặc từ chối');
                                        return;
                                      }
                                      setDeleteReportDialog({ open: true, reportId: r.taskReportId });
                                    }}
                                    disabled={!canEdit}
                                    title={!canEdit ? 'Không thể xóa khi có khoản chi đã được duyệt/từ chối' : 'Xóa báo cáo'}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
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
                                        onClick={() => setSelectedExpenseDetail(exp)}
                                        className="w-full bg-white border-t border-slate-200 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer text-left"
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
                    <p className="mt-1 text-xs text-slate-400">
                      Nhấn <strong className="text-[#1a7a99]">Báo cáo cho yêu cầu</strong> để tạo
                    </p>
                  </div>
                )}
              </div>

              {/* Common Tasks from Request */}
              {request?.Tasks && request.Tasks.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-5 py-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#1a7a99]" />
                    Báo cáo công việc chung cho yêu cầu
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
                      const canEdit = !hasProcessedExpenses(r.expenses);
                      return {
                        icon: <div className="h-2.5 w-2.5 rounded-full bg-[#1a7a99] border-2 border-white shadow-sm" />,
                        content: (
                          <div className="pb-2">
                            <div className="border-l-4 border-l-[#1a7a99] bg-white px-4 py-3 shadow-sm">
                              <div className="text-xs font-medium text-[#1a7a99]">
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
                                      className="inline-flex items-center gap-1 rounded-full border border-[#1a7a99]/30 bg-[#1a7a99]/10 px-2.5 py-0.5 text-xs font-medium text-slate-900 hover:bg-sky-100 transition shadow-sm"
                                    >
                                      <Wallet className="h-3 w-3" />
                                      Chi phí ({r.expenses!.length})
                                    </button>
                                  ) : (
                                    <span className="text-xs text-slate-400">Không có chi phí</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-slate-500 hover:text-[#2197C0] disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => {
                                      if (!canEdit) {
                                        message.warning('Chỉ được sửa khi chưa có khoản chi nào được duyệt hoặc từ chối');
                                        return;
                                      }
                                      startEdit(r);
                                    }}
                                    disabled={!canEdit}
                                    title={!canEdit ? 'Không thể sửa khi có khoản chi đã được duyệt/từ chối' : 'Sửa báo cáo'}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => {
                                      if (!canEdit) {
                                        message.warning('Chỉ được xóa khi chưa có khoản chi nào được duyệt hoặc từ chối');
                                        return;
                                      }
                                      setDeleteReportDialog({ open: true, reportId: r.taskReportId });
                                    }}
                                    disabled={!canEdit}
                                    title={!canEdit ? 'Không thể xóa khi có khoản chi đã được duyệt/từ chối' : 'Xóa báo cáo'}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
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
                                        onClick={() => setSelectedExpenseDetail(exp)}
                                        className="w-full bg-white border-t border-slate-200 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer text-left"
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
                    <p className="mt-1 text-xs text-slate-400">
                      Nhấn <strong className="text-[#1a7a99]">Báo cáo cho buổi</strong> để tạo
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Create/Edit modal */}
      <Dialog
        open={openModal}
        onClose={closeModal}
        title={
          editingId != null 
            ? 'Sửa báo cáo' 
            : isCreatingForRequest 
              ? 'Tạo báo cáo chung cho yêu cầu'
              : 'Tạo báo cáo cho buổi'
        }
        description="Điền thông tin báo cáo công việc."
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

          {/* Expense section */}
          {editingId != null ? (
            editingReportExpenses.length > 0 || isAddingNewExpense ? (
              <div className="border-t border-b border-gray-200 bg-white">
                <div className="px-5 py-3 border-b border-gray-100 bg-sky-50/30 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-[#2197C0]" />
                  <h3 className="text-sm font-semibold text-[#2197C0]">Khoản chi phí ({editingReportExpenses.length})</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {editingReportExpenses.map((exp, idx) => {
                    const info = getExpenseStatusInfo(exp.status);
                    const isPending = info.code === EXPENSE_STATUS.PENDING;
                    const isExpanded = expandedExpenseId === exp.expenseId;
                    return (
                      <div key={exp.expenseId ?? idx}>
                        <div
                          className={`px-5 py-3 flex items-center justify-between gap-3 ${isPending ? 'cursor-pointer hover:bg-[#fafafa] transition-colors' : ''}`}
                          onClick={() => {
                            if (!isPending) return;
                            if (isExpanded) {
                              setExpandedExpenseId(null);
                            } else {
                              setExpandedExpenseId(exp.expenseId);
                              setInlineExpenseForm({
                                amount: exp.amount != null ? String(exp.amount) : '',
                                description: exp.description ?? '',
                                file: null,
                                preview: '',
                                existingImgUrl: exp.paymentImg ?? null,
                              });
                            }
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-900">{exp.description || `Khoản chi ${idx + 1}`}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge className={`text-[10px] px-2 py-0.5 ${info.className}`}>{info.label}</Badge>
                              <span className="text-xs text-slate-500 tabular-nums">
                                {exp.amount != null ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(exp.amount) : '—'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {isPending && <Pencil className="h-3.5 w-3.5 text-[#2197C0] shrink-0" />}
                            {isPending && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteExpenseDialog({ open: true, expenseId: exp.expenseId, taskReportId: editingId });
                                }}
                                className="text-red-500 hover:text-red-700 transition-colors p-1"
                                title="Xóa khoản chi"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {isPending && isExpanded && (
                          <div className="border-t border-gray-100 bg-[#fafafa] px-5 py-4 space-y-3">
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">Số tiền (VNĐ)</label>
                              <input
                                className="w-full border-b border-gray-300 bg-transparent px-0 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2197C0]"
                                placeholder="Nhập số tiền..."
                                value={inlineExpenseForm.amount}
                                onChange={(e) => setInlineExpenseForm((p) => ({ ...p, amount: e.target.value.replace(/\D/g, '') }))}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">Mô tả</label>
                              <input
                                className="w-full border-b border-gray-300 bg-transparent px-0 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2197C0]"
                                placeholder="Mô tả khoản chi..."
                                value={inlineExpenseForm.description}
                                onChange={(e) => setInlineExpenseForm((p) => ({ ...p, description: e.target.value }))}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-sm font-medium text-gray-700">Ảnh minh chứng</label>
                              <div className="flex items-center gap-3">
                                {(inlineExpenseForm.preview || inlineExpenseForm.existingImgUrl) && (
                                  <AntImage
                                    src={inlineExpenseForm.preview || inlineExpenseForm.existingImgUrl!}
                                    alt="Ảnh minh chứng"
                                    width={64}
                                    height={64}
                                    className="rounded-md object-cover border border-slate-200"
                                    style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }}
                                  />
                                )}
                                <label className="inline-flex cursor-pointer items-center gap-1.5 border border-dashed border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-500 hover:border-[#2197C0] hover:text-[#2197C0] transition-colors rounded-md">
                                  <ImageIcon className="h-3.5 w-3.5" />
                                  {inlineExpenseForm.preview || inlineExpenseForm.existingImgUrl ? 'Chọn ảnh khác' : 'Chọn ảnh'}
                                  <input type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={(e) => {
                                    const file = e.target.files?.[0] ?? null;
                                    if (!file) return;
                                    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) { message.warning('Vui lòng chọn ảnh PNG hoặc JPG.'); return; }
                                    if (file.size > 10 * 1024 * 1024) { message.warning('Ảnh tối đa 10MB.'); return; }
                                    const reader = new FileReader();
                                    reader.onload = () => { if (typeof reader.result === 'string') setInlineExpenseForm((p) => ({ ...p, file, preview: reader.result as string, existingImgUrl: null })); };
                                    reader.readAsDataURL(file);
                                  }} />
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Add new expense form */}
                  {isAddingNewExpense && (
                    <div className="px-5 py-4 bg-sky-50/20 space-y-3 border-t-2 border-[#2197C0]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wide text-[#2197C0]">Khoản chi mới</span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNewExpense(false);
                            setNewExpenseForm({ amount: '', description: '', file: null, preview: '' });
                          }}
                          className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Số tiền (VNĐ) *</label>
                        <input
                          className="w-full border-b border-gray-300 bg-transparent px-0 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2197C0]"
                          placeholder="Nhập số tiền..."
                          value={newExpenseForm.amount}
                          onChange={(e) => setNewExpenseForm((p) => ({ ...p, amount: e.target.value.replace(/\D/g, '') }))}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Mô tả *</label>
                        <input
                          className="w-full border-b border-gray-300 bg-transparent px-0 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2197C0]"
                          placeholder="Mô tả khoản chi..."
                          value={newExpenseForm.description}
                          onChange={(e) => setNewExpenseForm((p) => ({ ...p, description: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Ảnh minh chứng *</label>
                        <div className="flex items-center gap-3">
                          {newExpenseForm.preview && (
                            <AntImage
                              src={newExpenseForm.preview}
                              alt="preview"
                              width={64}
                              height={64}
                              style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }}
                              className="border border-slate-200"
                            />
                          )}
                          <label className="inline-flex cursor-pointer items-center gap-1.5 border border-dashed border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-500 hover:border-[#2197C0] hover:text-[#2197C0] transition-colors rounded-md">
                            <ImageIcon className="h-3.5 w-3.5" />
                            {newExpenseForm.preview ? 'Chọn ảnh khác' : 'Chọn ảnh'}
                            <input type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={(e) => {
                              const file = e.target.files?.[0] ?? null;
                              if (!file) return;
                              if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) { message.warning('Vui lòng chọn ảnh PNG hoặc JPG.'); return; }
                              if (file.size > 10 * 1024 * 1024) { message.warning('Ảnh tối đa 10MB.'); return; }
                              const reader = new FileReader();
                              reader.onload = () => { if (typeof reader.result === 'string') setNewExpenseForm((p) => ({ ...p, file, preview: reader.result as string })); };
                              reader.readAsDataURL(file);
                            }} />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Add expense button */}
                {!isAddingNewExpense && (
                  <div className="px-5 py-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setIsAddingNewExpense(true)}
                      className="flex items-center gap-1.5 text-xs font-medium text-[#2197C0] hover:text-[#208AAE] transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Thêm khoản chi phí
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 px-1">
                Báo cáo này không có khoản chi phí.{' '}
                <button
                  type="button"
                  onClick={() => setIsAddingNewExpense(true)}
                  className="text-[#2197C0] hover:underline font-medium"
                >
                  Thêm khoản chi phí
                </button>
              </p>
            )
          ) : (
            // Create mode
            <div className="border-t border-b border-gray-200 bg-white">
              <div className="px-5 py-3 border-b border-gray-100 bg-sky-50/30">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasExpense}
                    onChange={(e) => handleHasExpenseToggle(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#2197C0] focus:ring-[#2197C0]"
                  />
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-[#2197C0]">
                    <Wallet className="h-4 w-4" />
                    Chi phí phát sinh
                  </span>
                </label>
              </div>

              {hasExpense && (
                <div className="divide-y divide-gray-100">
                  {createExpenses.map((exp, idx) => (
                    <div key={exp.key} className="px-5 py-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-700">Khoản chi #{idx + 1}</span>
                        {createExpenses.length > 1 && (
                          <button type="button" onClick={() => setCreateExpenses((prev) => prev.filter((e) => e.key !== exp.key))} className="text-rose-400 hover:text-rose-600 transition-colors">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-slate-700 font-medium mb-1">Số tiền (VNĐ)</div>
                        <input
                          className="w-full border-b border-gray-300 bg-transparent px-0 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2197C0]"
                          placeholder="Nhập số tiền..."
                          value={exp.amount}
                          onChange={(e) => updateCreateExpense(exp.key, { amount: e.target.value.replace(/\D/g, '') })}
                        />
                      </div>
                      <div>
                        <div className="text-xs text-slate-700 font-medium mb-1">Mô tả</div>
                        <input
                          className="w-full border-b border-gray-300 bg-transparent px-0 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#2197C0]"
                          placeholder="Mô tả khoản chi..."
                          value={exp.description}
                          onChange={(e) => updateCreateExpense(exp.key, { description: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Ảnh minh chứng *</label>
                        <div className="flex items-center gap-3">
                          {exp.preview && (
                            <AntImage
                              src={exp.preview}
                              alt="preview"
                              width={64}
                              height={64}
                              style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }}
                              className="border border-slate-200"
                            />
                          )}
                          <label className="inline-flex cursor-pointer items-center gap-1.5 border border-dashed border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-500 hover:border-[#2197C0] hover:text-[#2197C0] transition-colors rounded-md">
                            <ImageIcon className="h-3.5 w-3.5" />
                            {exp.preview ? 'Chọn ảnh khác' : 'Chọn ảnh'}
                            <input type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={(e) => handleCreateExpenseImgChange(exp.key, e.target.files?.[0] ?? null)} />
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => setCreateExpenses((prev) => [...prev, createEmptyExpense()])}
                      className="flex items-center gap-1.5 text-xs font-medium text-[#2197C0] hover:text-[#208AAE] transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Thêm khoản chi
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={closeModal} disabled={saving}>
              Hủy
            </Button>
            {editingId == null && isCreatingForRequest && (
              <Button
                type="button"
                size="sm"
                className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
                onClick={() => void handleSaveForRequest()}
                disabled={saving}
              >
                {saving ? 'Đang lưu...' : 'Lưu báo cáo chung'}
              </Button>
            )}
            {editingId == null && !isCreatingForRequest && (
              <Button
                type="button"
                size="sm"
                className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {saving ? 'Đang lưu...' : 'Lưu báo cáo buổi'}
              </Button>
            )}
            {editingId != null && (
              <Button
                type="button"
                size="sm"
                className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
                disabled={saving || savingExpense}
                onClick={async () => {
                  // If adding new expense, save it first
                  if (isAddingNewExpense) {
                    const ok = await handleAddExpenseToReport(
                      editingId,
                      newExpenseForm.amount,
                      newExpenseForm.description,
                      newExpenseForm.file,
                    );
                    if (!ok) return;
                    setIsAddingNewExpense(false);
                    setNewExpenseForm({ amount: '', description: '', file: null, preview: '' });
                  }
                  // If an expense is expanded, save it first
                  if (expandedExpenseId != null) {
                    const ok = await saveExpenseDirect(
                      expandedExpenseId,
                      editingReportExpenses.find((e) => e.expenseId === expandedExpenseId)?.taskReportId ?? 0,
                      inlineExpenseForm.amount,
                      inlineExpenseForm.description,
                      inlineExpenseForm.file,
                    );
                    if (!ok) return;
                    setExpandedExpenseId(null);
                  }
                  void handleSave();
                }}
              >
                {saving || savingExpense ? 'Đang lưu...' : isAddingNewExpense ? 'Thêm khoản chi' : 'Cập nhật'}
              </Button>
            )}
          </div>
        </div>
      </Dialog>

      {/* Edit Expense Modal */}
      <Dialog
        open={editExpenseOpen}
        onClose={closeEditExpense}
        title="Sửa khoản chi"
        description="Chỉnh sửa thông tin khoản chi đang chờ duyệt."
        className="max-w-sm"
      >
        {editingExpense && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Số tiền (VNĐ) *</label>
              <input
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Số tiền"
                value={editingExpense.amount}
                onChange={(e) => setEditingExpense((p) => p ? { ...p, amount: e.target.value.replace(/\D/g, '') } : p)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Mô tả *</label>
              <input
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Mô tả khoản chi"
                value={editingExpense.description}
                onChange={(e) => setEditingExpense((p) => p ? { ...p, description: e.target.value } : p)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Ảnh chứng từ (để trống nếu không đổi)</label>
              {editingExpense.preview ? (
                <div className="relative">
                  <img src={editingExpense.preview} alt="preview" className="h-24 w-full rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => setEditingExpense((p) => p ? { ...p, file: null, preview: '' } : p)}
                    className="absolute top-1 right-1 rounded-full bg-white/80 p-0.5 text-slate-600 hover:text-rose-600 shadow"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-3 py-3 text-xs text-slate-500 hover:border-[#1a7a99] hover:text-[#1a7a99] transition-colors">
                  <ImageIcon className="h-4 w-4" />
                  Chọn ảnh PNG/JPG (tối đa 10MB)
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      if (!file) return;
                      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) { message.warning('Vui lòng chọn ảnh PNG hoặc JPG.'); return; }
                      if (file.size > 10 * 1024 * 1024) { message.warning('Ảnh tối đa 10MB.'); return; }
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string')
                          setEditingExpense((p) => p ? { ...p, file, preview: reader.result as string } : p);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={closeEditExpense} disabled={savingExpense}>
                Hủy
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
                onClick={() => void handleSaveExpense()}
                disabled={savingExpense}
              >
                {savingExpense ? 'Đang lưu...' : 'Cập nhật'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Delete Expense Confirmation Dialog */}
      <Dialog
        open={deleteExpenseDialog.open}
        onClose={() => setDeleteExpenseDialog({ open: false, expenseId: null, taskReportId: null })}
        title="Xác nhận xóa khoản chi"
        description="Bạn có chắc chắn muốn xóa khoản chi này?"
        className="max-w-sm"
      >
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDeleteExpenseDialog({ open: false, expenseId: null, taskReportId: null })}
            disabled={savingExpense}
          >
            Hủy
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-red-500 hover:bg-red-600 text-white"
            disabled={savingExpense}
            onClick={async () => {
              if (deleteExpenseDialog.expenseId && deleteExpenseDialog.taskReportId) {
                const ok = await handleDeleteExpense(deleteExpenseDialog.expenseId, deleteExpenseDialog.taskReportId);
                if (ok) {
                  setDeleteExpenseDialog({ open: false, expenseId: null, taskReportId: null });
                }
              }
            }}
          >
            {savingExpense ? 'Đang xóa...' : 'Xóa'}
          </Button>
        </div>
      </Dialog>

      {/* Delete Report Confirmation Dialog */}
      <Dialog
        open={deleteReportDialog.open}
        onClose={() => setDeleteReportDialog({ open: false, reportId: null })}
        title="Xác nhận xóa báo cáo"
        description="Bạn có chắc chắn muốn xóa báo cáo này? Tất cả chi phí liên quan cũng sẽ bị xóa."
        className="max-w-sm"
      >
        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDeleteReportDialog({ open: false, reportId: null })}
          >
            Hủy
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-red-500 hover:bg-red-600 text-white"
            onClick={async () => {
              if (deleteReportDialog.reportId) {
                await handleDelete(deleteReportDialog.reportId);
                setDeleteReportDialog({ open: false, reportId: null });
              }
            }}
          >
            Xóa báo cáo
          </Button>
        </div>
      </Dialog>

      {/* Expense Detail Dialog */}
      {selectedExpenseDetail && (
        <Dialog
          open={!!selectedExpenseDetail}
          onClose={() => setSelectedExpenseDetail(null)}
          title="Chi tiết khoản chi"
          description="Thông tin chi tiết về khoản chi phí"
          className="max-w-lg"
        >
          <div className="space-y-0 divide-y divide-slate-200">
            <div className="py-4">
              <label className="block text-xs font-semibold text-slate-500 mb-2">Mô tả</label>
              <p className="text-sm text-slate-900">
                {selectedExpenseDetail.description || '—'}
              </p>
            </div>
            <div className="py-4">
              <label className="block text-xs font-semibold text-slate-500 mb-2">Số tiền</label>
              <p className="text-2xl font-bold text-[#1a7a99]">
                {selectedExpenseDetail.amount != null
                  ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedExpenseDetail.amount)
                  : '—'}
              </p>
            </div>
            <div className="py-4">
              <label className="block text-xs font-semibold text-slate-500 mb-2">Trạng thái</label>
              <Badge className={`text-xs px-3 py-1 ${getExpenseStatusInfo(selectedExpenseDetail.status).className}`}>
                {getExpenseStatusInfo(selectedExpenseDetail.status).label}
              </Badge>
            </div>
            {selectedExpenseDetail.status === 3 && selectedExpenseDetail.rejectReason && (
              <div className="py-4">
                <label className="block text-xs font-semibold text-rose-600 mb-2">Lý do từ chối</label>
                <p className="text-sm text-rose-700 bg-rose-50 px-3 py-2">
                  {selectedExpenseDetail.rejectReason}
                </p>
              </div>
            )}
            <div className="py-4">
              <label className="block text-xs font-semibold text-slate-500 mb-3">Ảnh minh chứng</label>
              {selectedExpenseDetail.paymentImg ? (
                <AntImage
                  src={selectedExpenseDetail.paymentImg}
                  alt="Ảnh minh chứng"
                  width={120}
                  height={120}
                  className="border border-slate-200 rounded-lg object-cover cursor-pointer"
                  style={{ width: 120, height: 120, objectFit: 'cover' }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center w-32 h-32 bg-slate-50 border border-slate-200">
                  <ImageOff className="h-8 w-8 text-slate-300 mb-1" />
                  <p className="text-xs text-slate-400">Không có ảnh</p>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedExpenseDetail(null)}>
                Đóng
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
