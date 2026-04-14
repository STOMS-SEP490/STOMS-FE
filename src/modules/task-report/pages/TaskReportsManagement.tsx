import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { CalendarDays, ChevronDown, ChevronUp, Clock, Eye, FileText, ReceiptText, RotateCcw } from 'lucide-react';
import { Drawer, Image, Input, Modal, message, Spin, DatePicker } from 'antd';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
import RequestCard from '@/shared/components/request/RequestCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { getErrorMessage } from '@/shared/lib/errorMessage';

import type { RequestListItem } from '@/modules/request/request';
import { taskReportApi } from '../api/taskReportApi';
import type { TaskReport, TaskReportExpense } from '../taskReport';
import requestApi from '@/modules/request/api/requestApi';
import { expenseApi } from '@/modules/transaction/api/expenseApi';
import { walletApi } from '@/modules/transaction/api/walletApi';
import type { WalletListItem } from '@/modules/transaction/api/walletApi';
import { EXPENSE_STATUS, getExpenseStatusInfo } from '@/constants/status';

type RequestSessionSummary = NonNullable<RequestListItem['sessions']>[number];

/** Chỉ hiện yêu cầu Đã công bố (5) và Hoàn thành (6) — khớp API filter. */
const MANAGER_TASKS_REQUEST_LIST_STATUSES = ['PUBLISHED', 'COMPLETED'] as const;

const TASK_REPORTS_PAGE_SIZE = 10;

export default function TaskReportsManagement() {
  const [filterRequestId, setFilterRequestId] = useState<string>('all');
  const [filterTitle, setFilterTitle] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [onlyPendingExpense, setOnlyPendingExpense] = useState(false);
  const [activeTarget, setActiveTarget] = useState<'request' | number | null>(null);

  const [openView, setOpenView] = useState(false);
  const [viewTaskReport, setViewTaskReport] = useState<TaskReport | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveExpenseId, setApproveExpenseId] = useState<number | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [wallets, setWallets] = useState<WalletListItem[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectExpenseId, setRejectExpenseId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [searchParams, setSearchParams] = useSearchParams();
  const openDetailFromUrl = searchParams.get('openDetail');
  const taskReportIdFromUrl = searchParams.get('taskReportId');

  const skipNextAutoOpenRef = useRef(false);

  const closeDetailFromUrl = () => {
    skipNextAutoOpenRef.current = true;
    setOpenView(false);
    setViewTaskReport(null);
    setApproveModalOpen(false);
    setApproveExpenseId(null);
    setSelectedWalletId('');
    setRejectModalOpen(false);
    setRejectExpenseId(null);
    setRejectReason('');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openDetail');
      next.delete('taskReportId');
      return next;
    });
  };

  useEffect(() => {
    if (!approveModalOpen) return;

    const fetchWallets = async () => {
      try {
        setWalletsLoading(true);
        const res = await walletApi.getWallets({ pageNumber: 1, pageSize: 500 });
        setWallets(res.items ?? []);

        if (!selectedWalletId && (res.items?.length ?? 0) > 0) {
          setSelectedWalletId(String((res.items ?? [])[0].walletId));
        }
      } finally {
        setWalletsLoading(false);
      }
    };

    void fetchWallets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveModalOpen]);

  useEffect(() => {
    if (openDetailFromUrl !== '1') return;
    if (!taskReportIdFromUrl) return;

    if (skipNextAutoOpenRef.current) {
      skipNextAutoOpenRef.current = false;
      return;
    }

    const taskReportId = Number(taskReportIdFromUrl);
    if (!taskReportId || Number.isNaN(taskReportId)) return;
    if (openView && viewTaskReport?.taskReportId === taskReportId) return;

    (async () => {
      try {
        setOpenView(true);
        setViewTaskReport(null);
        setViewLoading(true);

        const detail = await taskReportApi.getById(taskReportId);
        setViewTaskReport(detail);
      } catch {
        message.error('Không tải được chi tiết báo cáo');
        setOpenView(false);
      } finally {
        setViewLoading(false);
      }
    })();
  }, [openDetailFromUrl, taskReportIdFromUrl, openView, viewTaskReport?.taskReportId]);

  const selectedRequestIdNum =
    filterRequestId !== 'all' ? Number(filterRequestId) : null;
  const selectedSessionIdNum = typeof activeTarget === 'number' ? activeTarget : null;
  const isRequestLevelTarget = activeTarget === 'request';

  const resetFilters = () => {
    setFilterRequestId('all');
    setActiveTarget(null);
    setFilterTitle('');
    setFilterStartDate('');
    setFilterEndDate('');
    setOnlyPendingExpense(false);
  };

  const REQUEST_PAGE_SIZE = 10;
  const requestScrollRef = useRef<HTMLDivElement | null>(null);
  const requestLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const taskReportsScrollRef = useRef<HTMLDivElement | null>(null);
  const taskReportsLoadMoreRef = useRef<HTMLDivElement | null>(null);

  const {
    data: requestsInfinite,
    isLoading: requestsLoading,
    isFetchingNextPage: requestsFetchingMore,
    fetchNextPage: fetchNextRequestsPage,
    hasNextPage: hasMoreRequests,
    error: requestsError,
  } = useInfiniteQuery({
    queryKey: [
      'requests',
      'task-reports-management',
      REQUEST_PAGE_SIZE,
      ...MANAGER_TASKS_REQUEST_LIST_STATUSES,
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      requestApi.getRequests({
        pageNumber: Number(pageParam),
        pageSize: REQUEST_PAGE_SIZE,
        statuses: [...MANAGER_TASKS_REQUEST_LIST_STATUSES],
      }),
    getNextPageParam: (lastPage) => {
      const cur = Number(lastPage.pageNumber ?? 1);
      const total = Number(lastPage.totalPages ?? 1);
      if (!Number.isFinite(cur) || !Number.isFinite(total)) return undefined;
      return cur < total ? cur + 1 : undefined;
    },
  });

  const requests = useMemo(() => {
    const pages = requestsInfinite?.pages ?? [];
    return pages.flatMap((p) => p.items ?? []);
  }, [requestsInfinite]);

  useEffect(() => {
    const root = requestScrollRef.current;
    const target = requestLoadMoreRef.current;
    if (!root || !target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (!hasMoreRequests) return;
        if (requestsFetchingMore) return;
        void fetchNextRequestsPage();
      },
      { root, rootMargin: '120px', threshold: 0.01 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextRequestsPage, hasMoreRequests, requestsFetchingMore]);

  const requestNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of requests) map.set(r.requestId, r.requestName);
    return map;
  }, [requests]);

  const {
    data: selectedRequestDetail,
    error: requestDetailError,
  } = useQuery({
    queryKey: ['request-detail', selectedRequestIdNum],
    enabled:
      typeof selectedRequestIdNum === 'number' && selectedRequestIdNum > 0,
    queryFn: () => requestApi.getById(selectedRequestIdNum as number),
  });

  const sessionsForSelectedRequest: RequestSessionSummary[] =
    selectedRequestDetail?.sessions ?? [];

  const viewRequestIdNum = viewTaskReport?.requestId ?? null;
  const { data: viewRequestDetail } = useQuery({
    queryKey: ['request-detail', 'task-report-view', viewRequestIdNum],
    enabled: typeof viewRequestIdNum === 'number' && viewRequestIdNum > 0 && openView,
    queryFn: () => requestApi.getById(viewRequestIdNum as number),
  });
  const viewSessionNo = useMemo(() => {
    const sid = viewTaskReport?.sessionId;
    if (!sid) return null;
    const raw = (viewRequestDetail?.sessions ?? []).find((s) => Number(s.sessionId) === Number(sid));
    const no = raw?.sessionNo != null ? Number(raw.sessionNo) : null;
    return no != null && Number.isFinite(no) && no > 0 ? no : null;
  }, [viewRequestDetail?.sessions, viewTaskReport?.sessionId]);

  const {
    data: taskReportsInfinite,
    isLoading: taskReportsLoading,
    isFetchingNextPage: taskReportsFetchingMore,
    fetchNextPage: fetchNextTaskReportsPage,
    hasNextPage: hasMoreTaskReports,
    error: taskReportsError,
  } = useInfiniteQuery({
    queryKey: [
      'task-reports',
      'task-reports-management',
      TASK_REPORTS_PAGE_SIZE,
      selectedRequestIdNum ?? 'all',
      selectedSessionIdNum ?? 'all',
      filterTitle.trim() || 'all',
      filterStartDate || 'all',
      filterEndDate || 'all',
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      taskReportApi.getAll({
        pageNumber: Number(pageParam),
        pageSize: TASK_REPORTS_PAGE_SIZE,
        requestId: selectedRequestIdNum ?? undefined,
        sessionId: selectedSessionIdNum ?? undefined,
        title: filterTitle.trim() || undefined,
        start: filterStartDate ? `${filterStartDate}T00:00:00` : undefined,
        end: filterEndDate ? `${filterEndDate}T23:59:59.999` : undefined,
      }),
    getNextPageParam: (lastPage) => {
      const cur = Number(lastPage.pageNumber ?? 1);
      const total = Number(lastPage.totalPages ?? 1);
      if (!Number.isFinite(cur) || !Number.isFinite(total)) return undefined;
      return cur < total ? cur + 1 : undefined;
    },
  });

  const taskReports = useMemo(() => {
    const pages = taskReportsInfinite?.pages ?? [];
    return pages.flatMap((p) => p.items ?? []);
  }, [taskReportsInfinite]);

  const taskReportsTotalItems = taskReportsInfinite?.pages?.[0]?.totalItems ?? 0;

  const filteredTaskReports = useMemo(() => {
    if (!onlyPendingExpense) return taskReports;
    return taskReports.filter((report) =>
      (report.expenses ?? []).some(
        (e) => getExpenseStatusInfo(e.status).code === EXPENSE_STATUS.PENDING,
      ),
    );
  }, [taskReports, onlyPendingExpense]);

  const reportsForActiveTarget = useMemo(() => {
    if (!selectedRequestIdNum || !activeTarget) return [];
    return filteredTaskReports.filter((r) => {
      if (r.requestId !== selectedRequestIdNum) return false;
      if (isRequestLevelTarget) return r.sessionId == null || r.sessionId === 0;
      return r.sessionId === selectedSessionIdNum;
    });
  }, [
    activeTarget,
    filteredTaskReports,
    isRequestLevelTarget,
    selectedRequestIdNum,
    selectedSessionIdNum,
  ]);

  const reportCardsForActiveTarget = useMemo(
    () =>
      [...reportsForActiveTarget].sort((a, b) => {
        const t1 = a.startAt ? new Date(a.startAt).getTime() : 0;
        const t2 = b.startAt ? new Date(b.startAt).getTime() : 0;
        return t1 - t2;
      }),
    [reportsForActiveTarget],
  );

  const reportCardsForAllRequests = useMemo(
    () =>
      [...filteredTaskReports].sort((a, b) => {
        const t1 = a.startAt ? new Date(a.startAt).getTime() : 0;
        const t2 = b.startAt ? new Date(b.startAt).getTime() : 0;
        return t1 - t2;
      }),
    [filteredTaskReports],
  );

  useEffect(() => {
    const root = taskReportsScrollRef.current;
    const target = taskReportsLoadMoreRef.current;
    if (!root || !target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (!hasMoreTaskReports) return;
        if (taskReportsFetchingMore) return;
        void fetchNextTaskReportsPage();
      },
      { root, rootMargin: '120px', threshold: 0.01 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextTaskReportsPage, hasMoreTaskReports, taskReportsFetchingMore]);

  const lastErrorRef = useRef<string | null>(null);
  useEffect(() => {
    const err = requestsError ?? requestDetailError ?? taskReportsError;
    if (!err) return;
    const msg = getErrorMessage(err);
    if (lastErrorRef.current === msg) return;
    lastErrorRef.current = msg;
    message.error(msg);
  }, [requestsError, requestDetailError, taskReportsError]);

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('vi-VN');
  };

  const openTaskDetail = useCallback(async (taskReportId: number) => {
    setOpenView(true);
    setViewTaskReport(null);
    setViewLoading(true);
    try {
      const detail = await taskReportApi.getById(taskReportId);
      setViewTaskReport(detail);
    } catch {
      message.error('Không tải được chi tiết báo cáo');
      setOpenView(false);
    } finally {
      setViewLoading(false);
    }
  }, []);

  const pendingCountForReport = (r: TaskReport) =>
    (r.expenses ?? []).filter(
      (e) => getExpenseStatusInfo(e.status).code === EXPENSE_STATUS.PENDING,
    ).length;

  const renderReportCards = (reports: TaskReport[], options?: { showRequestName?: boolean }) => (
    <div className="overflow-hidden rounded-xl bg-slate-100/70 shadow-inner">
      {reports.map((r) => {
        const pendingN = pendingCountForReport(r);
        const expenses = r.expenses ?? [];
        const totalExpenseAmount = expenses.reduce(
          (sum, expense) => sum + Number(expense.amount ?? 0),
          0,
        );
        const reporterName = r.member?.fullName?.trim() || 'Chưa rõ người báo cáo';
        const requestName =
          requestNameById.get(r.requestId) ?? `Request #${r.requestId}`;

        return (
          <button
            key={r.taskReportId}
            type="button"
            onClick={() => void openTaskDetail(r.taskReportId)}
            className="w-full border-b border-slate-200/80 bg-white p-3.5 text-left transition hover:bg-slate-50 last:border-b-0"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900" title={r.title}>
                    {r.title || 'Báo cáo công việc'}
                  </div>
                  <div className="truncate text-[11px] text-slate-500">{reporterName}</div>
                  {options?.showRequestName ? (
                    <div className="mt-0.5 truncate text-[11px] font-medium text-sky-700">
                      {requestName}
                    </div>
                  ) : null}
                </div>

                {r.description?.trim() ? (
                  <div className="mt-1 line-clamp-1 text-[12px] leading-5 text-slate-600">
                    <span className="text-slate-500">Mô tả: </span>
                    {r.description.trim()}
                  </div>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {pendingN > 0 ? (
                  <Badge className="bg-amber-100 text-[10px] font-medium text-amber-800">
                    {pendingN} chờ duyệt
                  </Badge>
                ) : null}
                <Eye className="text-slate-400" size={18} />
              </div>
            </div>

            <div className="mt-2.5 grid grid-cols-1 gap-2 text-[11px] min-[980px]:grid-cols-3">
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1.5 text-sky-800">
                <CalendarDays size={12} className="text-sky-600" />
                <span>
                  {r.startAt && r.endAt
                    ? `${dayjs(r.startAt).format('DD/MM HH:mm')} - ${dayjs(r.endAt).format('DD/MM HH:mm')}`
                    : 'Chưa có thời gian làm việc'}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1.5 text-violet-800">
                <ReceiptText size={12} className="text-violet-600" />
                <span>{expenses.length} khoản chi</span>
              </div>
              <div className="inline-flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-900">
                <span className="text-[11px] font-medium text-emerald-700">Tổng chi</span>
                <span className="text-base font-bold leading-none tracking-tight">
                  {totalExpenseAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  const toggleTarget = (target: 'request' | number) => {
    setActiveTarget((prev) => (prev === target ? null : target));
  };

  return (
    <div
      className="flex flex-col gap-4 overflow-hidden bg-slate-50 p-6"
      style={{ height: 'var(--content-height, 100vh)' }}
    >
      <div className="flex shrink-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-black">Quản lý báo cáo công việc</h2>
          <p className="text-xs text-gray-500">
            Duyệt chi phí, xem chi tiết báo cáo — lọc theo yêu cầu, buổi và thời gian. Giao diện đồng bộ với trang giáo viên.
          </p>
        </div>
        <div className="flex min-w-0 flex-col items-stretch gap-2 min-[900px]:items-end">
          <div className="flex flex-wrap items-center justify-end gap-2 min-[900px]:gap-3">
            <HoverSearch
              placeholder="Tìm theo tiêu đề báo cáo..."
              value={filterTitle}
              onChange={(v) => {
                setFilterTitle(v);
              }}
            />
            <DatePicker
              format="DD/MM/YYYY"
              placeholder="Từ ngày"
              value={filterStartDate ? dayjs(filterStartDate) : null}
              onChange={(d) => {
                setFilterStartDate(d ? d.format('YYYY-MM-DD') : '');
              }}
              className="w-[140px] [&_.ant-picker-input>input]:text-black"
            />
            <span className="text-gray-400">→</span>
            <DatePicker
              format="DD/MM/YYYY"
              placeholder="Đến ngày"
              value={filterEndDate ? dayjs(filterEndDate) : null}
              onChange={(d) => {
                setFilterEndDate(d ? d.format('YYYY-MM-DD') : '');
              }}
              className="w-[140px] [&_.ant-picker-input>input]:text-black"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 border-slate-200 bg-white text-gray-600 hover:bg-gray-50"
              onClick={resetFilters}
              title="Đặt lại bộ lọc"
            >
              <RotateCcw size={16} />
            </Button>
            <Button
              type="button"
              variant={onlyPendingExpense ? 'default' : 'outline'}
              size="sm"
              className={
                onlyPendingExpense
                  ? 'border-0 bg-amber-500 text-white hover:bg-amber-600'
                  : 'border-slate-200 bg-white'
              }
              onClick={() => {
                setOnlyPendingExpense((prev) => !prev);
              }}
              title="Chỉ hiện báo cáo có chi phí chờ duyệt"
            >
              Chờ duyệt
            </Button>
          </div>
          <span className="text-right text-xs text-slate-500">
            {taskReportsLoading
              ? 'Đang tải…'
              : `${Math.min(taskReports.length, taskReportsTotalItems)} / ${taskReportsTotalItems} báo cáo`}
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="flex w-[360px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-start justify-between gap-2 border-b border-slate-200 p-4">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-black">Danh sách yêu cầu</h3>
              <p className="text-[11px] text-slate-500">
                {requestsLoading ? 'Đang tải…' : `${requests.length} hiển thị`}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`h-8 shrink-0 px-2.5 text-xs font-medium ${
                filterRequestId === 'all'
                  ? 'border-sky-400 bg-sky-50 text-sky-800 hover:bg-sky-100'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
              onClick={() => {
                setFilterRequestId('all');
                setActiveTarget(null);
              }}
              title="Xem báo cáo trên mọi yêu cầu"
            >
              Tất cả yêu cầu
            </Button>
          </div>
          <div
            ref={requestScrollRef}
            className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3"
          >
            {requests.map((r) => (
              <RequestCard
                key={r.requestId}
                requestName={r.requestName}
                requestCode={r.requestCode}
                customerName={r.customerName}
                subjectId={r.subjectId}
                courseId={r.courseId}
                eventId={r.eventId}
                status={r.status}
                isActive={filterRequestId === String(r.requestId)}
                onClick={() => {
                  setFilterRequestId(String(r.requestId));
                  setActiveTarget('request');
                }}
              />
            ))}

            {!requestsLoading && requests.length === 0 && (
              <div className="py-6 text-center text-xs text-gray-500">Không có yêu cầu nào.</div>
            )}

            <div ref={requestLoadMoreRef} className="h-8" aria-hidden />
            {requestsFetchingMore ? (
              <div className="text-xs text-gray-500">Đang tải thêm...</div>
            ) : hasMoreRequests ? (
              <div className="text-[11px] text-gray-400">Cuộn xuống để tải thêm</div>
            ) : null}
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <div ref={taskReportsScrollRef} className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {filterRequestId === 'all' ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Tất cả báo cáo</h3>
                  <span className="text-[11px] text-slate-500">
                    {taskReportsLoading ? 'Đang tải…' : `${reportCardsForAllRequests.length} báo cáo`}
                  </span>
                </div>

                {taskReportsLoading && taskReports.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <Spin />
                  </div>
                ) : reportCardsForAllRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                    <FileText className="text-slate-300" size={28} />
                    <p className="text-sm text-gray-500">Chưa có báo cáo nào.</p>
                  </div>
                ) : (
                  renderReportCards(reportCardsForAllRequests, { showRequestName: true })
                )}

                <div ref={taskReportsLoadMoreRef} className="h-8" aria-hidden />
                {taskReportsFetchingMore ? (
                  <div className="text-center text-xs text-gray-500">Đang tải thêm...</div>
                ) : hasMoreTaskReports ? (
                  <div className="text-center text-[11px] text-gray-400">Cuộn xuống để tải thêm</div>
                ) : null}
              </div>
            ) : selectedRequestDetail ? (
              <>
                <div className="shrink-0 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <h3 className="truncate text-lg font-semibold text-black">{selectedRequestDetail.requestName}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedRequestDetail.requestCode || '—'} · {sessionsForSelectedRequest.length} buổi
                  </p>
                </div>

                <div
                  className={`w-full overflow-hidden rounded-2xl border bg-white transition ${
                    isRequestLevelTarget ? 'border-sky-300 shadow-md' : 'border-slate-200 shadow-sm'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleTarget('request')}
                    className={`block w-full p-4 text-left transition ${
                      isRequestLevelTarget ? 'bg-sky-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
                          <FileText className="text-violet-600" size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Báo cáo chung</div>
                          <div className="mt-0.5 text-[11px] text-slate-500">Nhấn để mở danh sách báo cáo tổng thể</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isRequestLevelTarget ? (
                          <ChevronUp className="shrink-0 text-slate-500" size={18} />
                        ) : (
                          <ChevronDown className="shrink-0 text-slate-500" size={18} />
                        )}
                        <Badge
                          className={
                            filteredTaskReports.some(
                              (r) =>
                                r.requestId === selectedRequestIdNum &&
                                (r.sessionId == null || r.sessionId === 0),
                            )
                              ? 'border border-emerald-100 bg-emerald-50 text-emerald-700'
                              : 'border border-gray-200 bg-gray-100 text-gray-500'
                          }
                        >
                          {filteredTaskReports.some(
                            (r) =>
                              r.requestId === selectedRequestIdNum &&
                              (r.sessionId == null || r.sessionId === 0),
                          )
                            ? 'Đã ghi'
                            : 'Chưa ghi'}
                        </Badge>
                      </div>
                    </div>
                  </button>

                  {isRequestLevelTarget ? (
                    <div className="border-t border-slate-200 bg-slate-50/40 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-semibold text-slate-900">Danh sách báo cáo</div>
                      <div className="text-[11px] text-slate-500">Báo cáo chung</div>
                    </div>

                    {taskReportsLoading && taskReports.length === 0 ? (
                      <div className="flex justify-center py-8">
                        <Spin />
                      </div>
                    ) : reportCardsForActiveTarget.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                        <FileText className="text-slate-300" size={28} />
                        <p className="text-sm text-gray-500">Chưa có báo cáo nào.</p>
                      </div>
                    ) : renderReportCards(reportCardsForActiveTarget)}

                    <div ref={taskReportsLoadMoreRef} className="h-8" aria-hidden />
                    {activeTarget && taskReportsFetchingMore ? (
                      <div className="text-center text-xs text-gray-500">Đang tải thêm...</div>
                    ) : activeTarget && hasMoreTaskReports ? (
                      <div className="text-center text-[11px] text-gray-400">Cuộn xuống để tải thêm</div>
                    ) : null}
                    </div>
                  ) : null}
                </div>

                {sessionsForSelectedRequest.map((s) => {
                  const isActive = activeTarget === s.sessionId;
                  const hasReport = filteredTaskReports.some(
                    (r) =>
                      r.requestId === selectedRequestIdNum &&
                      Number(r.sessionId) === Number(s.sessionId),
                  );

                  return (
                    <div
                      key={s.sessionId}
                      className={`w-full overflow-hidden rounded-2xl border text-left shadow-sm transition ${
                        isActive
                          ? 'border-sky-300 bg-white shadow-md'
                          : 'border-slate-200 bg-white hover:shadow-md'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleTarget(s.sessionId)}
                        className="block w-full text-left"
                      >
                        <div className={`flex items-center justify-between border-b border-slate-100 px-4 py-3 ${
                          isActive ? 'bg-sky-50/60' : 'bg-slate-50/70'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100">
                              <span className="text-sm font-bold text-sky-700">{s.sessionNo ?? '?'}</span>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-900">Buổi {s.sessionNo ?? s.sessionId}</div>
                              <div className="mt-0.5 text-[11px] text-slate-500">Nhấn để xem danh sách báo cáo</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isActive ? (
                              <ChevronUp className="shrink-0 text-slate-500" size={18} />
                            ) : (
                              <ChevronDown className="shrink-0 text-slate-500" size={18} />
                            )}
                            <Badge
                              className={
                                hasReport
                                  ? 'border border-emerald-100 bg-emerald-50 text-emerald-700'
                                  : 'border border-gray-200 bg-gray-100 text-gray-500'
                              }
                            >
                              {hasReport ? 'Đã ghi' : 'Chưa ghi'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 px-4 py-2.5 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays size={12} />
                            {s.startAt ? dayjs(s.startAt).format('DD/MM/YYYY') : '—'}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock size={12} />
                            {s.startAt && s.endAt
                              ? `${dayjs(s.startAt).format('HH:mm')} – ${dayjs(s.endAt).format('HH:mm')}`
                              : '—'}
                          </span>
                        </div>
                      </button>

                      {isActive ? (
                        <div className="border-t border-slate-200 bg-slate-50/40 px-4 pb-4 pt-3">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="text-sm font-semibold text-slate-900">Danh sách báo cáo</div>
                            <div className="text-[11px] text-slate-500">
                              {s.startAt && s.endAt
                                ? `${dayjs(s.startAt).format('DD/MM/YYYY HH:mm')} - ${dayjs(s.endAt).format('HH:mm')}`
                                : '—'}
                            </div>
                          </div>

                          {taskReportsLoading && taskReports.length === 0 ? (
                            <div className="flex justify-center py-8">
                              <Spin />
                            </div>
                          ) : reportCardsForActiveTarget.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                              <FileText className="text-slate-300" size={28} />
                              <p className="text-sm text-gray-500">Chưa có báo cáo nào.</p>
                            </div>
                          ) : renderReportCards(reportCardsForActiveTarget)}

                          <div ref={taskReportsLoadMoreRef} className="h-8" aria-hidden />
                          {activeTarget && taskReportsFetchingMore ? (
                            <div className="text-center text-xs text-gray-500">Đang tải thêm...</div>
                          ) : activeTarget && hasMoreTaskReports ? (
                            <div className="text-center text-[11px] text-gray-400">Cuộn xuống để tải thêm</div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="flex justify-center py-16">
                <Spin />
              </div>
            )}
          </div>
        </div>
      </div>

      <Drawer
        open={openView}
        onClose={() => {
          closeDetailFromUrl();
        }}
        placement="right"
        width={540}
        title="Chi tiết báo cáo công việc"
      >
        {viewLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spin size="large" />
          </div>
        ) : viewTaskReport ? (
          <div className="space-y-4">
            <div>
              <div className="text-xs text-gray-500">Tiêu đề</div>
              <div className="font-medium">{viewTaskReport.title}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Mô tả</div>
              <div className="whitespace-pre-wrap text-sm">
                {viewTaskReport.description}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-gray-500">Thời gian tạo</div>
                <div>{formatDateTime(viewTaskReport.createdAt)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Yêu cầu</div>
                <div>
                  {requestNameById.get(viewTaskReport.requestId) ??
                    `Request #${viewTaskReport.requestId}`}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Buổi</div>
                <div>
                  {viewTaskReport.sessionId
                    ? `Buổi ${viewSessionNo ?? viewTaskReport.sessionId}`
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Thời gian bắt đầu</div>
                <div>
                  {formatDateTime(viewTaskReport.startAt)}
                </div>
              </div>
              <div> 
                <div className="text-xs text-gray-500">Thời gian kết thúc</div>
                <div>
                  {formatDateTime(viewTaskReport.endAt)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Người báo cáo</div>
                <div>{viewTaskReport.member?.fullName ?? '—'}</div>
              </div>
            </div>

            <div className="pt-2">
              <div className="text-sm font-semibold mb-2">Khoản chi</div>
              {((viewTaskReport.expenses ?? []) as TaskReportExpense[]).length === 0 ? (
                <div className="text-sm text-gray-500">Không có khoản chi.</div>
              ) : (
                <div className="space-y-2">
                  {(viewTaskReport.expenses ?? []).map((e) => (
                    <div
                      key={e.expenseId}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                    >
                      {(() => {
                        const info = getExpenseStatusInfo(e.status);
                        const code = info.code;
                        const approvedByName =
                          (e as unknown as { approvedByName?: string | null }).approvedByName ?? null;
                        const approvedByMember =
                          (e as unknown as { approvedByMember?: { fullName?: string | null } | null }).approvedByMember ??
                          (e as unknown as { ApprovedByMember?: { FullName?: string | null } | null }).ApprovedByMember ??
                          null;
                        const approvedByFullName =
                          (approvedByMember as { fullName?: string | null; FullName?: string | null } | null)
                            ? String(
                                (approvedByMember as any).fullName ??
                                  (approvedByMember as any).FullName ??
                                  '',
                              ).trim() || null
                            : null;
                        const isApproved = code === EXPENSE_STATUS.APPROVED;
                        const paymentImg = String(e.paymentImg ?? '').trim();

                        return (
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="text-xs font-semibold text-slate-700">Khoản chi #{e.expenseId}</div>
                                  <Badge className={info.className}>{info.label}</Badge>
                                </div>
                                <div className="mt-1 text-sm text-slate-800 whitespace-pre-wrap break-words leading-5">
                                  {e.description || '—'}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-[11px] text-slate-500 mb-0.5">Số tiền</div>
                                <div className="text-sm font-semibold tabular-nums whitespace-nowrap text-red-600">
                                  {e.amount != null ? e.amount.toLocaleString('vi-VN') : '—'} đ
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-[12px] text-slate-600 pt-1">
                              <div>
                                <div className="text-[11px] text-slate-500">Thời gian tạo</div>
                                <div className="font-medium text-slate-700">{formatDateTime(e.createdAt)}</div>
                              </div>
                              <div>
                                <div className="text-[11px] text-slate-500">Thời gian duyệt</div>
                                <div className="font-medium text-slate-700">{formatDateTime(e.approvedAt)}</div>
                              </div>
                              {isApproved ? (
                                <div className="col-span-2">
                                  <div className="text-[11px] text-slate-500">Người duyệt</div>
                                  <div className="font-medium text-slate-700">
                                    {approvedByFullName ??
                                      approvedByName ??
                                      (e.approvedByMemberId ? `Member #${e.approvedByMemberId}` : '—')}
                                  </div>
                                </div>
                              ) : null}
                            </div>

                            {paymentImg || code === EXPENSE_STATUS.PENDING ? (
                              <div className="flex items-start justify-between gap-3 pt-1">
                                {paymentImg ? (
                                  <div>
                                    <div className="mb-1 text-[11px] text-slate-500">Minh chứng</div>
                                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                      <Image
                                        src={paymentImg}
                                        alt={`Minh chứng khoản chi #${e.expenseId}`}
                                        className="!block !h-[96px] !w-[140px] object-cover"
                                        fallback=""
                                        preview={{
                                          mask: <span className="text-xs">Xem ảnh</span>,
                                        }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div />
                                )}

                                {code === EXPENSE_STATUS.PENDING ? (
                                  <div className="flex items-center gap-2 self-end">
                                    <Button
                                      size="sm"
                                      className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
                                      disabled={actionLoading}
                                      onClick={() => {
                                        setApproveExpenseId(e.expenseId);
                                        setSelectedWalletId('');
                                        setApproveModalOpen(true);
                                      }}
                                    >
                                      Duyệt
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-red-200 text-red-600 hover:bg-red-50"
                                      disabled={actionLoading}
                                      onClick={() => {
                                        setRejectExpenseId(e.expenseId);
                                        setRejectReason('');
                                        setRejectModalOpen(true);
                                      }}
                                    >
                                      Từ chối
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">Không có dữ liệu.</div>
        )}
      </Drawer>

      <Modal
        title="Duyệt khoản chi"
        open={approveModalOpen}
        onCancel={() => {
          if (!actionLoading) {
            setApproveModalOpen(false);
            setApproveExpenseId(null);
            setSelectedWalletId('');
          }
        }}
        okText="Đồng ý duyệt"
        cancelText="Hủy"
        confirmLoading={actionLoading}
        onOk={async () => {
          const walletId = Number(selectedWalletId);
          if (!approveExpenseId) return;
          if (!selectedWalletId || Number.isNaN(walletId) || walletId <= 0) {
            message.warning('Vui lòng chọn quỹ chi trả.');
            return;
          }

          try {
            setActionLoading(true);
            await expenseApi.approve({
              walletId,
              expenseIds: [approveExpenseId],
            });

            message.success('Đã duyệt khoản chi.');
            setApproveModalOpen(false);
            setApproveExpenseId(null);
            setSelectedWalletId('');

            if (viewTaskReport?.taskReportId) {
              const updated = await taskReportApi.getById(viewTaskReport.taskReportId);
              setViewTaskReport(updated);
            }
          } catch (err: unknown) {
            const msg =
              err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data
                    ?.message
                : null;
            message.error(msg ?? 'Duyệt thất bại.');
          } finally {
            setActionLoading(false);
          }
        }}
      >
        <div className="py-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chọn quỹ chi trả <span className="text-red-500">*</span>
          </label>

          {walletsLoading ? (
            <div className="text-sm text-gray-500">Đang tải danh sách quỹ...</div>
          ) : (
            <Select
              value={selectedWalletId || undefined}
              onValueChange={(v) => setSelectedWalletId(v)}
            >
              <SelectTrigger className="w-full text-gray-700">
                <SelectValue placeholder="Chọn quỹ" />
              </SelectTrigger>
              <SelectContent className="z-[1100]">
                {wallets.map((w) => (
                  <SelectItem key={w.walletId} value={String(w.walletId)}>
                    {w.walletName} ·{' '}
                    {Number(w.balance ?? 0).toLocaleString('vi-VN')} đ
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </Modal>

      <Modal
        title="Từ chối khoản chi"
        open={rejectModalOpen}
        onCancel={() => {
          if (!actionLoading) {
            setRejectModalOpen(false);
            setRejectExpenseId(null);
            setRejectReason('');
          }
        }}
        okText="Xác nhận từ chối"
        cancelText="Hủy"
        confirmLoading={actionLoading}
        onOk={async () => {
          const reason = rejectReason.trim();
          if (!rejectExpenseId) return;
          if (!reason) {
            message.warning('Vui lòng nhập lý do từ chối.');
            return;
          }

          try {
            setActionLoading(true);
            await expenseApi.reject({ expenseId: rejectExpenseId, reason });
            message.success('Đã từ chối khoản chi.');
            setRejectModalOpen(false);
            setRejectExpenseId(null);
            setRejectReason('');

            if (viewTaskReport?.taskReportId) {
              const updated = await taskReportApi.getById(viewTaskReport.taskReportId);
              setViewTaskReport(updated);
            }
          } catch (err: unknown) {
            const msg =
              err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data
                    ?.message
                : null;
            message.error(msg ?? 'Từ chối thất bại.');
          } finally {
            setActionLoading(false);
          }
        }}
      >
        <div className="py-2 space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Lý do từ chối <span className="text-red-500">*</span>
          </label>
          <Input.TextArea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Nhập lý do từ chối..."
            rows={4}
            disabled={actionLoading}
          />
        </div>
      </Modal>
    </div>
  );
}
