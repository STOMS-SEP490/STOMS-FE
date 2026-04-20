import { useMemo, useRef, useState, useCallback } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Funnel, ChevronRight, FileText, PlusCircle, X, Wallet, Plus, ImageIcon } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { DatePicker, message } from 'antd';
import type { Dayjs } from 'dayjs';
import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Dialog } from '@/shared/components/ui/dialog';
import type { TeachingHistoryItem } from '@/modules/contract/teachingHistory';
import { sessionDisplayName } from '@/modules/contract/teachingHistory';
import CreateContractModal from './CreateContractModal';
import { useNavigate } from 'react-router-dom';
import contractApi from '../api/contractApi';
import type { ContractListItem } from '../contract';
import ContractDetailSidebar from './ContractDetailSidebar';
import { useTeacherTeachingHistory } from '@/modules/contract/hooks/useTeacherTeachingHistory';
import sessionApi from '@/modules/request/api/sessionApi';
import requestApi from '@/modules/request/api/requestApi';
import type { RequestListItem, RequestSessionSummary } from '@/modules/request/request';
import TeamLeaderSessionDetailPanel from '@/modules/request/pages/TeamLeaderSessionDetailPanel';
import { taskReportApi } from '@/modules/task-report/api/taskReportApi';

function formatDate(value?: string) {
  if (!value) return '—';
  return dayjs(value).locale('vi').format('DD/MM/YYYY');
}

function formatTimeRange(start?: string, end?: string) {
  if (!start || !end) return '—';
  return `${dayjs(start).format('HH:mm')} - ${dayjs(end).format('HH:mm')}`;
}

export default function TeacherTeachingHistoryPage() {
  const navigate = useNavigate();
  const {
    items,
    loading,
    pageNumber,
    pageSize,
    totalItems,
    search,
    hasContract,
    reportsBySession,
    setPageNumber,
    setSearch,
    setHasContract,
    refetch,
  } = useTeacherTeachingHistory({ pageSize: 10 });

  const [createOpen, setCreateOpen] = useState(false);
  const [createSessionId, setCreateSessionId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailContract, setDetailContract] = useState<ContractListItem | null>(null);
  const [detailRoleLabel, setDetailRoleLabel] = useState<string | null>(null);

  const [sessionDetailOpen, setSessionDetailOpen] = useState(false);
  const [sessionDetailLoading, setSessionDetailLoading] = useState(false);
  const [sessionDetailError, setSessionDetailError] = useState<string | null>(null);
  const [sessionDetailRequest, setSessionDetailRequest] = useState<RequestListItem | null>(null);
  const [sessionDetailSession, setSessionDetailSession] = useState<
    (RequestSessionSummary & { location?: string | null; isOnline?: boolean | null }) | null
  >(null);
  const [sessionDetailContract, setSessionDetailContract] = useState<TeachingHistoryItem['contract'] | null>(null);
  const [sessionDetailRoleLabel, setSessionDetailRoleLabel] = useState<string | null>(null);
  const [sessionDetailItemSnapshot, setSessionDetailItemSnapshot] = useState<TeachingHistoryItem | null>(null);
  const sessionDetailFetchSeq = useRef(0);

  // ── Create Task Report Modal ──
  const [createReportOpen, setCreateReportOpen] = useState(false);
  const [createReportSessionId, setCreateReportSessionId] = useState<number | null>(null);
  const [reportFormState, setReportFormState] = useState({ title: '', description: '', startAt: '', endAt: '' });
  const [hasExpense, setHasExpense] = useState(false);
  const [createExpenses, setCreateExpenses] = useState<Array<{
    key: string;
    amount: string;
    description: string;
    file: File | null;
    preview: string;
  }>>([]);
  const [savingReport, setSavingReport] = useState(false);

  const createEmptyExpense = useCallback(
    () => ({
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
    (key: string, patch: Partial<typeof createExpenses[0]>) => {
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

  const openCreateReportModal = useCallback((sessionId: number) => {
    setCreateReportSessionId(sessionId);
    setReportFormState({ title: '', description: '', startAt: '', endAt: '' });
    setHasExpense(false);
    setCreateExpenses([]);
    setCreateReportOpen(true);
  }, []);

  const closeCreateReportModal = useCallback(() => {
    setCreateReportOpen(false);
    setCreateReportSessionId(null);
    setReportFormState({ title: '', description: '', startAt: '', endAt: '' });
    setHasExpense(false);
    setCreateExpenses([]);
  }, []);

  const handleSaveReport = useCallback(async () => {
    if (!reportFormState.title.trim() || !reportFormState.description.trim()) {
      message.warning('Vui lòng nhập tiêu đề và mô tả.');
      return;
    }

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

    setSavingReport(true);
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

      await taskReportApi.create({
        sessionId: createReportSessionId,
        title: reportFormState.title.trim(),
        description: reportFormState.description.trim(),
        startAt: reportFormState.startAt || null,
        endAt: reportFormState.endAt || null,
        ...(expensesInput && paymentImages ? { expenses: expensesInput, paymentImages } : {}),
      });
      
      message.success('Đã tạo báo cáo.');
      closeCreateReportModal();
      void refetch();
    } catch (err) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Lưu thất bại.';
      message.error(msg);
    } finally {
      setSavingReport(false);
    }
  }, [reportFormState, createReportSessionId, hasExpense, createExpenses, closeCreateReportModal, refetch]);

  const sessionDetailHeading = useMemo(() => {
    const req = sessionDetailRequest;
    const fromReq = (req?.requestName ?? '').trim() || req?.requestCode || '';
    if (fromReq) return fromReq;
    const snap = sessionDetailItemSnapshot;
    if (snap) {
      const fromRow = (snap.request?.requestName ?? '').trim() || snap.request?.requestCode || '';
      if (fromRow) return fromRow;
      return sessionDisplayName(snap) || '—';
    }
    return '—';
  }, [sessionDetailRequest, sessionDetailItemSnapshot]);

  const closeSessionDetail = () => {
    sessionDetailFetchSeq.current += 1;
    setSessionDetailOpen(false);
    setSessionDetailLoading(false);
    setSessionDetailError(null);
    setSessionDetailRequest(null);
    setSessionDetailSession(null);
    setSessionDetailContract(null);
    setSessionDetailRoleLabel(null);
    setSessionDetailItemSnapshot(null);
  };

  const openSessionDetail = async (item: TeachingHistoryItem) => {
    sessionDetailFetchSeq.current += 1;
    const seq = sessionDetailFetchSeq.current;

    setSessionDetailItemSnapshot(item);
    setSessionDetailOpen(true);
    setSessionDetailLoading(true);
    setSessionDetailError(null);
    setSessionDetailRequest(null);
    setSessionDetailSession(null);
    setSessionDetailContract(item.contract ?? null);

    const rawRole = String(item.role || '');
    const normalized = rawRole.toLowerCase();
    setSessionDetailRoleLabel(normalized.includes('ta') || normalized.includes('trợ') ? 'Sinh viên' : 'Giáo viên');

    try {
      const s = await sessionApi.getById(item.sessionId);
      if (seq !== sessionDetailFetchSeq.current) return;

      const req = await requestApi.getById(s.RequestId);
      if (seq !== sessionDetailFetchSeq.current) return;

      setSessionDetailRequest(req);
      setSessionDetailSession({
        sessionId: s.SessionId,
        requestId: s.RequestId,
        sessionNo: s.SessionNo,
        startAt: s.StartAt,
        endAt: s.EndAt,
        teachersRequired: s.TeachersRequired ?? null,
        tasRequired: s.TasRequired ?? null,
        reservationId: s.ReservationId ?? null,
        teamAssigned: (s.TeamSessions ?? []).length > 0,
        location: s.Location ?? null,
        isOnline: s.IsOnline ?? null,
        notes: (s.Notes ?? '') as any,
        status: (s.Status ?? '') as any,
      } as unknown as RequestSessionSummary & { location?: string | null; isOnline?: boolean | null });
    } catch (err: unknown) {
      if (seq !== sessionDetailFetchSeq.current) return;
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Không tải được chi tiết buổi.';
      setSessionDetailError(msg);
    } finally {
      if (seq !== sessionDetailFetchSeq.current) return;
      setSessionDetailLoading(false);
    }
  };

  const columns: ColumnDef<TeachingHistoryItem>[] = useMemo(() => {
    const base: ColumnDef<TeachingHistoryItem>[] = [
      {
        id: 'request',
        header: 'Yêu cầu',
        cell: ({ row }) => {
          const name = row.original.request?.requestName;
          const code = row.original.request?.requestCode;
          return (
            <div className="min-w-0">
              <p className="font-medium text-[#1a7a99] break-words whitespace-normal">{name ?? '—'}</p>
              {code && <p className="text-[11px] text-slate-500">{code}</p>}
            </div>
          );
        },
      },
      {
        id: 'sessionNo',
        header: 'Buổi',
        cell: ({ row }) => (
          <span className="font-semibold text-[#1a7a99]">Buổi {row.original.sessionNo}</span>
        ),
      },
      {
        id: 'title',
        header: 'Tên buổi',
        cell: ({ row }) => {
          const title = sessionDisplayName(row.original) || '—';
          return <span className="text-slate-700 break-words whitespace-normal">{title}</span>;
        },
      },
      {
        id: 'date',
        header: 'Ngày',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-slate-700">
            {formatDate(row.original.startAt)}
          </span>
        ),
      },
      {
        id: 'time',
        header: 'Giờ',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-slate-500">
            {formatTimeRange(row.original.startAt, row.original.endAt)}
          </span>
        ),
      },
      {
        id: 'location',
        header: 'Địa điểm',
        cell: ({ row }) => (
          <span className="text-xs text-slate-600 break-words whitespace-normal">
            {row.original.location || '—'}
          </span>
        ),
      },
      {
        id: 'contract',
        header: () => <span className="block text-center">Hợp đồng</span>,
        cell: ({ row }) => {
          const hasContract = !!row.original.contract?.contractId;
          const code = row.original.contract?.contractCode || 'Hợp đồng';
          if (hasContract) {
            const isPaid = row.original.contract?.isPaid ?? null;
            const paidClass =
              isPaid === true
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : isPaid === false
                  ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100';
            return (
              <div className="text-center">
                <button
                  type="button"
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold whitespace-nowrap ${paidClass}`}
                  onClick={async () => {
                    try {
                      const rawRole = String(row.original.role || '');
                      const normalized = rawRole.toLowerCase();
                      const roleLabel =
                        normalized.includes('ta') || normalized.includes('trợ')
                          ? 'Sinh viên'
                          : 'Giáo viên';
                      setDetailRoleLabel(roleLabel);
                      const full = await contractApi.getById(row.original.contract!.contractId);
                      setDetailContract(full);
                      setDetailOpen(true);
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                >
                  <FileText className="h-3.5 w-3.5" />
                  {code}
                </button>
              </div>
            );
          }
          return (
            <div className="text-center">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 whitespace-nowrap"
                onClick={() => {
                  setCreateSessionId(row.original.sessionId);
                  setCreateOpen(true);
                }}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Tạo
              </button>
            </div>
          );
        },
      },
      {
        id: 'report',
        header: () => <span className="block text-center">Báo cáo</span>,
        cell: ({ row }) => {
          const hasReport = !!reportsBySession[row.original.sessionId]?.length;
          return (
            <div className="text-center">
              {hasReport ? (
                <button
                  type="button"
                  onClick={() => navigate(`/teacher/tasks/${row.original.sessionId}`)}
                  className="inline-flex items-center text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-100 rounded-full px-3 py-1 hover:bg-violet-100 transition-colors"
                >
                  Xem báo cáo
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700 hover:bg-violet-100 whitespace-nowrap"
                  onClick={() => navigate(`/teacher/tasks/${row.original.sessionId}`)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tạo
                </button>
              )}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: () => <span className="block text-center">Thao tác</span>,
        cell: ({ row }) => (
          <div className="text-center">
            <button
              type="button"
              onClick={() => void openSessionDetail(row.original)}
              className="inline-flex items-center gap-0.5 text-sm font-medium text-sky-600 underline-offset-2 hover:text-sky-800 hover:underline whitespace-nowrap"
            >
              Chi tiết <ChevronRight className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            </button>
          </div>
        ),
      },
    ];

    return base;
  }, [reportsBySession, openCreateReportModal]);

  return (
    <div
      className="relative flex min-h-0 flex-col gap-3 overflow-hidden app-page-bg p-6 pl-8"
      style={{ height: 'var(--content-height, 100vh)' }}
    >
      {sessionDetailOpen && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="flex-1 bg-black/30" onClick={closeSessionDetail} aria-hidden />

          <div className="w-full h-full bg-white text-black shadow-2xl flex flex-col overflow-hidden max-w-2xl border-l">
            <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
              <div className="min-w-0">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Chi tiết buổi</p>
                <h2 className="text-lg font-bold text-slate-900 truncate">{sessionDetailHeading}</h2>
                {sessionDetailRequest?.requestCode ? (
                  <div className="text-xs text-slate-500 mt-1 truncate">
                    {sessionDetailRequest.requestCode}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={closeSessionDetail}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                aria-label="Đóng chi tiết buổi"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-0 space-y-4">
              {sessionDetailLoading && <p className="text-xs text-gray-500">Đang tải chi tiết buổi...</p>}

              {sessionDetailError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl">
                  {sessionDetailError}
                </p>
              )}

              {sessionDetailRequest && sessionDetailSession && !sessionDetailLoading && !sessionDetailError && (
                <>
                  <TeamLeaderSessionDetailPanel
                    session={sessionDetailSession}
                    requestCode={sessionDetailRequest.requestCode ?? ''}
                    requestName={sessionDetailRequest.requestName ?? ''}
                  />

                  <div className="rounded-2xl bg-white shadow-sm border border-gray-100">
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <h3 className="font-semibold text-[#1a7a99] text-sm">Hợp đồng</h3>
                    </div>
                    <div className="px-4 py-3 text-sm space-y-2">
                      {sessionDetailContract?.contractId ? (
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-[#1a7a99] truncate">
                              {sessionDetailContract.contractCode || 'Hợp đồng'}
                            </div>
                            <div className="text-xs text-slate-500">
                              Trạng thái:{' '}
                              {sessionDetailContract.isPaid === true
                                ? 'Đã thanh toán'
                                : sessionDetailContract.isPaid === false
                                  ? 'Chưa thanh toán'
                                  : '—'}
                              {sessionDetailContract.amount != null
                                ? ` • Số tiền: ${sessionDetailContract.amount}`
                                : ''}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                            onClick={async () => {
                              try {
                                const full = await contractApi.getById(sessionDetailContract.contractId);
                                const role = sessionDetailRoleLabel;
                                closeSessionDetail();
                                setDetailRoleLabel(role);
                                setDetailContract(full);
                                setDetailOpen(true);
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Xem hợp đồng
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-500">Chưa có hợp đồng cho buổi này.</span>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 whitespace-nowrap"
                            onClick={() => {
                              setCreateSessionId(sessionDetailSession.sessionId);
                              setCreateOpen(true);
                            }}
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            Tạo hợp đồng
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-white/60">
          <span className="text-sm text-slate-500">Đang tải danh sách buổi đã dạy...</span>
        </div>
      )}

      {/* HEADER: tiêu đề + tìm kiếm / lọc cùng một thẻ như attendance-history */}
      <div className="flex shrink-0 flex-col gap-4 rounded-xl border bg-white px-6 py-4 shadow-sm min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-[#1a7a99]">Danh sách buổi đã dạy</h2>
          <p className="text-xs text-gray-500">Các buổi bạn đã dạy cùng trạng thái hợp đồng.</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 min-[900px]:gap-3">
          <HoverSearch
            value={search}
            onChange={(v) => {
              setPageNumber(1);
              setSearch(v);
            }}
            placeholder="Tìm theo tên buổi..."
          />
          <Select
            value={hasContract}
            onValueChange={(v) => {
              setPageNumber(1);
              setHasContract(v as typeof hasContract);
            }}
          >
            <SelectTrigger className="h-9 w-[160px] border-slate-200 bg-white text-sm">
              <SelectValue placeholder="Lọc hợp đồng" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="yes">Có hợp đồng</SelectItem>
              <SelectItem value="no">Chưa có hợp đồng</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            className="h-9 border-slate-200 px-3 text-slate-700"
            onClick={() => {
              setSearch('');
              setHasContract('all');
              setPageNumber(1);
            }}
          >
            <Funnel className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Bảng kéo giãn theo chiều cao màn hình, giữ padding ô mặc định (không comfortable) */}
      <div className="flex min-h-0 flex-1 flex-col rounded-xl border bg-white px-6 py-4 shadow-sm">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <DataTable
            columns={columns}
            data={items}
            pageNumber={pageNumber}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={(p) => setPageNumber(p)}
            fillHeight
            tableGap="tight"
            showPagination
          />
        </div>
      </div>

      <CreateContractModal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setCreateSessionId(null);
        }}
        onCreated={() => {
          setCreateOpen(false);
          setCreateSessionId(null);
          setPageNumber(1);
          void refetch();
        }}
        initialSessionId={createSessionId}
      />

      <ContractDetailSidebar
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailContract(null);
          setDetailRoleLabel(null);
        }}
        contract={detailContract}
        roleLabel={detailRoleLabel ?? undefined}
      />

      {/* Create Task Report Modal */}
      <Dialog
        open={createReportOpen}
        onClose={closeCreateReportModal}
        title="Tạo báo cáo công việc"
        description="Điền thông tin báo cáo công việc cho buổi này."
        className="max-w-2xl"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Thời gian bắt đầu</label>
              <DatePicker
                showTime
                format="DD/MM/YYYY HH:mm"
                className="w-full [&_.ant-picker-input>input]:text-black"
                value={reportFormState.startAt ? dayjs(reportFormState.startAt) : null}
                onChange={(d: Dayjs | null) => setReportFormState((p) => ({ ...p, startAt: d ? d.toISOString() : '' }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Thời gian kết thúc</label>
              <DatePicker
                showTime
                format="DD/MM/YYYY HH:mm"
                className="w-full [&_.ant-picker-input>input]:text-black"
                value={reportFormState.endAt ? dayjs(reportFormState.endAt) : null}
                onChange={(d: Dayjs | null) => setReportFormState((p) => ({ ...p, endAt: d ? d.toISOString() : '' }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tiêu đề *</label>
            <input
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Ví dụ: Chuẩn bị bài, Giảng phần 1..."
              value={reportFormState.title}
              onChange={(e) => setReportFormState((p) => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Mô tả *</label>
            <textarea
              className="w-full min-h-[80px] resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Nội dung công việc đã làm..."
              value={reportFormState.description}
              onChange={(e) => setReportFormState((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          {/* Expense section */}
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
                  <div key={exp.key} className="rounded-lg bg-slate-50 p-3 space-y-2">
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
                      className="w-full rounded-lg border-0 bg-white px-3 py-1.5 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2197C0]"
                      placeholder="Số tiền (VNĐ)"
                      value={exp.amount}
                      onChange={(e) => updateCreateExpense(exp.key, { amount: e.target.value.replace(/\D/g, '') })}
                    />
                    <input
                      className="w-full rounded-lg border-0 bg-white px-3 py-1.5 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2197C0]"
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
                            className="absolute top-1 right-1 rounded-full bg-white/90 p-0.5 text-slate-600 hover:text-rose-600 shadow"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-3 py-3 text-xs text-slate-500 hover:border-[#2197C0] hover:text-[#2197C0] transition-colors">
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
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#2197C0]/50 py-2 text-xs font-medium text-[#2197C0] hover:bg-[#2197C0]/5 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Thêm khoản chi
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={closeCreateReportModal} disabled={savingReport}>
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
              onClick={() => void handleSaveReport()}
              disabled={savingReport}
            >
              {savingReport ? 'Đang lưu...' : 'Tạo báo cáo'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

