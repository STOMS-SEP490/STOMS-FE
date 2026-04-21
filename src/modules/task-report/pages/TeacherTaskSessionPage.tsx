import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clock, FileText, MapPin, Plus, RotateCcw, Trash2, Wallet, X, Image as ImageIcon } from 'lucide-react';
import { Spin, Timeline } from 'antd';
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
  } = useTeacherTaskSession(parsedSessionId);

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
                      return {
                        dot: <div className="h-2.5 w-2.5 rounded-full bg-[#1a7a99] border-2 border-white shadow-sm" />,
                        children: (
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
                                      <div
                                        key={exp.expenseId ?? idx}
                                        className="w-full bg-white border-t border-slate-200 px-4 py-3"
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
                                      </div>
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
                      return {
                        dot: <div className="h-2.5 w-2.5 rounded-full bg-[#1a7a99] border-2 border-white shadow-sm" />,
                        children: (
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
                                      <div
                                        key={exp.expenseId ?? idx}
                                        className="w-full bg-white border-t border-slate-200 px-4 py-3"
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
                                      </div>
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
          <div className="rounded-xl bg-slate-50 px-4 py-3 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={hasExpense}
                onChange={(e) => handleHasExpenseToggle(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#1a7a99] focus:ring-[#1a7a99]"
              />
              <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-[#1a7a99]" />
                Chi phí phát sinh
              </span>
            </label>

            {hasExpense && (
              <div className="space-y-3">
                {createExpenses.map((exp, idx) => (
                  <div key={exp.key} className="rounded-lg bg-white p-3 space-y-2">
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
                          <img src={exp.preview} alt="preview" className="h-24 w-full rounded-lg object-cover" />
                          <button
                            type="button"
                            onClick={() => updateCreateExpense(exp.key, { file: null, preview: '' })}
                            className="absolute top-1 right-1 rounded-full bg-white/80 p-0.5 text-slate-600 hover:text-rose-600 shadow"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-3 py-3 text-xs text-slate-500 hover:border-[#1a7a99] hover:text-[#1a7a99] transition-colors">
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
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#1a7a99]/50 py-2 text-xs font-medium text-[#1a7a99] hover:bg-[#1a7a99]/5 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Thêm khoản chi
                </button>
              </div>
            )}
          </div>

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
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {saving ? 'Đang lưu...' : 'Cập nhật'}
              </Button>
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
