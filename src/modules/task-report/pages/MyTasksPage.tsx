import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { DatePicker, Spin } from 'antd';
import dayjs from 'dayjs';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
import { DataTable } from '@/shared/components/common/DataTable';
import type { ColumnDef } from '@tanstack/react-table';

import sessionApi from '@/modules/request/api/sessionApi';
import type { SessionResponse } from '@/modules/request/session.types';

const PAGE_SIZE = 15;

export default function MyTasksPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const rolePrefix = location.pathname.startsWith('/teacher/') ? '/teacher' : '/tl';

  const memberId = useMemo(
    () => Number(JSON.parse(localStorage.getItem('user') || '{}')?.memberId || 0) || 0,
    [],
  );

  const [search, setSearch] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [pageNumber, setPageNumber] = useState(1);

  const { data: sessionsPaged, isLoading: sessionsLoading } = useQuery({
    queryKey: ['my-sessions-tasks', memberId, pageNumber, filterStartDate, filterEndDate],
    queryFn: () =>
      sessionApi.getFilter({
        MemberId: memberId || undefined,
        Statuses: [9],
        StartAt: filterStartDate ? `${filterStartDate}T00:00:00` : undefined,
        EndAt: filterEndDate ? `${filterEndDate}T23:59:59` : undefined,
        PageNumber: pageNumber,
        PageSize: PAGE_SIZE,
      }),
    enabled: !!memberId,
    staleTime: 30_000,
  });

  const sessions = useMemo(() => sessionsPaged?.Items ?? [], [sessionsPaged]);
  const totalItems = sessionsPaged?.TotalItems ?? 0;

  // client-side search
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
        id: 'request',
        header: 'Yêu cầu',
        cell: ({ row }) => {
          const name = row.original.Request?.RequestName;
          const code = row.original.Request?.RequestCode;
          return (
            <div className="min-w-0">
              <p className="truncate font-medium text-[#1a7a99] max-w-[200px]">{name ?? '—'}</p>
              {code && <p className="text-[11px] text-slate-500">{code}</p>}
            </div>
          );
        },
      },
      {
        id: 'sessionNo',
        header: 'Buổi',
        cell: ({ row }) => (
          <span className="font-semibold text-[#1a7a99]">Buổi {row.original.SessionNo}</span>
        ),
      },
      {
        id: 'title',
        header: 'Tiêu đề',
        cell: ({ row }) => {
          const title =
            row.original.SubjectSession?.Title ??
            row.original.EventSession?.Title ??
            row.original.Notes ??
            '—';
          return <span className="text-slate-700 break-words whitespace-normal">{title}</span>;
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
          const count =
            (row.original.TaskReports as unknown[] | null | undefined)?.length ?? 0;
          return (
            <div className="text-center">
              {count > 0 ? (
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100">
                  {count}
                </Badge>
              ) : (
                <span className="text-xs text-slate-400">—</span>
              )}
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <div
      className="flex flex-col gap-2 overflow-hidden app-page-bg p-6 pl-8"
      style={{ height: 'var(--content-height, 100vh)' }}
    >
      {/* HEADER */}
      <div className="shrink-0 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <h2 className="text-xl font-semibold text-[#1a7a99]">Báo cáo công việc</h2>
        <p className="text-xs text-gray-500">
          Danh sách buổi của bạn. Click vào buổi để xem và ghi báo cáo công việc.
        </p>
      </div>

      {/* FILTER BAR */}
      <div className="shrink-0 flex justify-end gap-3">
        <HoverSearch
          placeholder="Tìm theo tên yêu cầu, địa điểm..."
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPageNumber(1);
          }}
        />
        <DatePicker
          format="DD/MM/YYYY"
          placeholder="Từ ngày"
          value={filterStartDate ? dayjs(filterStartDate) : null}
          onChange={(d) => {
            setFilterStartDate(d ? d.format('YYYY-MM-DD') : '');
            setPageNumber(1);
          }}
          className="w-[140px]"
        />
        <span className="text-gray-400">→</span>
        <DatePicker
          format="DD/MM/YYYY"
          placeholder="Đến ngày"
          value={filterEndDate ? dayjs(filterEndDate) : null}
          onChange={(d) => {
            setFilterEndDate(d ? d.format('YYYY-MM-DD') : '');
            setPageNumber(1);
          }}
          className="w-[140px]"
        />
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 border-slate-200 bg-white"
          onClick={resetFilters}
        >
          <RotateCcw size={16} />
        </Button>
      </div>

      {/* TABLE */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
        {sessionsLoading ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <Spin />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredSessions}
            pageNumber={pageNumber}
            pageSize={PAGE_SIZE}
            totalItems={totalItems}
            onPageChange={setPageNumber}
            onRowClick={(session) => navigate(`${rolePrefix}/tasks/${session.SessionId}`)}
            comfortable
            fillHeight
            tableGap="tight"
            showPagination={totalItems > PAGE_SIZE}
          />
        )}
      </div>
    </div>
  );
}
