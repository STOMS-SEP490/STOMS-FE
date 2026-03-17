import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { taskReportApi } from '../api/taskReportApi';
import type { TaskReport } from '../taskReport';
import teachingHistoryApi from '@/modules/contract/api/teachingHistoryApi';
import type { TeachingHistoryItem } from '@/modules/contract/teachingHistory';
import { useRequests } from '@/modules/request/hooks/useRequests';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { DatePicker, message, Spin } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { Dialog } from '@/shared/components/ui/dialog';
import {
  CalendarDays,
  Clock,
  CloudUpload,
  FileText,
  MapPin,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import HoverSearch from '@/shared/components/ui/search';
import RequestCard from '@/shared/components/request/RequestCard';

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

type EditingExpenseRow = {
  key: string;
  expenseId?: number;
  amount: string;
  description: string;
};

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
  const [search, setSearch] = useState('');

  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  // 'request' = báo cáo chung, number = sessionId, null = chưa chọn gì trong content
  const [activeTarget, setActiveTarget] = useState<'request' | number | null>(null);

  const selectedSessionId = typeof activeTarget === 'number' ? activeTarget : null;
  const isRequestLevelReport = activeTarget === 'request';
  const showRightPanel = activeTarget !== null;

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

  const [showNewExpenseForm, setShowNewExpenseForm] = useState(false);
  const [newExpense, setNewExpense] = useState({ amount: '', description: '' });
  const [newExpenseFile, setNewExpenseFile] = useState<File | null>(null);
  const [newExpensePreview, setNewExpensePreview] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);

  // ─── Derived data ───

  const requestGroupsRaw: RequestGroup[] = useMemo(() => {
    const completed = sessions.filter(isSessionCompleted);
    const byRequest = new Map<number, TeachingHistoryItem[]>();
    for (const s of completed) {
      const rid = s.request?.requestId ?? 0;
      if (!rid) continue;
      if (!byRequest.has(rid)) byRequest.set(rid, []);
      byRequest.get(rid)!.push(s);
    }
    return Array.from(byRequest.entries()).map(([requestId, sess]) => {
      const first = sess[0];
      return {
        requestId,
        requestName: first.request?.requestName || first.request?.requestCode || `Yêu cầu #${requestId}`,
        requestCode: first.request?.requestCode || '',
        sessions: sess.sort(
          (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
        ),
      };
    });
  }, [sessions]);

  const requestGroups = useMemo(() => {
    let list = requestGroupsRaw;
    if (filterFrom || filterTo) {
      list = list
        .map((g) => ({
          ...g,
          sessions: g.sessions.filter((s) => sessionInRange(s.startAt, filterFrom, filterTo)),
        }))
        .filter((g) => g.sessions.length > 0);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (g) =>
          g.requestName.toLowerCase().includes(q) ||
          g.requestCode.toLowerCase().includes(q),
      );
    }
    return list;
  }, [requestGroupsRaw, filterFrom, filterTo, search]);

  const selectedGroup = useMemo(
    () => requestGroups.find((g) => g.requestId === selectedRequestId) ?? null,
    [requestGroups, selectedRequestId],
  );

  const selectedSession = useMemo(() => {
    if (!selectedSessionId || !selectedGroup) return null;
    return selectedGroup.sessions.find((s) => s.sessionId === selectedSessionId) ?? null;
  }, [selectedGroup, selectedSessionId]);

  const existingReports = useMemo(() => {
    if (!selectedRequestId || activeTarget === null) return [];
    return taskReports.filter((r) => {
      if (r.requestId !== selectedRequestId) return false;
      if (isRequestLevelReport) return r.sessionId == null || r.sessionId === 0;
      return r.sessionId === selectedSessionId;
    });
  }, [taskReports, selectedRequestId, activeTarget, isRequestLevelReport, selectedSessionId]);

  const sortedTimeline = useMemo(
    () =>
      [...existingReports].sort((a, b) => {
        const t1 = a.startAt ? new Date(a.startAt).getTime() : 0;
        const t2 = b.startAt ? new Date(b.startAt).getTime() : 0;
        return t1 - t2;
      }),
    [existingReports],
  );

  // ─── Data fetching ───

  useEffect(() => {
    const load = async () => {
      if (!memberId) { setLoading(false); return; }
      setLoading(true);
      try {
        const [sessRes, reportRes] = await Promise.all([
          teachingHistoryApi.getSessionsByMember(memberId, { pageNumber: 1, pageSize: 500 }),
          taskReportApi.getAll({ pageNumber: 1, pageSize: 500 }),
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
        setActiveTarget(sid);
      }
    }
  }, [qRequestId, qSessionId, requestGroups]);

  // ─── Form callbacks ───

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
  }, [selectedGroup?.requestId, activeTarget]);

  const setFormField = useCallback((field: keyof ReportRow, value: string | boolean) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleExpenseFileChange = useCallback((file: File | null) => {
    if (!file) { setExpenseEvidenceFile(null); setExpenseEvidencePreview(''); return; }
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) { message.warning('Vui lòng chọn ảnh PNG hoặc JPG.'); return; }
    if (file.size > 5 * 1024 * 1024) { message.warning('Ảnh tối đa 5MB.'); return; }
    setExpenseEvidenceFile(file);
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') setExpenseEvidencePreview(reader.result); };
    reader.readAsDataURL(file);
  }, []);

  const resetNewExpenseForm = useCallback(() => {
    setShowNewExpenseForm(false);
    setNewExpense({ amount: '', description: '' });
    setNewExpenseFile(null);
    setNewExpensePreview('');
  }, []);

  const startEdit = useCallback((r: TaskReport) => {
    setFormState({
      title: r.title || '', description: r.description || '',
      startAt: r.startAt || '', endAt: r.endAt || '',
      hasExpense: false, expenseAmount: '', expenseNote: '',
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
      })),
    );
    resetNewExpenseForm();
  }, [resetNewExpenseForm]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setFormState({ title: '', description: '', startAt: '', endAt: '', hasExpense: false, expenseAmount: '', expenseNote: '' });
    setExpenseEvidenceFile(null);
    setExpenseEvidencePreview('');
    setEditingExpenses([]);
    resetNewExpenseForm();
  }, [resetNewExpenseForm]);

  const closeReportModal = useCallback(() => { cancelEdit(); setOpenReportModal(false); }, [cancelEdit]);

  const handleSaveForm = useCallback(async () => {
    if (!selectedRequestId) return;
    if (!formState.title.trim() || !formState.description.trim()) { message.warning('Vui lòng nhập tiêu đề và mô tả'); return; }
    if (editingId == null && formState.hasExpense) {
      const amountNum = Number((formState.expenseAmount || '').replace(/\D/g, ''));
      if (!amountNum || Number.isNaN(amountNum) || amountNum <= 0) { message.warning('Vui lòng nhập số tiền chi phí hợp lệ.'); return; }
      if (!expenseEvidenceFile) { message.warning('Mỗi khoản chi phí bắt buộc có ảnh chứng từ chuyển khoản.'); return; }
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
        setTaskReports((prev) => prev.map((r) => (r.taskReportId === editingId ? updated : r)));
        message.success('Đã cập nhật báo cáo');
      } else {
        const amountNum = formState.hasExpense ? Number((formState.expenseAmount || '').replace(/\D/g, '')) || 0 : 0;
        const created = await taskReportApi.create({
          requestId: isRequestLevelReport ? selectedRequestId : undefined,
          sessionId: isRequestLevelReport ? undefined : selectedSessionId ?? undefined,
          title: formState.title.trim(),
          description: formState.description.trim(),
          startAt: startAtVal,
          endAt: endAtVal,
          ...(formState.hasExpense && amountNum > 0 && expenseEvidenceFile
            ? { expenses: [{ amount: amountNum, description: formState.expenseNote.trim() || 'Không ghi chú', paymentImgIndex: 0 }], paymentImages: [expenseEvidenceFile] }
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
    (sessionId: number) => taskReports.some((r) => r.requestId === selectedRequestId && r.sessionId === sessionId),
    [taskReports, selectedRequestId],
  );
  const hasReportForRequest = useCallback(
    () => taskReports.some((r) => r.requestId === selectedRequestId && (r.sessionId == null || r.sessionId === 0)),
    [taskReports, selectedRequestId],
  );

  const clearFilter = useCallback(() => { setFilterFrom(null); setFilterTo(null); setSearch(''); }, []);
  const openAddReportModal = useCallback(() => { cancelEdit(); setOpenReportModal(true); }, [cancelEdit]);

  const handleNewExpenseImgChange = useCallback((file: File | null) => {
    if (!file) { setNewExpenseFile(null); setNewExpensePreview(''); return; }
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) { message.warning('Vui lòng chọn ảnh PNG hoặc JPG.'); return; }
    if (file.size > 5 * 1024 * 1024) { message.warning('Ảnh tối đa 5MB.'); return; }
    setNewExpenseFile(file);
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') setNewExpensePreview(reader.result); };
    reader.readAsDataURL(file);
  }, []);
  const handleSaveNewExpense = useCallback(async () => {
    if (!editingId) return;
    const amountNum = Number((newExpense.amount || '').replace(/\D/g, ''));
    if (!amountNum || amountNum <= 0) { message.warning('Vui lòng nhập số tiền hợp lệ.'); return; }
    if (!newExpense.description.trim()) { message.warning('Vui lòng nhập mô tả cho chi phí.'); return; }
    if (!newExpenseFile) { message.warning('Vui lòng chọn ảnh chứng từ chuyển khoản.'); return; }
    setSavingExpense(true);
    try {
      await taskReportApi.addExpense({
        taskReportId: editingId,
        amount: amountNum,
        description: newExpense.description.trim(),
        paymentImg: newExpenseFile,
      });
      const updated = await taskReportApi.getById(editingId);
      setTaskReports((prev) => prev.map((r) => (r.taskReportId === editingId ? updated : r)));
      setEditingExpenses(
        (updated.expenses?.length ? updated.expenses : []).map((e, i) => ({
          key: `exp-${e.expenseId ?? i}-${Date.now()}`,
          expenseId: e.expenseId,
          amount: String(e.amount ?? ''),
          description: e.description ?? '',
        })),
      );
      message.success('Đã thêm chi phí');
      resetNewExpenseForm();
    } catch (err) {
      console.error(err);
      message.error('Thêm chi phí thất bại');
    } finally {
      setSavingExpense(false);
    }
  }, [editingId, newExpense, newExpenseFile, resetNewExpenseForm]);

  // ─── Render ───

  return (
    <div className="flex flex-col p-6 gap-4 bg-slate-50 overflow-hidden" style={{ height: 'var(--content-height, 100vh)' }}>
      {/* Header */}
      <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-semibold text-black">Báo cáo công việc</h2>
        <p className="text-xs text-gray-500">Ghi báo cáo cho các phiên đã hoàn thành. Chọn yêu cầu bên trái rồi bấm vào phiên để xem chi tiết.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <HoverSearch value={search} onChange={setSearch} placeholder="Tìm theo mã hoặc tên yêu cầu..." />
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
          variant="outline"
          size="icon"
          className="shrink-0 bg-white border-slate-200 text-gray-600 hover:bg-gray-50"
          onClick={clearFilter}
        >
          <RotateCcw size={16} />
        </Button>
        {(filterFrom || filterTo) && (
          <span className="text-xs text-gray-500">Chỉ hiển thị phiên trong khoảng đã chọn</span>
        )}
      </div>

      {/* Two-column layout — fills remaining height */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* ─── Sidebar: Request list ─── */}
        <div className="w-[360px] shrink-0 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-slate-200">
              <div className="min-w-0">
                <h3 className="font-semibold text-base text-black truncate">Danh sách yêu cầu</h3>
                <p className="text-[11px] text-slate-500">{requestGroups.length} yêu cầu có phiên đã hoàn thành</p>
              </div>
              <span className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2 py-1 shrink-0">
                {requestGroups.length}
              </span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 space-y-2 bg-slate-50">
              {loading ? (
                <div className="flex items-center justify-center py-8"><Spin size="small" /></div>
              ) : requestGroups.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500">
                  {filterFrom || filterTo || search
                    ? 'Không có yêu cầu nào khớp bộ lọc.'
                    : 'Chưa có phiên nào đã hoàn thành để ghi báo cáo.'}
                </div>
              ) : (
                requestGroups.map((g) => {
                  const fullReq = requestMap.get(g.requestId);
                  return (
                    <RequestCard
                      key={g.requestId}
                      requestName={g.requestName}
                      requestCode={g.requestCode}
                      customerName={fullReq?.customerName}
                      subjectId={fullReq?.subjectId}
                      courseId={fullReq?.courseId}
                      eventId={fullReq?.eventId}
                      status={fullReq?.status}
                      isActive={g.requestId === selectedRequestId}
                      onClick={() => {
                        setSelectedRequestId(g.requestId);
                        setActiveTarget(null);
                      }}
                      hintText={`${g.sessions.length} phiên hoàn thành`}
                    />
                  );
                })
              )}
            </div>
        </div>

        {/* ─── Content area ─── */}
        <div className="flex-1 flex gap-4 min-w-0 min-h-0">
          {/* Session list */}
          <div className="flex-1 min-w-0 space-y-3 overflow-y-auto no-scrollbar">
            {!selectedGroup ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <FileText className="text-slate-400" size={28} />
                </div>
                <p className="text-sm font-medium text-black">Chọn một yêu cầu ở cột bên trái</p>
                <p className="text-xs text-gray-500 mt-1">để xem danh sách phiên và ghi báo cáo.</p>
              </div>
            ) : (
              <>
                {/* Request header */}
                <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-slate-200">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-black truncate">{selectedGroup.requestName}</h3>
                      <p className="text-xs text-slate-500 mt-1">{selectedGroup.requestCode} · {selectedGroup.sessions.length} phiên hoàn thành</p>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] shrink-0">
                      Đã hoàn thành
                    </Badge>
                  </div>
                </div>

                {/* Báo cáo chung card */}
                <button
                  type="button"
                  onClick={() => setActiveTarget('request')}
                  className={`w-full text-left rounded-2xl border shadow-sm p-4 transition ${
                    activeTarget === 'request'
                      ? 'bg-sky-50/80 border-sky-300 shadow-md'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                        <FileText className="text-violet-600" size={18} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">Báo cáo chung</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Báo cáo tổng thể cho toàn bộ yêu cầu</div>
                      </div>
                    </div>
                    <Badge className={hasReportForRequest()
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-gray-100 text-gray-500 border border-gray-200'
                    }>
                      {hasReportForRequest() ? 'Đã ghi' : 'Chưa ghi'}
                    </Badge>
                  </div>
                </button>

                {/* Session cards */}
                {selectedGroup.sessions.map((s) => {
                  const isActive = activeTarget === s.sessionId;
                  const hasReport = hasReportForSession(s.sessionId);
                  return (
                    <button
                      key={s.sessionId}
                      type="button"
                      onClick={() => setActiveTarget(s.sessionId)}
                      className={`w-full text-left rounded-2xl border shadow-sm overflow-hidden transition ${
                        isActive
                          ? 'bg-sky-50/80 border-sky-300 shadow-md'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50/80 to-white border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                            <span className="text-sm font-bold text-sky-700">{s.sessionNo ?? '?'}</span>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">Phiên {s.sessionNo ?? s.sessionId}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {s.sessionTitle || `ID: ${s.sessionId}`}
                            </div>
                          </div>
                        </div>
                        <Badge className={hasReport
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }>
                          {hasReport ? 'Đã ghi' : 'Chưa ghi'}
                        </Badge>
                      </div>
                      <div className="px-4 py-2.5 flex items-center gap-4 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays size={12} />
                          {dayjs(s.startAt).format('DD/MM/YYYY')}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={12} />
                          {dayjs(s.startAt).format('HH:mm')} – {dayjs(s.endAt).format('HH:mm')}
                        </span>
                        {s.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} />
                            {s.location}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* ─── Right panel: Reports timeline ─── */}
          {showRightPanel && selectedGroup && (
            <div className="w-[400px] shrink-0 overflow-y-auto no-scrollbar space-y-4">
              {/* Panel header */}
              <div className="rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900 truncate">
                      {isRequestLevelReport
                        ? 'Báo cáo chung'
                        : selectedSession
                          ? `Phiên ${selectedSession.sessionNo ?? selectedSession.sessionId}`
                          : '—'}
                    </h4>
                    {selectedSession && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {dayjs(selectedSession.startAt).format('DD/MM/YYYY HH:mm')} – {dayjs(selectedSession.endAt).format('HH:mm')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1.5 bg-[#2197C0] hover:bg-[#208AAE] text-white text-xs"
                      onClick={openAddReportModal}
                    >
                      <Plus size={14} />
                      Tạo báo cáo
                    </Button>
                    <button
                      type="button"
                      onClick={() => setActiveTarget(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Reports timeline */}
                <div className="px-4 py-3">
                  {sortedTimeline.length === 0 ? (
                    <div className="text-center py-6">
                      <FileText className="mx-auto text-slate-300 mb-2" size={32} />
                      <p className="text-xs text-gray-500">Chưa có báo cáo nào.</p>
                      <p className="text-xs text-gray-400 mt-1">Nhấn <strong className="text-sky-600">Tạo báo cáo</strong> để thêm.</p>
                    </div>
                  ) : (
                    <div className="relative pl-5 border-l-2 border-sky-200 space-y-0">
                      {sortedTimeline.map((r) => {
                        const hasExpenses = (r.expenses?.length ?? 0) > 0;
                        return (
                          <div key={r.taskReportId} className="relative pb-4 last:pb-0">
                            <div className="absolute -left-[23px] top-3 w-2.5 h-2.5 rounded-full bg-sky-500 border-2 border-white shadow-sm" />
                            <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5">
                              <div className="text-[11px] font-medium text-sky-700">
                                {formatDateRange(r.startAt, r.endAt)}
                              </div>
                              <div className="text-sm font-semibold text-slate-900 mt-0.5">{r.title || '—'}</div>
                              <p className="text-xs text-slate-600 mt-1 line-clamp-3">{r.description || '—'}</p>

                              <div className="mt-2 flex items-center justify-between">
                                <div>
                                  {hasExpenses ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedExpensesReportId((prev) => prev === r.taskReportId ? null : r.taskReportId);
                                      }}
                                      className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5 hover:bg-amber-100 transition"
                                    >
                                      <Wallet size={11} />
                                      Chi phí ({r.expenses!.length})
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-gray-400">Không có chi phí</span>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button type="button" size="sm" variant="ghost" className="text-slate-600 h-7 text-xs px-2" onClick={() => { startEdit(r); setOpenReportModal(true); }}>
                                    Sửa
                                  </Button>
                                  <Button type="button" size="sm" variant="ghost" className="text-red-500 h-7 px-1.5 hover:bg-red-50" onClick={() => handleDeleteReport(r.taskReportId)}>
                                    <Trash2 size={13} />
                                  </Button>
                                </div>
                              </div>

                              {hasExpenses && expandedExpensesReportId === r.taskReportId && (
                                <div className="mt-2 pt-2 border-t border-amber-100 space-y-1">
                                  {r.expenses!.map((exp, idx) => (
                                    <div key={exp.expenseId ?? idx} className="flex items-center justify-between text-xs bg-amber-50 rounded-lg px-2.5 py-1.5 border border-amber-100">
                                      <span className="text-gray-700">{exp.description || `Khoản ${idx + 1}`}</span>
                                      <span className="font-semibold text-amber-800 whitespace-nowrap">
                                        {exp.amount != null ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(exp.amount) : '—'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modal: Create / Edit report ─── */}
      {selectedGroup && (
        <Dialog
          open={openReportModal}
          onClose={closeReportModal}
          title={editingId != null ? 'Chỉnh sửa báo cáo' : 'Thêm báo cáo'}
          description={editingId != null ? 'Cập nhật nội dung báo cáo.' : 'Điền thông tin báo cáo công việc.'}
          className="max-w-xl"
        >
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian bắt đầu</label>
                <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full [&_.ant-picker-input>input]:text-black" value={formState.startAt ? dayjs(formState.startAt) : null} onChange={(d) => setFormField('startAt', d ? d.toISOString() : '')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian kết thúc</label>
                <DatePicker showTime format="DD/MM/YYYY HH:mm" className="w-full [&_.ant-picker-input>input]:text-black" value={formState.endAt ? dayjs(formState.endAt) : null} onChange={(d) => setFormField('endAt', d ? d.toISOString() : '')} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề *</label>
              <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white" placeholder="Ví dụ: Chuẩn bị bài, Giảng phần 1" value={formState.title} onChange={(e) => setFormField('title', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả *</label>
              <textarea className="w-full min-h-[80px] rounded-lg border border-gray-300 px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y bg-white" placeholder="Nội dung công việc đã làm..." value={formState.description} onChange={(e) => setFormField('description', e.target.value)} />
            </div>

            {editingId != null && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700">Chi phí phát sinh</p>
                  <span className="text-[11px] text-slate-500">{editingExpenses.length} khoản</span>
                </div>
                {editingExpenses.length > 0 && (
                  <ul className="space-y-1.5">
                    {editingExpenses.map((row, idx) => (
                      <li key={row.key} className="flex justify-between gap-2 text-xs bg-white rounded border border-slate-100 px-2.5 py-1.5">
                        <span className="text-gray-700">{row.description || `Khoản ${idx + 1}`}</span>
                        <span className="font-medium text-slate-700 whitespace-nowrap">
                          {row.amount && !Number.isNaN(Number(row.amount.replace(/\D/g, '')))
                            ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(row.amount.replace(/\D/g, '')))
                            : '—'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {!showNewExpenseForm ? (
                  <button
                    type="button"
                    onClick={() => setShowNewExpenseForm(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 bg-sky-50 border border-sky-100 rounded-lg px-3 py-1.5 hover:bg-sky-100 transition w-full justify-center"
                  >
                    <Plus size={14} />
                    Thêm chi phí mới
                  </button>
                ) : (
                  <div className="space-y-2.5 rounded-lg border border-sky-200 bg-white p-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Số tiền <span className="text-red-500">*</span></label>
                      <div className="flex items-center rounded-lg border border-gray-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-sky-500">
                        <input type="text" inputMode="numeric" value={newExpense.amount} onChange={(e) => setNewExpense((p) => ({ ...p, amount: e.target.value }))} placeholder="0" className="flex-1 min-w-0 px-3 py-1.5 text-sm text-black placeholder:text-gray-400 focus:outline-none" />
                        <span className="px-3 py-1.5 text-sm text-gray-500 border-l border-gray-200">₫</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Mô tả <span className="text-red-500">*</span></label>
                      <textarea className="w-full min-h-[50px] rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y bg-white" placeholder="Mô tả khoản chi phí..." value={newExpense.description} onChange={(e) => setNewExpense((p) => ({ ...p, description: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Ảnh chuyển khoản <span className="text-red-500">*</span></label>
                      <label className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-xl py-4 px-3 cursor-pointer bg-slate-50 hover:bg-slate-100 transition">
                        <input type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={(e) => handleNewExpenseImgChange(e.target.files?.[0] ?? null)} disabled={savingExpense} />
                        {newExpensePreview ? (
                          <img src={newExpensePreview} alt="Chứng từ" className="max-h-28 rounded-md object-contain" />
                        ) : (
                          <div className="text-center space-y-0.5">
                            <CloudUpload className="mx-auto h-6 w-6 text-slate-400" />
                            <div className="text-xs font-medium text-slate-600">Nhấn để tải ảnh chứng từ</div>
                            <div className="text-[10px] text-slate-400">PNG, JPG (tối đa 5MB)</div>
                          </div>
                        )}
                      </label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={resetNewExpenseForm} disabled={savingExpense}>Hủy</Button>
                      <Button type="button" size="sm" className="text-xs h-7 gap-1.5 bg-[#2197C0] hover:bg-[#208AAE] text-white" disabled={savingExpense} onClick={handleSaveNewExpense}>
                        <Save size={12} />
                        {savingExpense ? 'Đang lưu...' : 'Lưu chi phí'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {editingId == null && (
              <>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formState.hasExpense} onChange={(e) => setFormField('hasExpense', e.target.checked)} className="rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
                  <span className="text-sm font-medium text-gray-800">Có chi phí phát sinh</span>
                </label>

                {formState.hasExpense && (
                  <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền chi phí <span className="text-red-500">*</span></label>
                      <div className="flex items-center rounded-lg border border-gray-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-sky-500">
                        <input type="text" inputMode="numeric" value={formState.expenseAmount} onChange={(e) => setFormField('expenseAmount', e.target.value)} placeholder="0" className="flex-1 min-w-0 px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none" />
                        <span className="px-3 py-2 text-sm text-gray-500 border-l border-gray-200">₫</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ảnh chuyển khoản <span className="text-red-500">*</span></label>
                      <label className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-xl py-6 px-4 cursor-pointer bg-white hover:bg-slate-50 transition">
                        <input type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={(e) => handleExpenseFileChange(e.target.files?.[0] ?? null)} disabled={saving} />
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
                      <textarea className="w-full min-h-[60px] rounded-lg border border-gray-300 px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-y bg-white" placeholder="Thêm ghi chú về khoản chi phí..." value={formState.expenseNote} onChange={(e) => setFormField('expenseNote', e.target.value)} />
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={closeReportModal} disabled={saving}>Hủy</Button>
              <Button type="button" size="sm" disabled={saving} className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white" onClick={handleSaveForm}>
                <Save size={14} />
                {saving ? 'Đang lưu...' : editingId != null ? 'Cập nhật' : 'Thêm báo cáo'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

    </div>
  );
}
