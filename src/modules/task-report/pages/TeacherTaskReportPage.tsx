import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { taskReportApi, type TaskReport } from '../api/taskReportApi';
import teachingHistoryApi, { type TeachingHistoryItem } from '@/modules/contract/api/teachingHistoryApi';
import { useRequests } from '@/modules/request/hooks/useRequests';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { DatePicker, message, Spin } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { Dialog } from '@/shared/components/ui/dialog';
import { CalendarClock, CloudUpload, FileText, Plus, Save, Trash2, Wallet, X } from 'lucide-react';

const COMPLETED_STATUSES = ['completed', 'hoàn thành', 'done', 'finished'];

function isSessionCompleted(item: TeachingHistoryItem): boolean {
  const s = (item.status || '').toLowerCase().trim();
  return COMPLETED_STATUSES.some((k) => s.includes(k));
}

type RequestGroup = {
  requestId: number;
  requestName: string;
  requestCode: string;
  sessions: TeachingHistoryItem[];
};

type ReportRow = {
  taskReportId?: number;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  hasExpense: boolean;
  expenseAmount: string;
  expenseNote: string;
};

/** Một dòng chi phí hiển thị khi sửa (BE không hỗ trợ sửa chi phí, chỉ xem). */
type EditingExpenseRow = {
  key: string;
  expenseId?: number;
  amount: string;
  description: string;
};

function formatDateRange(start?: string, end?: string) {
  if (!start || !end) return '—';
  try {
    const s = format(new Date(start), 'HH:mm dd/MM/yyyy', { locale: vi });
    const e = format(new Date(end), 'HH:mm dd/MM/yyyy', { locale: vi });
    return `${s} - ${e}`;
  } catch {
    return `${start} - ${end}`;
  }
}

function formatTimeRangeShort(start?: string | null, end?: string | null) {
  if (!start || !end) return '—';
  try {
    return `${format(new Date(start), 'HH:mm', { locale: vi })} - ${format(new Date(end), 'HH:mm', { locale: vi })}`;
  } catch {
    return '—';
  }
}

function sessionInRange(startAt: string, from: Dayjs | null, to: Dayjs | null): boolean {
  if (!from && !to) return true;
  const t = dayjs(startAt);
  if (from && t.isBefore(from.startOf('day'))) return false;
  if (to && t.isAfter(to.endOf('day'))) return false;
  return true;
}

export default function TeacherTaskReportPage() {
  const [searchParams] = useSearchParams();
  const memberId = Number(JSON.parse(localStorage.getItem('user') || '{}')?.memberId || 0) || 0;

  const [sessions, setSessions] = useState<TeachingHistoryItem[]>([]);
  const [taskReports, setTaskReports] = useState<TaskReport[]>([]);
  const [loading, setLoading] = useState(true);

  const { data: requestList } = useRequests(1, 500, 0);
  const requestMap = useMemo(() => {
    const m = new Map<number, (typeof requestList)[0]>();
    for (const r of requestList) m.set(r.requestId, r);
    return m;
  }, [requestList]);

  const [filterFrom, setFilterFrom] = useState<Dayjs | null>(null);
  const [filterTo, setFilterTo] = useState<Dayjs | null>(null);

  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

  const [formState, setFormState] = useState<ReportRow>({
    title: '',
    description: '',
    startAt: '',
    endAt: '',
    hasExpense: false,
    expenseAmount: '',
    expenseNote: '',
  });
  const [expenseEvidenceFile, setExpenseEvidenceFile] = useState<File | null>(null);
  const [expenseEvidencePreview, setExpenseEvidencePreview] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [openReportModal, setOpenReportModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedExpensesReportId, setExpandedExpensesReportId] = useState<number | null>(null);
  const [editingExpenses, setEditingExpenses] = useState<EditingExpenseRow[]>([]);

  const requestGroupsRaw: RequestGroup[] = useMemo(() => {
    const completed = sessions.filter(isSessionCompleted);
    const byRequest = new Map<number, TeachingHistoryItem[]>();
    for (const s of completed) {
      const rid = s.requestId ?? 0;
      if (!rid) continue;
      if (!byRequest.has(rid)) byRequest.set(rid, []);
      byRequest.get(rid)!.push(s);
    }
    return Array.from(byRequest.entries()).map(([requestId, sess]) => {
      const first = sess[0];
      return {
        requestId,
        requestName: first.requestName || first.requestCode || `Yêu cầu #${requestId}`,
        requestCode: first.requestCode || '',
        sessions: sess.sort(
          (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        ),
      };
    });
  }, [sessions]);

  const requestGroups = useMemo(() => {
    if (!filterFrom && !filterTo) return requestGroupsRaw;
    return requestGroupsRaw
      .map((g) => ({
        ...g,
        sessions: g.sessions.filter((s) => sessionInRange(s.startAt, filterFrom, filterTo)),
      }))
      .filter((g) => g.sessions.length > 0);
  }, [requestGroupsRaw, filterFrom, filterTo]);

  const selectedGroup = useMemo(
    () => requestGroups.find((g) => g.requestId === selectedRequestId) ?? null,
    [requestGroups, selectedRequestId]
  );

  const selectedSession = useMemo(() => {
    if (!selectedSessionId || !selectedGroup) return null;
    return selectedGroup.sessions.find((s) => s.sessionId === selectedSessionId) ?? null;
  }, [selectedGroup, selectedSessionId]);

  const isRequestLevelReport = selectedRequestId != null && selectedSessionId == null;

  const existingReports = useMemo(() => {
    if (!selectedRequestId) return [];
    return taskReports.filter((r) => {
      if (r.requestId !== selectedRequestId) return false;
      if (isRequestLevelReport) return r.sessionId == null || r.sessionId === 0;
      return r.sessionId === selectedSessionId;
    });
  }, [taskReports, selectedRequestId, selectedSessionId, isRequestLevelReport]);

  useEffect(() => {
    const load = async () => {
      if (!memberId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [sessRes, reportRes] = await Promise.all([
          teachingHistoryApi.getSessionsByMember(memberId, { pageNumber: 1, pageSize: 500 }),
          taskReportApi.getTaskReports({ pageNumber: 1, pageSize: 500 }),
        ]);
        setSessions(sessRes.items ?? []);
        setTaskReports(reportRes.items ?? []);
      } catch (err) {
        console.error(err);
        message.error('Không tải được danh sách phiên hoặc báo cáo công việc');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [memberId]);

  const qRequestId = searchParams.get('requestId');
  const qSessionId = searchParams.get('sessionId');
  useEffect(() => {
    const rid = qRequestId ? Number(qRequestId) : null;
    const sid = qSessionId ? Number(qSessionId) : null;
    if (rid && requestGroups.some((g) => g.requestId === rid)) {
      setSelectedRequestId(rid);
      if (sid && requestGroups.find((g) => g.requestId === rid)?.sessions.some((s) => s.sessionId === sid)) {
        setSelectedSessionId(sid);
      } else {
        setSelectedSessionId(null);
      }
    }
  }, [qRequestId, qSessionId, requestGroups]);

  const sortedTimeline = useMemo(
    () =>
      [...existingReports].sort((a, b) => {
        const t1 = a.startAt ? new Date(a.startAt).getTime() : 0;
        const t2 = b.startAt ? new Date(b.startAt).getTime() : 0;
        return t1 - t2;
      }),
    [existingReports]
  );

  useEffect(() => {
    if (!selectedGroup) {
      setFormState({ title: '', description: '', startAt: '', endAt: '', hasExpense: false, expenseAmount: '', expenseNote: '' });
      setExpenseEvidenceFile(null);
      setExpenseEvidencePreview('');
      setEditingId(null);
      return;
    }
    if (editingId == null) {
      setFormState((prev) => ({ ...prev, title: '', description: '', startAt: '', endAt: '', hasExpense: false, expenseAmount: '', expenseNote: '' }));
      setExpenseEvidenceFile(null);
      setExpenseEvidencePreview('');
    }
  }, [selectedGroup?.requestId, selectedSessionId]);

  const setFormField = useCallback((field: keyof ReportRow, value: string | boolean) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleExpenseFileChange = useCallback((file: File | null) => {
    if (!file) {
      setExpenseEvidenceFile(null);
      setExpenseEvidencePreview('');
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
    setExpenseEvidenceFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setExpenseEvidencePreview(reader.result);
    };
    reader.readAsDataURL(file);
  }, []);

  const startEdit = useCallback((r: TaskReport) => {
    setFormState({
      title: r.title || '',
      description: r.description || '',
      startAt: r.startAt || '',
      endAt: r.endAt || '',
      hasExpense: false,
      expenseAmount: '',
      expenseNote: '',
    });
    setExpenseEvidenceFile(null);
    setExpenseEvidencePreview('');
    setEditingId(r.taskReportId);
    setEditingExpenses(
      (r.expenses?.length ? r.expenses : []).map((e, i) => ({
        key: `exp-${e.expenseId ?? i}-${Date.now()}`,
        expenseId: e.expenseId,
        amount: String(e.amount ?? ''),
        description: e.description ?? '',
      }))
    );
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setFormState({ title: '', description: '', startAt: '', endAt: '', hasExpense: false, expenseAmount: '', expenseNote: '' });
    setExpenseEvidenceFile(null);
    setExpenseEvidencePreview('');
    setEditingExpenses([]);
  }, []);

  const closeReportModal = useCallback(() => {
    cancelEdit();
    setOpenReportModal(false);
  }, [cancelEdit]);

  const handleSaveForm = useCallback(async () => {
    if (!selectedRequestId) return;
    if (!formState.title.trim() || !formState.description.trim()) {
      message.warning('Vui lòng nhập tiêu đề và mô tả');
      return;
    }
    if (editingId == null && formState.hasExpense) {
      const amountNum = Number((formState.expenseAmount || '').replace(/\D/g, ''));
      if (!amountNum || Number.isNaN(amountNum) || amountNum <= 0) {
        message.warning('Vui lòng nhập số tiền chi phí hợp lệ.');
        return;
      }
      if (!expenseEvidenceFile) {
        message.warning('Mỗi khoản chi phí bắt buộc có ảnh chứng từ chuyển khoản.');
        return;
      }
    }
    setSaving(true);
    try {
      const startAtVal = formState.startAt ? dayjs(formState.startAt).toISOString() : undefined;
      const endAtVal = formState.endAt ? dayjs(formState.endAt).toISOString() : undefined;

      if (editingId != null) {
        const updated = await taskReportApi.update(editingId, {
          requestId: isRequestLevelReport ? selectedRequestId : undefined,
          sessionId: isRequestLevelReport ? null : selectedSessionId ?? undefined,
          title: formState.title.trim(),
          description: formState.description.trim(),
          startAt: startAtVal ?? null,
          endAt: endAtVal ?? null,
        });
        setTaskReports((prev) =>
          prev.map((r) => (r.taskReportId === editingId ? updated : r))
        );
        message.success('Đã cập nhật báo cáo');
      } else {
        const amountNum =
          formState.hasExpense
            ? Number((formState.expenseAmount || '').replace(/\D/g, '')) || 0
            : 0;
        const created = await taskReportApi.create({
          requestId: isRequestLevelReport ? selectedRequestId : undefined,
          sessionId: isRequestLevelReport ? undefined : selectedSessionId ?? undefined,
          title: formState.title.trim(),
          description: formState.description.trim(),
          startAt: startAtVal,
          endAt: endAtVal,
          ...(formState.hasExpense && amountNum > 0 && expenseEvidenceFile
            ? {
                expenses: [{
                  amount: amountNum,
                  description: formState.expenseNote.trim() || 'Không ghi chú',
                  paymentImgIndex: 0,
                }],
                paymentImages: [expenseEvidenceFile],
              }
            : {}),
        });
        setTaskReports((prev) => [...prev, created]);
        message.success('Đã tạo báo cáo');
      }
      setFormState({ title: '', description: '', startAt: '', endAt: '', hasExpense: false, expenseAmount: '', expenseNote: '' });
      setExpenseEvidenceFile(null);
      setExpenseEvidencePreview('');
      setEditingId(null);
      setOpenReportModal(false);
    } catch (err) {
      console.error(err);
      message.error('Lưu báo cáo thất bại');
    } finally {
      setSaving(false);
    }
  }, [selectedRequestId, selectedSessionId, isRequestLevelReport, formState, editingId, expenseEvidenceFile]);

  const handleDeleteReport = useCallback(async (taskReportId: number) => {
    try {
      await taskReportApi.remove(taskReportId);
      setTaskReports((prev) => prev.filter((r) => r.taskReportId !== taskReportId));
      if (editingId === taskReportId) cancelEdit();
      message.success('Đã xóa báo cáo');
    } catch (err) {
      console.error(err);
      message.error('Xóa báo cáo thất bại');
    }
  }, [editingId, cancelEdit]);

  const hasReportForSession = useCallback(
    (sessionId: number) =>
      taskReports.some(
        (r) => r.requestId === selectedRequestId && r.sessionId === sessionId
      ),
    [taskReports, selectedRequestId]
  );

  const hasReportForRequest = useCallback(
    () =>
      taskReports.some(
        (r) =>
          r.requestId === selectedRequestId && (r.sessionId == null || r.sessionId === 0)
      ),
    [taskReports, selectedRequestId]
  );

  const clearFilter = useCallback(() => {
    setFilterFrom(null);
    setFilterTo(null);
  }, []);

  const openAddReportModal = useCallback(() => {
    cancelEdit();
    setOpenReportModal(true);
  }, [cancelEdit]);

  return (
    <div className="flex flex-col h-screen bg-[#f3f4f6]">
      {/* Bộ lọc thời gian - full width */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <CalendarClock size={18} className="text-sky-600" />
          Lọc theo thời gian phiên
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DatePicker
            format="DD/MM/YYYY"
            placeholder="Từ ngày"
            value={filterFrom}
            onChange={(d) => setFilterFrom(d)}
            className="w-[140px] [&_.ant-picker-input>input]:text-black"
          />
          <span className="text-gray-400">→</span>
          <DatePicker
            format="DD/MM/YYYY"
            placeholder="Đến ngày"
            value={filterTo}
            onChange={(d) => setFilterTo(d)}
            className="w-[140px] [&_.ant-picker-input>input]:text-black"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFilter}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={16} className="mr-1" />
            Xóa lọc
          </Button>
        </div>
        {(filterFrom || filterTo) && (
          <span className="text-xs text-gray-500">
            Chỉ hiển thị yêu cầu/phiên trong khoảng đã chọn
          </span>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        <aside className="w-72 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <FileText size={16} />
              Báo cáo công việc
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Chỉ ghi báo cáo cho phiên đã hoàn thành. Dùng lọc thời gian để thu gọn danh sách.
            </p>
          </div>
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Spin size="small" />
            </div>
          ) : requestGroups.length === 0 ? (
            <div className="flex-1 flex items-center justify-center px-4 text-xs text-gray-500 text-center">
              {filterFrom || filterTo
                ? 'Không có phiên nào trong khoảng thời gian đã chọn.'
                : 'Chưa có phiên nào đã hoàn thành để ghi báo cáo.'}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50">
              {requestGroups.map((g) => {
                const isActive = g.requestId === selectedRequestId;
                const fullRequest = requestMap.get(g.requestId);
                return (
                  <button
                    key={g.requestId}
                    type="button"
                    onClick={() => {
                      setSelectedRequestId(g.requestId);
                      setSelectedSessionId(null);
                    }}
                    className={`w-full text-left rounded-2xl border px-3 py-2.5 transition ${
                      isActive
                        ? 'bg-blue-50/70 border-blue-300 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-slate-900 truncate">
                          {g.requestName || '—'}
                        </div>
                        <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px] text-slate-600">
                          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 font-medium">
                            {g.requestCode}
                          </span>
                          {fullRequest?.startDate && (
                            <span className="text-slate-500">
                              Bắt đầu: {dayjs(fullRequest.startDate).format('DD/MM/YYYY')}
                            </span>
                          )}
                          <span className="text-slate-500">
                            {g.sessions.length} phiên
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section className="w-64 flex-shrink-0 border-r border-gray-200 bg-[#f9fafb] flex flex-col">
          <div className="px-3 py-3 border-b border-gray-200">
            <div className="text-xs font-medium text-gray-800">Phiên / Báo cáo chung</div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Chọn phiên hoặc báo cáo chung theo yêu cầu.
            </p>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-3 space-y-2">
            {selectedGroup && (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedSessionId(null)}
                  className={`w-full text-left rounded-lg px-3 py-2 text-xs border transition-all ${
                    isRequestLevelReport
                      ? 'border-sky-500 bg-white shadow-sm'
                      : 'border-transparent hover:border-gray-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-900">Báo cáo chung</span>
                    <Badge
                      className={
                        hasReportForRequest()
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-gray-100 text-gray-500 border border-gray-200'
                      }
                    >
                      {hasReportForRequest() ? 'Đã ghi' : 'Chưa ghi'}
                    </Badge>
                  </div>
                </button>
                {selectedGroup.sessions.map((s) => {
                  const isActive = s.sessionId === selectedSessionId;
                  const hasReport = hasReportForSession(s.sessionId);
                  return (
                    <button
                      key={s.sessionId}
                      type="button"
                      onClick={() => setSelectedSessionId(s.sessionId)}
                      className={`w-full text-left rounded-lg px-3 py-2 text-xs border transition-all ${
                        isActive
                          ? 'border-sky-500 bg-white shadow-sm'
                          : 'border-transparent hover:border-gray-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-gray-900">
                          Phiên {s.sessionNo ?? s.sessionId}
                        </span>
                        <Badge
                          className={
                            hasReport
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-gray-100 text-gray-500 border border-gray-200'
                          }
                        >
                          {hasReport ? 'Đã ghi' : 'Chưa ghi'}
                        </Badge>
                      </div>
                      <div className="mt-1 text-[11px] text-gray-500">
                        {formatDateRange(s.startAt, s.endAt)}
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </section>

        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {selectedGroup
                  ? isRequestLevelReport
                    ? `Báo cáo chung: ${selectedGroup.requestName}`
                    : selectedSession
                      ? `Phiên ${selectedSession.sessionNo ?? selectedSession.sessionId} · ${selectedGroup.requestName}`
                      : selectedGroup.requestName
                  : 'Chọn yêu cầu bên trái'}
              </div>
              {selectedGroup && (
                <div className="text-xs text-gray-500 mt-0.5">{selectedGroup.requestCode}</div>
              )}
            </div>
            {selectedGroup && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5 bg-[#2197C0] hover:bg-[#208AAE] text-white"
                  onClick={openAddReportModal}
                >
                  <Plus size={14} />
                  Tạo báo cáo
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {!selectedGroup ? (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">
                Chọn yêu cầu ở cột trái, có thể dùng bộ lọc thời gian phía trên để thu gọn danh sách.
              </div>
            ) : (
              <div className="max-w-3xl space-y-6">
                {/* Timeline dọc: từ mấy giờ tới mấy giờ - công việc gì - có chi phí không */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Timeline báo cáo</h3>
                  {sortedTimeline.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4">Chưa có báo cáo nào. Nhấn <strong>Tạo báo cáo</strong> ở góc trên để thêm.</p>
                  ) : (
                    <div className="relative pl-6 border-l-2 border-sky-200 space-y-0">
                      {sortedTimeline.map((r) => {
                        const hasExpenses = (r.expenses?.length ?? 0) > 0;
                        return (
                          <div
                            key={r.taskReportId}
                            className="relative pb-6 last:pb-0"
                          >
                            <div className="absolute -left-[30px] top-[1.375rem] -translate-y-1/2 w-3 h-3 rounded-full bg-sky-500 border-2 border-white shadow-sm" />
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-semibold text-sky-700">
                                    {formatDateRange(r.startAt, r.endAt)}
                                  </div>
                                  <div className="text-sm font-medium text-gray-900 mt-0.5">{r.title || '—'}</div>
                                  <p className="text-xs text-gray-600 mt-1 line-clamp-3">{r.description || '—'}</p>
                                  <div className="mt-2 flex items-center gap-2">
                                    {hasExpenses ? (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedExpensesReportId((prev) =>
                                            prev === r.taskReportId ? null : r.taskReportId
                                          );
                                        }}
                                        className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5 hover:bg-amber-100 transition cursor-pointer"
                                      >
                                        <Wallet size={12} />
                                        Có chi phí ({r.expenses!.length} khoản)
                                      </button>
                                    ) : (
                                      <span className="text-xs text-gray-400">Không có chi phí</span>
                                    )}
                                  </div>
                                  {hasExpenses && expandedExpensesReportId === r.taskReportId && (
                                    <div className="mt-3 pt-3 border-t border-amber-100 space-y-2">
                                      <div className="text-[11px] font-medium text-amber-800 uppercase tracking-wide">
                                        Các khoản chi phí
                                      </div>
                                      <ul className="space-y-1.5">
                                        {r.expenses!.map((exp, idx) => (
                                          <li
                                            key={exp.expenseId ?? idx}
                                            className="flex items-start justify-between gap-2 text-xs bg-amber-50/50 rounded-lg px-3 py-2 border border-amber-100"
                                          >
                                            <span className="text-gray-700">
                                              {exp.description || `Khoản ${idx + 1}`}
                                            </span>
                                            <span className="font-semibold text-amber-800 whitespace-nowrap">
                                              {exp.amount != null
                                                ? new Intl.NumberFormat('vi-VN', {
                                                    style: 'currency',
                                                    currency: 'VND',
                                                  }).format(exp.amount)
                                                : '—'}
                                            </span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="text-gray-600 h-8"
                                    onClick={() => { startEdit(r); setOpenReportModal(true); }}
                                  >
                                    Sửa
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 h-8 hover:bg-red-50"
                                    onClick={() => handleDeleteReport(r.taskReportId)}
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal thêm / chỉnh sửa báo cáo */}
          {selectedGroup && (
            <Dialog
              open={openReportModal}
              onClose={closeReportModal}
              title={editingId != null ? 'Chỉnh sửa báo cáo' : 'Thêm báo cáo'}
              description={editingId != null ? 'Cập nhật nội dung báo cáo.' : 'Điền thông tin báo cáo công việc cho phiên đã chọn.'}
              className="max-w-xl"
            >
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian bắt đầu</label>
                      <DatePicker
                        showTime
                        format="DD/MM/YYYY HH:mm"
                        className="w-full [&_.ant-picker-input>input]:text-black"
                        value={formState.startAt ? dayjs(formState.startAt) : null}
                        onChange={(d) => setFormField('startAt', d ? d.toISOString() : '')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian kết thúc</label>
                      <DatePicker
                        showTime
                        format="DD/MM/YYYY HH:mm"
                        className="w-full [&_.ant-picker-input>input]:text-black"
                        value={formState.endAt ? dayjs(formState.endAt) : null}
                        onChange={(d) => setFormField('endAt', d ? d.toISOString() : '')}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề *</label>
                    <input
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                      placeholder="Ví dụ: Chuẩn bị bài, Giảng phần 1"
                      value={formState.title}
                      onChange={(e) => setFormField('title', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả *</label>
                    <textarea
                      className="w-full min-h-[80px] rounded-lg border border-gray-300 px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y bg-white"
                      placeholder="Nội dung công việc đã làm..."
                      value={formState.description}
                      onChange={(e) => setFormField('description', e.target.value)}
                    />
                  </div>

                  {editingId != null && editingExpenses.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                      <p className="text-xs text-slate-600 mb-2">
                        Backend hiện chỉ hỗ trợ sửa tiêu đề, mô tả và thời gian. Các khoản chi phí dưới đây chỉ xem, không chỉnh sửa được.
                      </p>
                      <div className="text-[11px] font-medium text-slate-500 mb-1">Các khoản chi phí hiện có</div>
                      <ul className="space-y-1.5">
                        {editingExpenses.map((row, idx) => (
                          <li
                            key={row.key}
                            className="flex justify-between gap-2 text-xs bg-white rounded border border-slate-100 px-2 py-1.5"
                          >
                            <span className="text-gray-700">{row.description || `Khoản ${idx + 1}`}</span>
                            <span className="font-medium text-slate-700 whitespace-nowrap">
                              {row.amount && !Number.isNaN(Number(row.amount.replace(/\D/g, '')))
                                ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(row.amount.replace(/\D/g, '')))
                                : '—'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {editingId == null && (
                    <>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formState.hasExpense}
                          onChange={(e) => setFormField('hasExpense', e.target.checked)}
                          className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                        />
                        <span className="text-sm font-medium text-gray-800">Có chi phí phát sinh</span>
                      </label>

                      {formState.hasExpense && (
                        <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Nhập số tiền chi phí <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center rounded-lg border border-gray-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-sky-500">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formState.expenseAmount}
                                onChange={(e) => setFormField('expenseAmount', e.target.value)}
                                placeholder="0"
                                className="flex-1 min-w-0 px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none"
                              />
                              <span className="px-3 py-2 text-sm text-gray-500 border-l border-gray-200">₫</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Nhập số tiền bạn muốn đóng góp vào quỹ</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Ảnh chuyển khoản <span className="text-red-500">*</span>
                            </label>
                            <label className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-xl py-6 px-4 cursor-pointer bg-white hover:bg-slate-50 transition">
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/jpg"
                                className="hidden"
                                onChange={(e) => handleExpenseFileChange(e.target.files?.[0] ?? null)}
                                disabled={saving}
                              />
                              {expenseEvidencePreview ? (
                                <img src={expenseEvidencePreview} alt="Chứng từ" className="max-h-36 rounded-md object-contain" />
                              ) : (
                                <div className="text-center space-y-1">
                                  <CloudUpload className="mx-auto h-8 w-8 text-slate-400" />
                                  <div className="text-sm font-medium text-slate-700">Nhấn để tải lên ảnh chứng từ</div>
                                  <div className="text-xs text-slate-500">PNG, JPG (tối đa 5MB)</div>
                                </div>
                              )}
                            </label>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú (Tùy chọn)</label>
                            <textarea
                              className="w-full min-h-[60px] rounded-lg border border-gray-300 px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y bg-white"
                              placeholder="Thêm ghi chú về khoản đóng góp của bạn..."
                              value={formState.expenseNote}
                              onChange={(e) => setFormField('expenseNote', e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={closeReportModal}
                    disabled={saving}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={saving}
                    className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white"
                    onClick={handleSaveForm}
                  >
                    <Save size={14} />
                    {saving ? 'Đang lưu...' : editingId != null ? 'Cập nhật' : 'Thêm báo cáo'}
                  </Button>
                </div>
              </div>
            </Dialog>
          )}
        </main>
      </div>
    </div>
  );
}
