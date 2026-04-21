import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { ChevronRight, X } from 'lucide-react';
import attendanceApi from '../api/attendanceApi';
import type { AttendanceHistoryItem } from '../attendance';
import sessionApi from '@/modules/request/api/sessionApi';
import requestApi from '@/modules/request/api/requestApi';
import type { RequestListItem, RequestSessionSummary } from '@/modules/request/request';
import TeamLeaderSessionDetailPanel from '@/modules/request/pages/TeamLeaderSessionDetailPanel';

type Row = AttendanceHistoryItem;

function formatDateTeacher(value?: string | null) {
  if (!value) return '—';
  return dayjs(value).locale('vi').format('DD/MM/YYYY');
}

function formatTime(value?: string | null) {
  if (!value) return '—';
  return dayjs(value).format('HH:mm');
}

export default function TeacherAttendanceHistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(8);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');

  const memberId = Number(JSON.parse(localStorage.getItem('user') || '{}')?.memberId || 0) || 0;

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailRequest, setDetailRequest] = useState<RequestListItem | null>(null);
  const [detailSession, setDetailSession] = useState<RequestSessionSummary | null>(null);

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
  };

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        accessorKey: 'date',
        header: 'NGÀY',
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original as AttendanceHistoryItem;
          const d = r.session.startAt;
          return (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[#1a7a99]">{formatDateTeacher(d)}</span>
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
              <div className="text-sm font-semibold text-[#1a7a99] truncate">
                {r.request?.requestName || r.request?.requestCode || '—'}
              </div>
              <div className="text-xs text-slate-500">{r.session.sessionTitle || '—'}</div>
            </div>
          );
        },
      },
      {
        id: 'checkin',
        header: 'GIỜ VÀO',
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original as AttendanceHistoryItem;
          const hasIn = !!r.checkinAt;
          return (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[#1a7a99]">{formatTime(r.checkinAt)}</span>
              <span className={`text-xs ${hasIn ? 'text-emerald-600' : 'text-slate-500'}`}>
                {hasIn ? 'Đúng giờ' : 'Chưa có giờ vào'}
              </span>
            </div>
          );
        },
      },
      {
        id: 'checkout',
        header: 'GIỜ RA',
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original as AttendanceHistoryItem;
          const hasIn = !!r.checkinAt;
          const hasOut = !!r.checkoutAt;
          const status = !hasIn && !hasOut ? 'Chưa điểm danh' : hasIn && !hasOut ? 'Thiếu giờ ra' : 'Đúng giờ';
          return (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-[#1a7a99]">{formatTime(r.checkoutAt)}</span>
              <span
                className={`text-xs ${
                  status === 'Đúng giờ'
                    ? 'text-emerald-600'
                    : status === 'Thiếu giờ ra'
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
        header: () => <span className="block w-full text-center">THAO TÁC</span>,
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
    ],
    [],
  );

  useEffect(() => {
    const run = async () => {
      if (!memberId) return;
      try {
        setLoading(true);
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
      } catch (err) {
        console.error('teacher attendance history error:', err);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [memberId, pageNumber, pageSize, search]);

  useEffect(() => {
    if (!detailOpen) return;
    if (!selectedSessionId) return;

    let cancelled = false;
    const run = async () => {
      try {
        setDetailLoading(true);
        setDetailError(null);
        setDetailRequest(null);
        setDetailSession(null);

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
          throw new Error('Không tìm thấy mã request để tải chi tiết buổi.');
        }

        const requestDetail = await requestApi.getById(parsed);
        if (cancelled) return;

        const rawSession = (requestDetail.sessions ?? []).find(
          (s) => Number(s.sessionId) === selectedSessionId,
        ) as RequestSessionSummary | undefined;

        if (!rawSession) {
          throw new Error('Không tìm thấy buổi trong yêu cầu.');
        }

        setDetailRequest(requestDetail);
        setDetailSession(rawSession);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Không tải được chi tiết buổi.';
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
  }, [detailOpen, rows, selectedSessionId]);

  return (
    <div className="relative p-6 space-y-6 flex flex-col min-h-0" style={{ height: 'var(--content-height, 100vh)' }}>
      {loading && (
        <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-md">
          <span className="text-sm text-slate-500">Đang tải lịch sử điểm danh...</span>
        </div>
      )}

      <div className="mb-2 flex flex-col gap-4 rounded-xl border bg-white px-6 py-4 shadow-sm min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-[#1a7a99]">Lịch sử điểm danh</h2>
          <p className="text-xs text-gray-500">
            Các buổi bạn đã được điểm danh, cùng trạng thái giờ vào/giờ ra.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <HoverSearch
            value={search}
            onChange={(v) => {
              setPageNumber(1);
              setSearch(v);
            }}
            placeholder="Tìm theo tên buổi..."
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
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Chi tiết buổi</p>
                <h2 className="text-lg font-bold text-slate-900">
                  Buổi{' '}
                  {(
                    detailSession?.sessionNo ??
                    (rows.find(
                      (r) => 'session' in (r as any) && (r as AttendanceHistoryItem).session?.sessionId === selectedSessionId
                    ) as AttendanceHistoryItem | undefined)?.session?.sessionNo ??
                    '—'
                  ) as number | string}
                  {(detailSession as any)?.notes ? `: ${(detailSession as any).notes}` : ''}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeDetail}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                aria-label="Đóng chi tiết buổi"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-0">
              {detailLoading && <p className="text-xs text-gray-500">Đang tải chi tiết buổi...</p>}

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
