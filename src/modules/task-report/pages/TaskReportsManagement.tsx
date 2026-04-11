import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, RotateCcw } from 'lucide-react';
import { Drawer, Input, Modal, message, Spin } from 'antd';
import { useSearchParams } from 'react-router-dom';

import { DataTable } from '@/shared/components/common/DataTable';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
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

export default function TaskReportsManagement() {
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 10;

  const [filterRequestId, setFilterRequestId] = useState<string>('all');
  const [filterSessionId, setFilterSessionId] = useState<string>('all');
  const [filterTitle, setFilterTitle] = useState<string>('');
  const [requestKeyword, setRequestKeyword] = useState<string>('');
  const [requestStartAt, setRequestStartAt] = useState<string>('');
  const [requestEndAt, setRequestEndAt] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [onlyPendingExpense, setOnlyPendingExpense] = useState(false);

  const [openView, setOpenView] = useState(false);
  const [viewTaskReport, setViewTaskReport] = useState<TaskReport | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Duyệt khoản chi (khi expense đang ở trạng thái Đang chờ)
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
  const selectedSessionIdNum =
    filterSessionId !== 'all' ? Number(filterSessionId) : null;

  const resetFilters = () => {
    setFilterRequestId('all');
    setFilterSessionId('all');
    setFilterTitle('');
    setRequestKeyword('');
    setRequestStartAt('');
    setRequestEndAt('');
    setFilterStartDate('');
    setFilterEndDate('');
    setOnlyPendingExpense(false);
    setPageNumber(1);
  };

  const {
    data: requestsPaged,
    isLoading: requestsLoading,
    error: requestsError,
  } = useQuery({
    queryKey: ['requests', 'task-reports-management'],
    queryFn: () => requestApi.getRequests({ pageNumber: 1, pageSize: 500 }),
  });

  const requests = useMemo(() => requestsPaged?.items ?? [], [requestsPaged]);
  const requestNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const r of requests) map.set(r.requestId, r.requestName);
    return map;
  }, [requests]);

  const requestListFiltered = useMemo(() => {
    const q = requestKeyword.trim().toLowerCase();
    const startBound = requestStartAt
      ? new Date(`${requestStartAt}T00:00:00`)
      : null;
    const endBound = requestEndAt
      ? new Date(`${requestEndAt}T23:59:59.999`)
      : null;

    return requests.filter((r) => {
      const name = String(r.requestName ?? '').toLowerCase();
      const code = String(r.requestCode ?? '').toLowerCase();
      if (q && !name.includes(q) && !code.includes(q)) return false;

      if (startBound || endBound) {
        const requestStart = r.startDate ? new Date(r.startDate) : null;
        if (!requestStart || Number.isNaN(requestStart.getTime())) return false;

        if (startBound && requestStart < startBound) return false;
        if (endBound && requestStart > endBound) return false;
      }

      return true;
    });
  }, [requests, requestKeyword, requestStartAt, requestEndAt]);

  const {
    data: selectedRequestDetail,
    isLoading: requestDetailLoading,
    error: requestDetailError,
  } = useQuery({
    queryKey: ['request-detail', selectedRequestIdNum],
    enabled:
      typeof selectedRequestIdNum === 'number' && selectedRequestIdNum > 0,
    queryFn: () => requestApi.getById(selectedRequestIdNum as number),
  });

  const sessionsForSelectedRequest: RequestSessionSummary[] =
    selectedRequestDetail?.sessions ?? [];

  const sessionLabelById = useMemo(() => {
    const map = new Map<number, string>();
    for (const s of sessionsForSelectedRequest) {
      map.set(
        s.sessionId,
        `Buổi ${s.sessionNo}${s.status ? ` (${s.status})` : ''}`
      );
    }
    return map;
  }, [sessionsForSelectedRequest]);

  const {
    data: taskReportsPaged,
    isLoading: taskReportsLoading,
    error: taskReportsError,
  } = useQuery({
    queryKey: [
      'task-reports',
      pageNumber,
      pageSize,
      selectedRequestIdNum ?? 'all',
      selectedSessionIdNum ?? 'all',
      filterTitle.trim() || 'all',
      filterStartDate || 'all',
      filterEndDate || 'all',
    ],
    queryFn: () =>
      taskReportApi.getAll({
        pageNumber,
        pageSize,
        requestId: selectedRequestIdNum ?? undefined,
        sessionId: selectedSessionIdNum ?? undefined,
        title: filterTitle.trim() || undefined,
        start: filterStartDate ? `${filterStartDate}T00:00:00` : undefined,
        end: filterEndDate ? `${filterEndDate}T23:59:59.999` : undefined,
      }),
  });

  const taskReports = useMemo(
    () => taskReportsPaged?.items ?? [],
    [taskReportsPaged]
  );

  const filteredTaskReports = useMemo(() => {
    if (!onlyPendingExpense) return taskReports;
    return taskReports.filter((report) =>
      (report.expenses ?? []).some(
        (e) => getExpenseStatusInfo(e.status).code === EXPENSE_STATUS.PENDING,
      )
    );
  }, [taskReports, onlyPendingExpense]);

  const totalItems = taskReportsPaged?.totalItems ?? 0;

  const lastErrorRef = useRef<string | null>(null);
  useEffect(() => {
    const err = requestsError ?? requestDetailError ?? taskReportsError;
    if (!err) return;
    const msg = getErrorMessage(err);
    if (lastErrorRef.current === msg) return;
    lastErrorRef.current = msg;
    message.error(msg);
  }, [requestsError, requestDetailError, taskReportsError]);

  const columns: ColumnDef<TaskReport>[] = [
    { accessorKey: 'taskReportId', header: 'Mã task' },
    {
      accessorKey: 'title',
      header: 'Tiêu đề',
      cell: ({ row }) => (
        <div className="max-w-[360px] truncate font-semibold text-gray-900" title={row.original.title}>
          {row.original.title}
        </div>
      ),
    },
    {
      id: 'request',
      header: 'Yêu cầu',
      cell: ({ row }) => {
        const name = requestNameById.get(row.original.requestId);
        return (
          <div
            className="max-w-[320px] truncate"
            title={name ?? String(row.original.requestId)}
          >
            {name ?? `Request #${row.original.requestId}`}
          </div>
        );
      },
    },
    {
      id: 'session',
      header: 'Buổi',
      cell: ({ row }) => {
        const sid = row.original.sessionId;
        if (!sid) return '—';
        return sessionLabelById.get(sid) ?? `Buổi ${sid}`;
      },
    },
    {
      id: 'time',
      header: 'Thời gian',
      cell: ({ row }) => (
        <div className="text-xs text-gray-600">
          <div>
            {row.original.startAt
              ? new Date(row.original.startAt).toLocaleString()
              : '—'}
          </div>
          <div>
            {row.original.endAt
              ? new Date(row.original.endAt).toLocaleString()
              : '—'}
          </div>
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Thao tác',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={async () => {
              setOpenView(true);
              setViewTaskReport(null);
              setViewLoading(true);
              try {
                const detail = await taskReportApi.getById(row.original.taskReportId);
                setViewTaskReport(detail);
              } catch {
                message.error('Không tải được chi tiết báo cáo');
                setOpenView(false);
              } finally {
                setViewLoading(false);
              }
            }}
            title="Xem chi tiết"
          >
            <Eye size={16} className="text-gray-800 cursor-pointer" />
          </button>
        </div>
      ),
    },
  ];

  const canPickSession = filterRequestId !== 'all';

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">
            Quản lý task report
          </h2>
          <p className="text-xs text-gray-500">
            Xem danh sách task report và lọc theo yêu cầu / buổi
          </p>
        </div>

        <Badge className="bg-blue-50 text-blue-700">
          {taskReportsLoading ? 'Đang tải...' : `${totalItems} task`}
        </Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-4">
        <div className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Danh sách yêu cầu</h3>
            <Badge className="bg-slate-100 text-slate-700 border border-slate-200">
              {requestsLoading ? '...' : `${requests.length}`}
            </Badge>
          </div>

          <HoverSearch
            placeholder="Tìm yêu cầu..."
            value={requestKeyword}
            onChange={setRequestKeyword}
          />

          <div className="grid grid-cols-1 gap-2">
            <input
              type="date"
              value={requestStartAt}
              onChange={(e) => {
                setRequestStartAt(e.target.value);
                setPageNumber(1);
              }}
              className="h-9 rounded-md border border-input bg-white px-3 text-sm text-gray-700"
              title="Lọc startAt của yêu cầu"
            />
            <input
              type="date"
              value={requestEndAt}
              onChange={(e) => {
                setRequestEndAt(e.target.value);
                setPageNumber(1);
              }}
              className="h-9 rounded-md border border-input bg-white px-3 text-sm text-gray-700"
              title="Lọc endAt của yêu cầu"
            />
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => {
                setFilterRequestId('all');
                setFilterSessionId('all');
                setPageNumber(1);
              }}
              className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                filterRequestId === 'all'
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
              }`}
            >
              Tất cả yêu cầu
            </button>

            {requestListFiltered.map((r) => (
              <button
                key={r.requestId}
                type="button"
                onClick={() => {
                  setFilterRequestId(String(r.requestId));
                  setFilterSessionId('all');
                  setPageNumber(1);
                }}
                className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                  filterRequestId === String(r.requestId)
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                }`}
                title={r.requestName}
              >
                <div className="font-medium truncate">
                  {r.requestCode ? `[${r.requestCode}] ` : ''}
                  {r.requestName}
                </div>
              </button>
            ))}

            {!requestsLoading && requestListFiltered.length === 0 && (
              <div className="text-xs text-gray-500 px-1">Không có yêu cầu phù hợp.</div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-end gap-3 mb-2">
            <HoverSearch
              placeholder="Tìm theo tên..."
              value={filterTitle}
              onChange={(v) => {
                setFilterTitle(v);
                setPageNumber(1);
              }}
            />

            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => {
                setFilterStartDate(e.target.value);
                setPageNumber(1);
              }}
              className="h-9 rounded-md border border-input bg-white px-3 text-sm text-gray-700"
              title="Lọc theo ngày bắt đầu"
            />

            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => {
                setFilterEndDate(e.target.value);
                setPageNumber(1);
              }}
              className="h-9 rounded-md border border-input bg-white px-3 text-sm text-gray-700"
              title="Lọc theo ngày kết thúc"
            />

            <Select
              value={filterSessionId}
              onValueChange={(v) => {
                setFilterSessionId(v);
                setPageNumber(1);
              }}
              disabled={!canPickSession || requestDetailLoading}
            >
              <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[240px]">
                <SelectValue
                  placeholder={
                    !canPickSession
                      ? 'Chọn yêu cầu bên trái'
                      : requestDetailLoading
                        ? 'Đang tải buổi...'
                        : 'Chọn buổi'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả buổi</SelectItem>
                {sessionsForSelectedRequest.map((s) => (
                  <SelectItem key={s.sessionId} value={String(s.sessionId)}>
                    Buổi {s.sessionNo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="secondary"
              className="bg-white"
              onClick={resetFilters}
              title="Đặt lại bộ lọc"
            >
              <RotateCcw />
            </Button>

            <Button
              variant={onlyPendingExpense ? 'default' : 'secondary'}
              className={onlyPendingExpense ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-white'}
              onClick={() => {
                setOnlyPendingExpense((prev) => !prev);
                setPageNumber(1);
              }}
              title="Chỉ hiện task có expense đang chờ duyệt"
            >
              Chờ duyệt
            </Button>
          </div>

          <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
            <DataTable
              columns={columns}
              data={filteredTaskReports}
              pageNumber={pageNumber}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={(page) => setPageNumber(page)}
            />
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
        title="Chi tiết task report"
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
                    ? sessionLabelById.get(viewTaskReport.sessionId) ??
                      `Buổi ${viewTaskReport.sessionId}`
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Thời gian bắt đầu</div>
                <div>
                  {viewTaskReport.startAt
                    ? new Date(viewTaskReport.startAt).toLocaleString()
                    : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Thời gian kết thúc</div>
                <div>
                  {viewTaskReport.endAt
                    ? new Date(viewTaskReport.endAt).toLocaleString()
                    : '—'}
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
                      className="rounded-xl border bg-white px-4 py-3 shadow-sm"
                    >
                      <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 items-start">
                        <div className="min-w-0">
                          <div className="text-xs text-gray-500 mb-0.5">
                            Khoản chi #{e.expenseId}
                          </div>
                          <div className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-5">
                            {e.description || '—'}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[11px] text-gray-500 mb-0.5">Số tiền</div>
                          <div className="text-sm font-semibold tabular-nums whitespace-nowrap text-red-600">
                            {e.amount != null ? e.amount.toLocaleString('vi-VN') : '—'}
                          </div>
                        </div>

                        <div className="col-span-2 flex items-center justify-between gap-3 pt-1">
                          <div>
                            {(() => {
                              const info = getExpenseStatusInfo(e.status);
                              return <Badge className={info.className}>{info.label}</Badge>;
                            })()}
                          </div>

                          {getExpenseStatusInfo(e.status).code === EXPENSE_STATUS.PENDING ? (
                            <div className="flex items-center gap-2">
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
                      </div>
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

            // Refresh detail to update expense status
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
        okText="Đồng ý từ chối"
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

