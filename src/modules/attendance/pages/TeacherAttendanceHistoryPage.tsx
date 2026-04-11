import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { ChevronRight, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import attendanceApi from '../api/attendanceApi';
import type { AttendanceHistoryItem } from '../attendance';
import sessionApi from '@/modules/request/api/sessionApi';
import type { PagedResponse, SessionResponse } from '@/modules/request/session.types';
import memberApi from '@/modules/request/api/memberApi';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import TeamLeaderTimetableAssignments from '@/modules/timetable/pages/TeamLeaderTimetableAssignments';
import { useTeamLeaderTimetableAssignments } from '@/modules/contract/hooks/useTeamLeaderTimetableAssignments';
import requestApi from '@/modules/request/api/requestApi';
import type { RequestListItem, RequestSessionSummary } from '@/modules/request/request';
import TeamLeaderSessionDetailPanel from '@/modules/request/pages/TeamLeaderSessionDetailPanel';

type TLRow = {
  sessionId: number;
  requestId?: number;
  sessionNo?: number;
  startAt?: string;
  endAt?: string;
  location?: string;
  isOnline?: boolean | null;
  status?: string;
  checkinAt?: string | null;
  checkoutAt?: string | null;
};

type Row = AttendanceHistoryItem | TLRow;

function formatDateTeacher(value?: string | null) {
  if (!value) return '—';
  return dayjs(value).locale('vi').format('DD/MM/YYYY');
}

function formatDateTeamLeader(value?: string | null) {
  if (!value) return '—';
  // Hiển thị giống hình: 27/3/2026 (không có số 0 ở đầu)
  return dayjs(value).locale('vi').format('D/M/YYYY');
}

function formatTime(value?: string | null) {
  if (!value) return '—';
  return dayjs(value).format('HH:mm');
}

type TeamLeaderAttendanceHistoryTab = 'attendance' | 'history';

function TeamLeaderAttendanceTab(props: { search: string; onSearchChange: (value: string) => void }) {
  const statuses = useMemo(() => ['6', '8', '9'], []);

  const {
    items,
    loading,
    pageNumber,
    pageSize,
    totalItems,
    setSearch,
    setPageNumber,
    refetch,
  // BE `sessions/filter` không lọc theo ngày; nếu FE tự filter "hôm nay" sẽ dễ rỗng dù response có data.
  } = useTeamLeaderTimetableAssignments({ pageSize: 8, statuses, todayOnly: false });

  useEffect(() => {
    setSearch(props.search);
  }, [props.search, setSearch]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1">
        <TeamLeaderTimetableAssignments
          isAttendanceTab
          embedded
          items={items}
          loading={loading}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          search={props.search}
          setSearch={props.onSearchChange}
          setPageNumber={setPageNumber}
          refetch={refetch}
        />
      </div>
    </div>
  );
}

export default function TeacherAttendanceHistoryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isTeamLeader = location.pathname.startsWith('/tl/');
  const activeTab: TeamLeaderAttendanceHistoryTab = isTeamLeader
    ? location.pathname.includes('/attendance-history')
      ? 'history'
      : 'attendance'
    : 'history';

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(8);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [attendanceSearch, setAttendanceSearch] = useState('');

  const memberId = Number(JSON.parse(localStorage.getItem('user') || '{}')?.memberId || 0) || 0;
  const [teamId, setTeamId] = useState<number | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailRequest, setDetailRequest] = useState<RequestListItem | null>(null);
  const [detailSession, setDetailSession] = useState<
    (RequestSessionSummary & { reservationId?: number | null; teamAssigned?: boolean }) | null
  >(null);
  const [detailAssignedTeamIds, setDetailAssignedTeamIds] = useState<number[]>([]);

  const openDetail = (sessionId: number) => {
    setSelectedSessionId(sessionId);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedSessionId(null);
    setDetailLoading(false);
    setDetailError(null);
    setDetailRequest(null);
    setDetailSession(null);
    setDetailAssignedTeamIds([]);
  };

  const columns = useMemo<ColumnDef<Row>[]>(
    () => {
      if (isTeamLeader) {
        return [
          {
            id: 'date',
            header: 'Ngày',
            enableSorting: false,
            cell: ({ row }) => {
              const r = row.original as TLRow;
              return <span className="text-sm font-semibold text-slate-900">{formatDateTeamLeader(r.startAt ?? null)}</span>;
            },
          },
          {
            id: 'time',
            header: 'Giờ',
            enableSorting: false,
            cell: ({ row }) => {
              const r = row.original as TLRow;
              return (
                <span className="text-sm font-semibold text-slate-900">
                  {formatTime(r.startAt ?? null)} - {formatTime(r.endAt ?? null)}
                </span>
              );
            },
          },
          {
            id: 'location',
            header: 'Địa điểm',
            enableSorting: false,
            cell: ({ row }) => {
              const r = row.original as TLRow;
              const loc = String(r.location ?? '');
              const onlineLabel = r.isOnline == null ? null : r.isOnline ? 'Online' : 'Offline';
              return (
                <span className="text-sm font-semibold text-slate-900">
                  {loc || '—'}
                  {onlineLabel ? <span className="text-xs text-slate-500"> • {onlineLabel}</span> : null}
                </span>
              );
            },
          },
          {
            id: 'checkin',
            header: 'CHECK-IN',
            enableSorting: false,
            cell: ({ row }) => {
              const r = row.original as TLRow;
              const hasIn = !!r.checkinAt;
              return (
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-900">{formatTime(r.checkinAt ?? null)}</span>
                  <span className={`text-xs ${hasIn ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {hasIn ? 'Đúng giờ' : 'Chưa check-in'}
                  </span>
                </div>
              );
            },
          },
          {
            id: 'checkout',
            header: 'CHECK-OUT',
            enableSorting: false,
            cell: ({ row }) => {
              const r = row.original as TLRow;
              const hasIn = !!r.checkinAt;
              const hasOut = !!r.checkoutAt;
              const status = !hasIn && !hasOut ? 'Chưa điểm danh' : hasIn && !hasOut ? 'Thiếu checkout' : 'Đúng giờ';
              return (
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-900">{formatTime(r.checkoutAt ?? null)}</span>
                  <span
                    className={`text-xs ${
                      status === 'Đúng giờ'
                        ? 'text-emerald-600'
                        : status === 'Thiếu checkout'
                        ? 'text-amber-600'
                        : 'text-slate-500'
                    }`}
                  >
                    {status}
                  </span>
                </div>
              );
            },
          },
          {
            id: 'actions',
            header: '',
            enableSorting: false,
            cell: ({ row }) => {
              const r = row.original as TLRow;
              return (
                <button
                  type="button"
                  onClick={() => openDetail(r.sessionId)}
                  className="text-sm font-medium text-sky-600 underline-offset-2 hover:text-sky-800 hover:underline whitespace-nowrap"
                >
                  Chi tiết <ChevronRight className="h-4 w-4 shrink-0 opacity-80 inline-block" aria-hidden />
                </button>
              );
            },
          },
        ];
      }

      return [
        {
          accessorKey: 'date',
          header: 'NGÀY',
          enableSorting: false,
          cell: ({ row }) => {
            const r = row.original as AttendanceHistoryItem;
            const d = r.session.startAt;
            return (
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-900">{formatDateTeacher(d)}</span>
                <span className="text-xs text-slate-500">
                  {formatTime(r.session.startAt)} - {formatTime(r.session.endAt)}
                </span>
              </div>
            );
          },
        },
        {
          accessorKey: 'sessionName',
          header: 'PHIÊN',
          enableSorting: false,
          cell: ({ row }) => {
            const r = row.original as AttendanceHistoryItem;
            return (
              <div className="min-w-0 max-w-[280px]">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {r.request?.requestName || r.request?.requestCode || '—'}
                </div>
                <div className="text-xs text-slate-500">{r.session.sessionTitle || '—'}</div>
              </div>
            );
          },
        },
        {
          id: 'checkin',
          header: 'CHECK-IN',
          enableSorting: false,
          cell: ({ row }) => {
            const r = row.original as AttendanceHistoryItem;
            const hasIn = !!r.checkinAt;
            return (
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-900">{formatTime(r.checkinAt)}</span>
                <span className={`text-xs ${hasIn ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {hasIn ? 'Đúng giờ' : 'Chưa check-in'}
                </span>
              </div>
            );
          },
        },
        {
          id: 'checkout',
          header: 'CHECK-OUT',
          enableSorting: false,
          cell: ({ row }) => {
            const r = row.original as AttendanceHistoryItem;
            const hasIn = !!r.checkinAt;
            const hasOut = !!r.checkoutAt;
            const status = !hasIn && !hasOut ? 'Chưa điểm danh' : hasIn && !hasOut ? 'Thiếu checkout' : 'Đúng giờ';
            return (
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-900">{formatTime(r.checkoutAt)}</span>
                <span
                  className={`text-xs ${
                    status === 'Đúng giờ'
                      ? 'text-emerald-600'
                      : status === 'Thiếu checkout'
                        ? 'text-amber-600'
                        : 'text-slate-500'
                  }`}
                >
                  {status}
                </span>
              </div>
            );
          },
        },
        {
          id: 'actions',
          header: 'THAO TÁC',
          enableSorting: false,
          cell: ({ row }) => {
            const r = row.original as AttendanceHistoryItem;
            return (
              <button
                type="button"
                onClick={() => openDetail(r.session.sessionId)}
                className="inline-flex items-center gap-0.5 text-sm font-medium text-sky-600 underline-offset-2 hover:text-sky-800 hover:underline whitespace-nowrap"
              >
                Chi tiết <ChevronRight className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              </button>
            );
          },
        },
      ];
    },
    [isTeamLeader],
  );

  useEffect(() => {
    if (!isTeamLeader) return;
    if (!memberId) {
      setTeamId(null);
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        const me = await memberApi.getById(memberId);
        if (cancelled) return;
        setTeamId(me.teamId != null ? Number(me.teamId) : null);
      } catch {
        if (cancelled) return;
        setTeamId(null);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isTeamLeader, memberId]);

  useEffect(() => {
    const run = async () => {
      if (!memberId) return;
      if (isTeamLeader && activeTab !== 'history') return;
      try {
        setLoading(true);
        if (isTeamLeader) {
          if (teamId == null) {
            setRows([]);
            setTotalItems(0);
            return;
          }

          const res = await sessionApi.getFilter({
            TeamId: teamId,
            Statuses: ['COMPLETED'],
            PageNumber: pageNumber,
            PageSize: pageSize,
          });

          const items = (res as PagedResponse<SessionResponse>).Items ?? [];
          let mapped: TLRow[] = items
            .filter((s) => Number(s.SessionId) > 0)
            .map((s) => ({
              sessionId: s.SessionId,
              requestId: s.RequestId,
              sessionNo: s.SessionNo,
              startAt: s.StartAt,
              endAt: s.EndAt,
              location: s.Location,
              isOnline: s.IsOnline,
              status: s.Status,
            checkinAt: (() => {
              const attendances = Array.isArray(s.Attendances) ? s.Attendances : [];
              if (!attendances.length) return null;
              const responsibleId = attendances[0]?.AttendanceByMemberId ?? null;
              let bestTs = Number.POSITIVE_INFINITY;
              let best: string | null = null;
              for (const a of attendances) {
                if (responsibleId != null && a.AttendanceByMemberId !== responsibleId) continue;
                const v = a.CheckinAt ?? null;
                if (!v) continue;
                const ts = new Date(v).getTime();
                if (Number.isNaN(ts)) continue;
                if (ts < bestTs) {
                  bestTs = ts;
                  best = v;
                }
              }
              return best;
            })(),
            checkoutAt: (() => {
              const attendances = Array.isArray(s.Attendances) ? s.Attendances : [];
              if (!attendances.length) return null;
              const responsibleId = attendances[0]?.AttendanceByMemberId ?? null;
              let bestTs = Number.POSITIVE_INFINITY;
              let best: string | null = null;
              for (const a of attendances) {
                if (responsibleId != null && a.AttendanceByMemberId !== responsibleId) continue;
                const v = a.CheckoutAt ?? null;
                if (!v) continue;
                const ts = new Date(v).getTime();
                if (Number.isNaN(ts)) continue;
                if (ts < bestTs) {
                  bestTs = ts;
                  best = v;
                }
              }
              return best;
            })(),
            }));

          const q = search.trim().toLowerCase();
          if (q) {
            mapped = mapped.filter((r) => {
              const loc = String(r.location ?? '').toLowerCase();
              const sn = String(r.sessionNo ?? '').toLowerCase();
              return loc.includes(q) || sn.includes(q);
            });
          }

          setRows(mapped);
          setTotalItems(res.TotalItems ?? mapped.length);
        } else {
          const res = await attendanceApi.getHistoryByMember(memberId, {
            pageNumber,
            pageSize,
          });
          const items = (res.items ?? []) as AttendanceHistoryItem[];

          let filtered = items;
          const q = search.trim().toLowerCase();
          if (q) {
            filtered = items.filter((r) => (r.session.sessionTitle || '').toLowerCase().includes(q));
          }

          setRows(filtered);
          setTotalItems(res.totalItems ?? filtered.length);
        }
      } catch (err) {
        console.error('teacher attendance history error:', err);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [isTeamLeader, memberId, teamId, pageNumber, pageSize, search, activeTab]);

  useEffect(() => {
    if (!isTeamLeader) return;
    if (!detailOpen) return;
    if (activeTab !== 'history') return;
    if (!selectedSessionId) return;

    let cancelled = false;
    const run = async () => {
      try {
        setDetailLoading(true);
        setDetailError(null);
        setDetailRequest(null);
        setDetailSession(null);
        setDetailAssignedTeamIds([]);

        const tlRow = rows.find(
          (r) => 'sessionId' in (r as any) && (r as TLRow).sessionId === selectedSessionId
        ) as TLRow | undefined;

        let reqId = tlRow?.requestId;
        if (!reqId) {
          const sessionDetail = await sessionApi.getById(selectedSessionId);
          reqId = (sessionDetail as any)?.requestId;
        }

        const requestId = reqId != null ? Number(reqId) : NaN;
        if (!requestId || Number.isNaN(requestId)) {
          throw new Error('Không tìm thấy mã request để tải chi tiết phiên.');
        }

        const requestDetail = await requestApi.getById(requestId);
        if (cancelled) return;

        const rawSession = (requestDetail.sessions ?? []).find(
          (s) => Number(s.sessionId) === selectedSessionId
        ) as (RequestSessionSummary & Record<string, unknown>) | undefined;

        if (!rawSession) {
          throw new Error('Không tìm thấy phiên trong yêu cầu.');
        }

        const anySession = rawSession as Record<string, unknown> & {
          reservationId?: number | string | null;
          ReservationId?: number | string | null;
          teamSessions?: unknown[];
          TeamSessions?: unknown[];
          teamId?: number | null;
          TeamId?: number | null;
          status?: string;
          notes?: string;
        };

        const rawReservationId = anySession.reservationId ?? anySession.ReservationId ?? null;
        const parsed = rawReservationId != null ? Number(rawReservationId) : NaN;
        const reservationId = !Number.isNaN(parsed) && parsed > 0 ? parsed : null;

        const fromSessions = (anySession.teamSessions ?? anySession.TeamSessions ?? []) as Array<any>;
        const backendTeamIds = Array.isArray(fromSessions)
          ? fromSessions
              .map((ts) => ts?.teamId ?? ts?.TeamId)
              .filter((id): id is number => typeof id === 'number' && id > 0)
          : [];

        const singleTeamId = anySession.teamId ?? anySession.TeamId;
        const assignedTeamIds =
          backendTeamIds.length > 0
            ? backendTeamIds
            : typeof singleTeamId === 'number' && singleTeamId > 0
              ? [singleTeamId]
              : [];

        const statusStr = String(anySession.status ?? '').toLowerCase();
        const teamAssigned =
          assignedTeamIds.length > 0 ||
          statusStr === 'approved' ||
          statusStr === 'assigned' ||
          statusStr === 'ongoing' ||
          statusStr === 'completed';

        if (cancelled) return;
        setDetailRequest(requestDetail);
        setDetailAssignedTeamIds(assignedTeamIds);
        setDetailSession({
          ...(rawSession as RequestSessionSummary),
          reservationId,
          teamAssigned,
        });
      } catch (err) {
        if (cancelled) return;
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Không tải được chi tiết phiên.';
        setDetailError(msg);
      } finally {
        if (cancelled) return;
        setDetailLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [activeTab, detailOpen, isTeamLeader, rows, selectedSessionId]);

  useEffect(() => {
    if (isTeamLeader) return;
    if (!detailOpen) return;
    if (!selectedSessionId) return;

    let cancelled = false;
    const run = async () => {
      try {
        setDetailLoading(true);
        setDetailError(null);
        setDetailRequest(null);
        setDetailSession(null);
        setDetailAssignedTeamIds([]);

        const teacherRow = rows.find(
          (r) =>
            'session' in (r as any) &&
            (r as AttendanceHistoryItem).session?.sessionId === selectedSessionId,
        ) as AttendanceHistoryItem | undefined;

        let requestId = teacherRow?.request?.requestId ?? null;
        if (!requestId) {
          const sessionDetail = await sessionApi.getById(selectedSessionId);
          requestId = (sessionDetail as any)?.requestId ?? null;
        }

        const parsed = requestId != null ? Number(requestId) : NaN;
        if (Number.isNaN(parsed) || parsed <= 0) {
          throw new Error('Không tìm thấy mã request để tải chi tiết phiên.');
        }

        const requestDetail = await requestApi.getById(parsed);
        if (cancelled) return;

        const rawSession = (requestDetail.sessions ?? []).find(
          (s) => Number(s.sessionId) === selectedSessionId,
        ) as RequestSessionSummary | undefined;

        if (!rawSession) {
          throw new Error('Không tìm thấy phiên trong yêu cầu.');
        }

        setDetailRequest(requestDetail);
        setDetailSession(rawSession);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Không tải được chi tiết phiên.';
        setDetailError(msg);
      } finally {
        if (cancelled) return;
        setDetailLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [detailOpen, isTeamLeader, rows, selectedSessionId]);

  if (isTeamLeader) {
    return (
      <div className="relative p-6 space-y-6 flex flex-col min-h-0" style={{ height: 'var(--content-height, 100vh)' }}>
        <div className="mb-2 flex flex-col gap-4 rounded-xl border bg-white px-6 py-4 shadow-sm min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-black">
              {activeTab === 'attendance' ? 'Điểm danh' : 'Lịch sử điểm danh'}
            </h2>
            <p className="text-xs text-gray-500">
              {activeTab === 'attendance'
                ? 'Theo dõi phiên diễn ra hôm nay và thực hiện check-in/check-out.'
                : 'Các phiên bạn đã được điểm danh, cùng trạng thái check-in/check-out.'}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <HoverSearch
              value={activeTab === 'attendance' ? attendanceSearch : search}
              onChange={(v) => {
                if (activeTab === 'attendance') {
                  setAttendanceSearch(v);
                  return;
                }
                setPageNumber(1);
                setSearch(v);
              }}
              placeholder={activeTab === 'attendance' ? 'Tìm theo phiên/địa điểm/trạng thái...' : 'Tìm theo phiên/địa điểm...'}
            />
          </div>
        </div>

        <div className="shrink-0">
          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              const next = v as TeamLeaderAttendanceHistoryTab;
              navigate(next === 'attendance' ? '/tl/attendance' : '/tl/attendance-history');
            }}
          >
            <TabsList>
              <TabsTrigger value="attendance">ĐIỂM DANH</TabsTrigger>
              <TabsTrigger value="history">LỊCH SỬ ĐIỂM DANH</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {activeTab === 'attendance' ? (
          <TeamLeaderAttendanceTab search={attendanceSearch} onSearchChange={setAttendanceSearch} />
        ) : (
          <>
            {loading && (
              <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-md">
                <span className="text-sm text-slate-500">Đang tải lịch sử điểm danh...</span>
              </div>
            )}

            <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
              <DataTable
                columns={columns}
                data={rows}
                pageNumber={pageNumber}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={(p) => setPageNumber(p)}
                comfortable={true}
                tableGap="tight"
              />
            </div>

            {detailOpen && (
              <div className="fixed inset-0 z-40 flex justify-end">
                <div className="flex-1 bg-black/30" onClick={closeDetail} />

                <div className="w-full h-full bg-white text-black shadow-2xl flex flex-col overflow-hidden max-w-xl border-l">
                  <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Chi tiết phiên</p>
                      <h2 className="text-lg font-bold text-slate-900">
                        Phiên{' '}
                        {(
                          detailSession?.sessionNo ??
                          (rows.find(
                            (r) => 'sessionId' in (r as any) && (r as TLRow).sessionId === selectedSessionId
                          ) as TLRow | undefined)?.sessionNo ??
                          '—'
                        ) as number | string}
                        {(detailSession as any)?.notes ? `: ${(detailSession as any).notes}` : ''}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-xs font-medium text-sky-600">Dạy học</span>
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                            (detailSession?.teamAssigned ?? detailAssignedTeamIds.length > 0)
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {detailSession?.teamAssigned ?? detailAssignedTeamIds.length > 0
                            ? 'Đã gắn đội'
                            : 'Chưa gắn đội'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={closeDetail}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                      aria-label="Đóng chi tiết phiên"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-0">
                    {detailLoading && <p className="text-xs text-gray-500">Đang tải chi tiết phiên...</p>}

                    {detailError && (
                      <p className="text-xs text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl">
                        {detailError}
                      </p>
                    )}

                    {detailRequest && detailSession && !detailLoading && !detailError && (
                      <>
                        <TeamLeaderSessionDetailPanel
                          session={detailSession}
                          requestCode={detailRequest.requestCode ?? ''}
                          requestName={detailRequest.requestName ?? ''}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative p-6 space-y-6 flex flex-col min-h-0" style={{ height: 'var(--content-height, 100vh)' }}>
      {loading && (
        <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-md">
          <span className="text-sm text-slate-500">Đang tải lịch sử điểm danh...</span>
        </div>
      )}

      <div className="mb-2 flex flex-col gap-4 rounded-xl border bg-white px-6 py-4 shadow-sm min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-black">Lịch sử điểm danh</h2>
          <p className="text-xs text-gray-500">
            Các phiên bạn đã được điểm danh, cùng trạng thái check-in/check-out.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <HoverSearch
            value={search}
            onChange={(v) => {
              setPageNumber(1);
              setSearch(v);
            }}
            placeholder="Tìm theo tên phiên..."
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
        <DataTable
          columns={columns}
          data={rows}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(p) => setPageNumber(p)}
          comfortable={false}
          tableGap="default"
        />
      </div>

      {detailOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="flex-1 bg-black/30" onClick={closeDetail} />

          <div className="w-full h-full bg-white text-black shadow-2xl flex flex-col overflow-hidden max-w-xl border-l">
            <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Chi tiết phiên</p>
                <h2 className="text-lg font-bold text-slate-900">
                  Phiên {detailSession?.sessionNo ?? '—'}
                  {(detailSession as any)?.notes ? `: ${(detailSession as any).notes}` : ''}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeDetail}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                aria-label="Đóng chi tiết phiên"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-0">
              {detailLoading && <p className="text-xs text-gray-500">Đang tải chi tiết phiên...</p>}

              {detailError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl">
                  {detailError}
                </p>
              )}

              {detailRequest && detailSession && !detailLoading && !detailError && (
                <TeamLeaderSessionDetailPanel
                  session={detailSession}
                  requestCode={detailRequest.requestCode ?? ''}
                  requestName={detailRequest.requestName ?? ''}
                />
              )}
            </div>
          </div>
        </div>
      )}
  
    </div>
  );
}

