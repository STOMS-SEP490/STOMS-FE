import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { ChevronRight } from 'lucide-react';
import { Drawer } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { attendanceApi, type AttendanceHistoryItem } from '../api/attendanceApi';
import sessionApi, { type PublishedTeamSession } from '@/modules/request/api/sessionApi';
import memberApi from '@/modules/request/api/memberApi';
import SessionAttendancePage from './SessionAttendancePage';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import TeamLeaderTimetableAssignments from '@/modules/contract/pages/TeamLeaderTimetableAssignments';
import { useTeamLeaderTimetableAssignments } from '@/modules/contract/hooks/useTeamLeaderTimetableAssignments';

type TLRow = {
  sessionId: number;
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
  const statuses = useMemo(() => ['ASSIGNED', 'ONGOING'], []);

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
  const attendanceDetailPrefix = '/teacher/attendance';
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

  const openDetail = (sessionId: number) => {
    setSelectedSessionId(sessionId);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
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
              <Link
                to={`${attendanceDetailPrefix}/${r.session.sessionId}`}
                className="inline-flex items-center gap-0.5 text-sm font-medium text-sky-600 underline-offset-2 hover:text-sky-800 hover:underline"
              >
                Chi tiết <ChevronRight className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              </Link>
            );
          },
        },
      ];
    },
    [isTeamLeader, attendanceDetailPrefix],
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
            teamId,
            statuses: ['COMPLETED'],
            pageNumber,
            pageSize,
          });

          const items = (res.items ?? []) as PublishedTeamSession[];
          let mapped: TLRow[] = items
            .filter((s) => Number(s.sessionId) > 0)
            .map((s) => ({
              sessionId: s.sessionId,
              sessionNo: s.sessionNo,
              startAt: s.startAt,
              endAt: s.endAt,
              location: s.location,
              isOnline: s.isOnline,
              status: s.status,
            checkinAt: (() => {
              const attendances = Array.isArray(s.attendances) ? s.attendances : [];
              if (!attendances.length) return null;
              const responsibleId = attendances[0]?.attendanceByMemberId ?? null;
              let bestTs = Number.POSITIVE_INFINITY;
              let best: string | null = null;
              for (const a of attendances) {
                if (responsibleId != null && a.attendanceByMemberId !== responsibleId) continue;
                const v = a.checkinAt ?? null;
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
              const attendances = Array.isArray(s.attendances) ? s.attendances : [];
              if (!attendances.length) return null;
              const responsibleId = attendances[0]?.attendanceByMemberId ?? null;
              let bestTs = Number.POSITIVE_INFINITY;
              let best: string | null = null;
              for (const a of attendances) {
                if (responsibleId != null && a.attendanceByMemberId !== responsibleId) continue;
                const v = a.checkoutAt ?? null;
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
          setTotalItems(res.totalItems ?? mapped.length);
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

            <Drawer
              open={detailOpen}
              onClose={closeDetail}
              placement="right"
              width={520}
              title={null}
            >
              {selectedSessionId != null ? (
                <SessionAttendancePage
                  sessionIdOverride={selectedSessionId}
                  onClose={closeDetail}
                  showBackButton={false}
                />
              ) : null}
            </Drawer>
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

      <Drawer open={detailOpen} onClose={closeDetail} placement="right" width={520} title={null}>
        {selectedSessionId != null ? (
          <SessionAttendancePage
            sessionIdOverride={selectedSessionId}
            onClose={closeDetail}
            showBackButton={false}
          />
        ) : null}
      </Drawer>
    </div>
  );
}

