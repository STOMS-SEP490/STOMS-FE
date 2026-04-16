import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CalendarDays, FileText, MapPin, ReceiptText, RotateCcw, X } from 'lucide-react';
import { Drawer, Image, Input, Modal, message, Spin, DatePicker } from 'antd';
import dayjs from 'dayjs';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
import { DataTable } from '@/shared/components/common/DataTable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import type { ColumnDef } from '@tanstack/react-table';

import { taskReportApi } from '../api/taskReportApi';
import type { TaskReport, TaskReportExpense } from '../taskReport';
import sessionApi from '@/modules/request/api/sessionApi';
import type { SessionResponse } from '@/modules/request/session.types';
import { expenseApi } from '@/modules/transaction/api/expenseApi';
import { walletApi } from '@/modules/transaction/api/walletApi';
import type { WalletListItem } from '@/modules/transaction/api/walletApi';
import { EXPENSE_STATUS, getExpenseStatusInfo } from '@/constants/status';

const PAGE_SIZE = 15;

export default function TaskReportsManagement() {
  // ── filters ──
  const [search, setSearch] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [pageNumber, setPageNumber] = useState(1);

  // ── selected session → right panel ──
  const [selectedSession, setSelectedSession] = useState<SessionResponse | null>(null);
  const [sessionTaskReports, setSessionTaskReports] = useState<TaskReport[]>([]);
  const [sessionTaskReportsLoading, setSessionTaskReportsLoading] = useState(false);

  // ── task report detail drawer ──
  const [openView, setOpenView] = useState(false);
  const [viewTaskReport, setViewTaskReport] = useState<TaskReport | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  // ── expense approve/reject ──
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveExpenseId, setApproveExpenseId] = useState<number | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [wallets, setWallets] = useState<WalletListItem[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectExpenseId, setRejectExpenseId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // ── fetch sessions ──
  const { data: sessionsPaged, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sessions-tasks', pageNumber, search.trim(), filterStartDate, filterEndDate],
    queryFn: () =>
      sessionApi.getFilter({
        PageNumber: pageNumber,
        PageSize: PAGE_SIZE,
        Statuses: [9],
        StartAt: filterStartDate ? `${filterStartDate}T00:00:00` : undefined,
        EndAt: filterEndDate ? `${filterEndDate}T23:59:59` : undefined,
      }),
    staleTime: 30_000,
  });

  const sessions = useMemo(() => sessionsPaged?.Items ?? [], [sessionsPaged]);
  const totalItems = sessionsPaged?.TotalItems ?? 0;

  // client-side search by request name / session no
  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((s) => {
      const reqName = String(s.Request?.RequestName ?? '').toLowerCase();
      const reqCode = String(s.Request?.RequestCode ?? '').toLowerCase();
      const loc = String(s.Location ?? '').toLowerCase();
      return reqName.includes(q) || reqCode.includes(q) || loc.includes(q);
    });
  }, [sessions, search]);

  // ── fetch task reports for selected session ──
  const fetchSessionTaskReports = useCallback(async (sessionId: number) => {
    setSessionTaskReportsLoading(true);
    try {
      const res = await taskReportApi.getAll({ sessionId, pageNumber: 1, pageSize: 100 });
      setSessionTaskReports(res.items ?? []);
    } catch (err) {
      message.error(getErrorMessage(err));
      setSessionTaskReports([]);
    } finally {
      setSessionTaskReportsLoading(false);
    }
  }, []);

  const handleSelectSession = useCallback(
    (session: SessionResponse) => {
      setSelectedSession(session);
      void fetchSessionTaskReports(session.SessionId);
    },
    [fetchSessionTaskReports],
  );

  // ── fetch wallets when approve modal opens ──
  useEffect(() => {
    if (!approveModalOpen) return;
    const fetch = async () => {
      setWalletsLoading(true);
      try {
        const res = await walletApi.getWallets({ pageNumber: 1, pageSize: 500 });
        setWallets(res.items ?? []);
        if (!selectedWalletId && (res.items?.length ?? 0) > 0) {
          setSelectedWalletId(String((res.items ?? [])[0].walletId));
        }
      } finally {
        setWalletsLoading(false);
      }
    };
    void fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveModalOpen]);

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
    (r.expenses ?? []).filter((e) => getExpenseStatusInfo(e.status).code === EXPENSE_STATUS.PENDING).length;

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('vi-VN');
  };

  const resetFilters = () => {
    setSearch('');
    setFilterStartDate('');
    setFilterEndDate('');
    setPageNumber(1);
  };

  // ── columns ──
  const columns = useMemo<ColumnDef<SessionResponse>[]>(
    () => [
      {
        id: 'sessionNo',
        header: 'Buổi',
        cell: ({ row }) => (
          <span className="font-semibold text-slate-900">Buổi {row.original.SessionNo}</span>
        ),
      },
      {
        id: 'title',
        header: 'Tiêu đề',
        cell: ({ row }) => {
          const title = row.original.SubjectSession?.Title ?? row.original.EventSession?.Title ?? row.original.Notes ?? '—';
          return <span className="text-slate-700 break-words whitespace-normal">{title}</span>;
        },
      },
      {
        id: 'request',
        header: 'Yêu cầu',
        cell: ({ row }) => {
          const name = row.original.Request?.RequestName;
          const code = row.original.Request?.RequestCode;
          return (
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900 max-w-[200px]">{name ?? '—'}</p>
              {code && <p className="text-[11px] text-slate-500">{code}</p>}
            </div>
          );
        },
      },
      {
        id: 'date',
        header: 'Ngày',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-slate-700">
            {row.original.StartAt ? dayjs(row.original.StartAt).format('DD/MM/YYYY') : '—'}
          </span>
        ),
      },
      {
        id: 'time',
        header: 'Giờ',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-slate-500">
            {row.original.StartAt && row.original.EndAt
              ? `${dayjs(row.original.StartAt).format('HH:mm')} – ${dayjs(row.original.EndAt).format('HH:mm')}`
              : '—'}
          </span>
        ),
      },
      {
        id: 'location',
        header: 'Địa điểm',
        cell: ({ row }) => (
          <span className="text-xs text-slate-600 break-words whitespace-normal">
            {row.original.Location || '—'}
          </span>
        ),
      },
      {
        id: 'taskReports',
        header: () => <span className="block text-center">Báo cáo</span>,
        cell: ({ row }) => {
          const count = (row.original.TaskReports as unknown[] | null | undefined)?.length ?? 0;
          return (
            <div className="text-center">
              {count > 0
                ? <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100">{count}</Badge>
                : <span className="text-xs text-slate-400">—</span>}
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <div
      className="flex flex-col gap-4 overflow-hidden app-page-bg p-6 pl-8"
      style={{ height: 'var(--content-height, 100vh)' }}
    >
      {/* HEADER */}
      <div className="flex shrink-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-black">Quản lý báo cáo công việc</h2>
          <p className="text-xs text-gray-500">Xem danh sách buổi học, click vào buổi để xem báo cáo công việc.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HoverSearch placeholder="Tìm theo tên yêu cầu, địa điểm..." value={search} onChange={(v) => { setSearch(v); setPageNumber(1); }} />
          <DatePicker
            format="DD/MM/YYYY"
            placeholder="Từ ngày"
            value={filterStartDate ? dayjs(filterStartDate) : null}
            onChange={(d) => { setFilterStartDate(d ? d.format('YYYY-MM-DD') : ''); setPageNumber(1); }}
            className="w-[140px]"
          />
          <span className="text-gray-400">→</span>
          <DatePicker
            format="DD/MM/YYYY"
            placeholder="Đến ngày"
            value={filterEndDate ? dayjs(filterEndDate) : null}
            onChange={(d) => { setFilterEndDate(d ? d.format('YYYY-MM-DD') : ''); setPageNumber(1); }}
            className="w-[140px]"
          />
          <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200 bg-white" onClick={resetFilters}>
            <RotateCcw size={16} />
          </Button>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* TABLE */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {sessionsLoading ? (
            <div className="flex flex-1 items-center justify-center py-16"><Spin /></div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredSessions}
              pageNumber={pageNumber}
              pageSize={PAGE_SIZE}
              totalItems={totalItems}
              onPageChange={setPageNumber}
              onRowClick={handleSelectSession}
              comfortable
              fillHeight
              tableGap="tight"
            />
          )}
        </div>

        {/* RIGHT PANEL */}
        {selectedSession && (
          <div className="flex w-[380px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* panel header */}
            <div className="shrink-0 border-b border-slate-200 px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    Buổi {selectedSession.SessionNo} — {selectedSession.Request?.RequestName ?? '—'}
                  </p>
                  <div className="mt-0.5 flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <CalendarDays size={11} />
                      {selectedSession.StartAt ? dayjs(selectedSession.StartAt).format('DD/MM/YYYY HH:mm') : '—'}
                    </span>
                    {selectedSession.Location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />
                        {selectedSession.Location}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSession(null)}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* task reports list */}
            <div className="no-scrollbar flex-1 overflow-y-auto p-3 space-y-2">
              {sessionTaskReportsLoading ? (
                <div className="flex justify-center py-8"><Spin /></div>
              ) : sessionTaskReports.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                  <FileText className="text-slate-300" size={24} />
                  <p className="text-sm text-slate-500">Chưa có báo cáo nào cho buổi này.</p>
                </div>
              ) : (
                sessionTaskReports.map((r) => {
                  const pendingN = pendingCountForReport(r);
                  const expenses = r.expenses ?? [];
                  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount ?? 0), 0);
                  return (
                    <button
                      key={r.taskReportId}
                      type="button"
                      onClick={() => void openTaskDetail(r.taskReportId)}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900 truncate">{r.title || 'Báo cáo công việc'}</p>
                        {pendingN > 0 && (
                          <Badge className="shrink-0 bg-amber-100 text-[10px] text-amber-800 flex items-center gap-1">
                            <AlertCircle size={10} />
                            {pendingN} chờ duyệt
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500">{r.member?.fullName ?? '—'}</p>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <ReceiptText size={11} />
                          {expenses.length} khoản chi
                        </span>
                        <span className="font-medium text-slate-700">{totalAmount.toLocaleString('vi-VN')} đ</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* DETAIL DRAWER */}
      <Drawer
        open={openView}
        onClose={() => setOpenView(false)}
        placement="right"
        width={600}
        title="Chi tiết báo cáo công việc"
      >
        {viewLoading ? (
          <div className="flex items-center justify-center py-16"><Spin size="large" /></div>
        ) : viewTaskReport ? (
          <div className="space-y-4">
            <div>
              <div className="text-xs text-gray-500">Tiêu đề</div>
              <div className="font-medium">{viewTaskReport.title}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Mô tả</div>
              <div className="whitespace-pre-wrap text-sm">{viewTaskReport.description}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-gray-500">Người báo cáo</div>
                <div>{viewTaskReport.member?.fullName ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Thời gian tạo</div>
                <div>{formatDateTime(viewTaskReport.createdAt)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Bắt đầu</div>
                <div>{formatDateTime(viewTaskReport.startAt)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Kết thúc</div>
                <div>{formatDateTime(viewTaskReport.endAt)}</div>
              </div>
            </div>

            <div className="pt-2">
              <div className="text-sm font-semibold mb-2">Khoản chi</div>
              {((viewTaskReport.expenses ?? []) as TaskReportExpense[]).length === 0 ? (
                <div className="text-sm text-gray-500">Không có khoản chi.</div>
              ) : (
                <div className="space-y-2">
                  {(viewTaskReport.expenses ?? []).map((e) => {
                    const info = getExpenseStatusInfo(e.status);
                    const code = info.code;
                    const paymentImg = String(e.paymentImg ?? '').trim();
                    return (
                      <div key={e.expenseId} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-slate-700">Khoản chi #{e.expenseId}</span>
                              <Badge className={info.className}>{info.label}</Badge>
                            </div>
                            <div className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">{e.description || '—'}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[11px] text-slate-500">Số tiền</div>
                            <div className="text-sm font-semibold text-red-600 tabular-nums">
                              {e.amount != null ? e.amount.toLocaleString('vi-VN') : '—'} đ
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[12px] text-slate-600">
                          <div>
                            <div className="text-[11px] text-slate-500">Thời gian tạo</div>
                            <div>{formatDateTime(e.createdAt)}</div>
                          </div>
                          <div>
                            <div className="text-[11px] text-slate-500">Thời gian duyệt</div>
                            <div>{formatDateTime(e.approvedAt)}</div>
                          </div>
                        </div>

                        {(paymentImg || code === EXPENSE_STATUS.PENDING) && (
                          <div className="flex items-start justify-between gap-3 pt-1">
                            {paymentImg ? (
                              <div>
                                <div className="mb-1 text-[11px] text-slate-500">Minh chứng</div>
                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                  <Image
                                    src={paymentImg}
                                    alt={`Minh chứng #${e.expenseId}`}
                                    className="!block !h-[96px] !w-[140px] object-cover"
                                    fallback=""
                                    preview={{ mask: <span className="text-xs">Xem ảnh</span> }}
                                  />
                                </div>
                              </div>
                            ) : <div />}

                            {code === EXPENSE_STATUS.PENDING && (
                              <div className="flex items-center gap-2 self-end">
                                <Button
                                  size="sm"
                                  className="bg-[#208aae] hover:bg-[#1a7090] text-white"
                                  disabled={actionLoading}
                                  onClick={() => { setApproveExpenseId(e.expenseId); setSelectedWalletId(''); setApproveModalOpen(true); }}
                                >
                                  Duyệt
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-200 text-red-600 hover:bg-red-50"
                                  disabled={actionLoading}
                                  onClick={() => { setRejectExpenseId(e.expenseId); setRejectReason(''); setRejectModalOpen(true); }}
                                >
                                  Từ chối
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">Không có dữ liệu.</div>
        )}
      </Drawer>

      {/* APPROVE MODAL */}
      <Modal
        title="Duyệt khoản chi"
        open={approveModalOpen}
        onCancel={() => { if (!actionLoading) { setApproveModalOpen(false); setApproveExpenseId(null); setSelectedWalletId(''); } }}
        okText="Đồng ý duyệt"
        cancelText="Hủy"
        confirmLoading={actionLoading}
        onOk={async () => {
          const walletId = Number(selectedWalletId);
          if (!approveExpenseId || !selectedWalletId || Number.isNaN(walletId) || walletId <= 0) {
            message.warning('Vui lòng chọn quỹ chi trả.');
            return;
          }
          try {
            setActionLoading(true);
            await expenseApi.approve({ walletId, expenseIds: [approveExpenseId] });
            message.success('Đã duyệt khoản chi.');
            setApproveModalOpen(false);
            setApproveExpenseId(null);
            setSelectedWalletId('');
            if (viewTaskReport?.taskReportId) {
              const updated = await taskReportApi.getById(viewTaskReport.taskReportId);
              setViewTaskReport(updated);
            }
          } catch (err) {
            message.error(getErrorMessage(err));
          } finally {
            setActionLoading(false);
          }
        }}
      >
        <div className="py-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Chọn quỹ chi trả <span className="text-red-500">*</span></label>
          {walletsLoading ? (
            <div className="text-sm text-gray-500">Đang tải danh sách quỹ...</div>
          ) : (
            <Select value={selectedWalletId || undefined} onValueChange={setSelectedWalletId}>
              <SelectTrigger className="w-full text-gray-700"><SelectValue placeholder="Chọn quỹ" /></SelectTrigger>
              <SelectContent className="z-[1100]">
                {wallets.map((w) => (
                  <SelectItem key={w.walletId} value={String(w.walletId)}>
                    {w.walletName} · {Number(w.balance ?? 0).toLocaleString('vi-VN')} đ
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </Modal>

      {/* REJECT MODAL */}
      <Modal
        title="Từ chối khoản chi"
        open={rejectModalOpen}
        onCancel={() => { if (!actionLoading) { setRejectModalOpen(false); setRejectExpenseId(null); setRejectReason(''); } }}
        okText="Xác nhận từ chối"
        cancelText="Hủy"
        confirmLoading={actionLoading}
        onOk={async () => {
          const reason = rejectReason.trim();
          if (!rejectExpenseId || !reason) { message.warning('Vui lòng nhập lý do từ chối.'); return; }
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
          } catch (err) {
            message.error(getErrorMessage(err));
          } finally {
            setActionLoading(false);
          }
        }}
      >
        <div className="py-2 space-y-2">
          <label className="block text-sm font-medium text-gray-700">Lý do từ chối <span className="text-red-500">*</span></label>
          <Input.TextArea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Nhập lý do từ chối..." rows={4} disabled={actionLoading} />
        </div>
      </Modal>
    </div>
  );
}
