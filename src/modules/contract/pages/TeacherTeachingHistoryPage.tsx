import { useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Funnel, MapPin, Globe, ChevronRight, FileText, PlusCircle, X } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import type { TeachingHistoryItem } from '@/modules/contract/teachingHistory';
import { sessionDisplayName } from '@/modules/contract/teachingHistory';
import CreateContractModal from './CreateContractModal';
import { useLocation, useNavigate } from 'react-router-dom';
import contractApi from '../api/contractApi';
import type { ContractListItem } from '../contract';
import ContractDetailSidebar from './ContractDetailSidebar';
import { useTeacherTeachingHistory } from '@/modules/contract/hooks/useTeacherTeachingHistory';
import sessionApi from '@/modules/request/api/sessionApi';
import requestApi from '@/modules/request/api/requestApi';
import type { RequestListItem, RequestSessionSummary } from '@/modules/request/request';
import TeamLeaderSessionDetailPanel from '@/modules/request/pages/TeamLeaderSessionDetailPanel';

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
  const location = useLocation();
  const staffBasePath = location.pathname.startsWith('/tl') ? '/tl' : '/teacher';
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
  } = useTeacherTeachingHistory({ pageSize: 8 });

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
          : 'Không tải được chi tiết phiên.';
      setSessionDetailError(msg);
    } finally {
      if (seq !== sessionDetailFetchSeq.current) return;
      setSessionDetailLoading(false);
    }
  };

  const columns: ColumnDef<TeachingHistoryItem>[] = useMemo(() => {
    const base: ColumnDef<TeachingHistoryItem>[] = [
      {
        id: 'datetime',
        header: 'NGÀY',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-900">
              {formatDate(row.original.startAt)}
            </span>
            <span className="text-xs text-slate-500">
              {formatTimeRange(row.original.startAt, row.original.endAt)}
            </span>
          </div>
        ),
      },
      {
        id: 'sessionName',
        header: 'PHIÊN',
        cell: ({ row }) => (
          <div className="min-w-0 max-w-[260px] md:max-w-[320px]">
            <div className="text-[13px] font-semibold text-slate-900 line-clamp-2">
              {row.original.request?.requestName || row.original.request?.requestCode || '—'}
            </div>
            <div className="text-[11px] text-slate-500">
              {sessionDisplayName(row.original) || '—'}
            </div>
          </div>
        ),
      },
      {
        id: 'request',
        header: 'YÊU CẦU',
        cell: ({ row }) => {
          const requestCode = row.original.request?.requestCode;
          if (!requestCode) {
            return <span className="text-xs text-slate-400">—</span>;
          }
          return (
            <div className="min-w-0 max-w-[180px]">
              <div className="text-xs text-slate-600 truncate">
                <span className="font-semibold text-slate-900">{requestCode}</span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'location',
        header: 'ĐỊA ĐIỂM',
        cell: ({ row }) => {
          const isOnline =
            row.original.isOnline === true ||
            String(row.original.location || '').toLowerCase().includes('online');
          return (
            <div className="flex items-start gap-2 max-w-[220px]">
              {isOnline ? (
                <Globe className="h-4 w-4 text-violet-500 mt-0.5" />
              ) : (
                <MapPin className="h-4 w-4 text-sky-600 mt-0.5" />
              )}
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-slate-900 truncate">
                  {row.original.location || '—'}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {isOnline ? 'Trực tuyến' : 'Trực tiếp'}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: 'contract',
        header: 'HỢP ĐỒNG',
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
            );
          }
          return (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 whitespace-nowrap"
              onClick={() => {
                setCreateSessionId(row.original.sessionId);
                setCreateOpen(true);
              }}
            >
              <PlusCircle className="h-3.5 w-3.5" />
            </button>
          );
        },
      },
      {
        id: 'report',
        header: 'BÁO CÁO',
        cell: ({ row }) => {
          const hasReport = !!reportsBySession[row.original.sessionId]?.length;
          if (hasReport) {
            return (
              <span className="inline-flex items-center text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-100 rounded-full px-3 py-1">
                Đã viết báo cáo
              </span>
            );
          }
          return (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-full border border-violet-200 bg-violet-50 w-7 h-7 text-violet-700 hover:bg-violet-100 text-lg leading-none"
              onClick={() => {
                const rid = row.original.request?.requestId;
                const sid = row.original.sessionId;
                const params = new URLSearchParams();
                if (rid != null) params.set('requestId', String(rid));
                if (sid != null) params.set('sessionId', String(sid));
                navigate(`${staffBasePath}/tasks?${params.toString()}`);
              }}
            >
              +
            </button>
          );
        },
      },
      {
        id: 'actions',
        header: 'THAO TÁC',
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => void openSessionDetail(row.original)}
            className="inline-flex items-center gap-0.5 text-sm font-medium text-sky-600 underline-offset-2 hover:text-sky-800 hover:underline whitespace-nowrap"
          >
            Chi tiết <ChevronRight className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          </button>
        ),
      },
    ];

    return base;
  }, [navigate, reportsBySession, staffBasePath]);

  return (
    <div
      className="relative flex min-h-0 flex-col gap-3 overflow-hidden app-page-bg p-6"
      style={{ height: 'var(--content-height, 100vh)' }}
    >
      {sessionDetailOpen && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="flex-1 bg-black/30" onClick={closeSessionDetail} aria-hidden />

          <div className="w-full h-full bg-white text-black shadow-2xl flex flex-col overflow-hidden max-w-2xl border-l">
            <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
              <div className="min-w-0">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Chi tiết phiên</p>
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
                aria-label="Đóng chi tiết phiên"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-0 space-y-4">
              {sessionDetailLoading && <p className="text-xs text-gray-500">Đang tải chi tiết phiên...</p>}

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
                      <h3 className="font-semibold text-gray-900 text-sm">Hợp đồng</h3>
                    </div>
                    <div className="px-4 py-3 text-sm space-y-2">
                      {sessionDetailContract?.contractId ? (
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">
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
                          <span className="text-xs text-slate-500">Chưa có hợp đồng cho phiên này.</span>
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
          <span className="text-sm text-slate-500">Đang tải danh sách phiên đã dạy...</span>
        </div>
      )}

      {/* HEADER: tiêu đề + tìm kiếm / lọc cùng một thẻ như attendance-history */}
      <div className="flex shrink-0 flex-col gap-4 rounded-xl border bg-white px-6 py-4 shadow-sm min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-black">Danh sách phiên đã dạy</h2>
          <p className="text-xs text-gray-500">Các phiên bạn đã dạy cùng trạng thái hợp đồng.</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 min-[900px]:gap-3">
          <HoverSearch
            value={search}
            onChange={(v) => {
              setPageNumber(1);
              setSearch(v);
            }}
            placeholder="Tìm theo tên phiên..."
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
    </div>
  );
}

