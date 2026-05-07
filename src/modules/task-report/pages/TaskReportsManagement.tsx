import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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

const PAGE_SIZE = 10;

export default function TaskReportsManagement() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [pageNumber, setPageNumber] = useState(1);

  // ── Fetch sessions bình thường (phân trang BE) ──
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

  const isLoading = sessionsLoading;

  const { displaySessions, totalItems } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = sessionsPaged?.Items ?? [];
    const filtered = q
      ? items.filter((s) => {
          const reqName = String(s.Request?.RequestName ?? '').toLowerCase();
          const reqCode = String(s.Request?.RequestCode ?? '').toLowerCase();
          const loc = String(s.Location ?? '').toLowerCase();
          return reqName.includes(q) || reqCode.includes(q) || loc.includes(q);
        })
      : items;
    return { displaySessions: filtered, totalItems: sessionsPaged?.TotalItems ?? 0 };
  }, [sessionsPaged, search]);

  const resetFilters = () => {
    setSearch('');
    setFilterStartDate('');
    setFilterEndDate('');
    setPageNumber(1);
  };

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
        header: 'Tên buổi',
        cell: ({ row }) => {
          const title = row.original.SubjectSession?.Title ?? row.original.EventSession?.Title ?? row.original.Notes ?? '—';
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
          const reports = (row.original.TaskReports as Array<unknown> | null | undefined) ?? [];
          const count = reports.length;
          return (
            <div className="flex flex-col items-center gap-1">
              {count > 0
                ? <Badge className="bg-[#2197C0]/10 text-[#1a7a99] border border-[#2197C0]/20 font-semibold">{count} báo cáo</Badge>
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
      className="flex flex-col gap-2 overflow-hidden app-page-bg p-6 pl-8"
      style={{ height: 'var(--content-height, 100vh)' }}
    >
      <div className="shrink-0 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <h2 className="text-xl font-semibold text-[#1a7a99]">Quản lý báo cáo công việc</h2>
        <p className="text-xs text-slate-500">Xem danh sách buổi, chọn buổi để xem báo cáo công việc.

</p>
      </div>

      <div className="shrink-0 flex justify-end items-center gap-3">
        <HoverSearch placeholder="Tìm theo tên yêu cầu, địa điểm..." value={search} onChange={(v) => { setSearch(v); setPageNumber(1); }} />
        <DatePicker
          format="DD/MM/YYYY"
          placeholder="Từ ngày"
          value={filterStartDate ? dayjs(filterStartDate) : null}
          onChange={(d) => { setFilterStartDate(d ? d.format('YYYY-MM-DD') : ''); setPageNumber(1); }}
          className="w-[140px]"
        />
        <span className="text-slate-400">→</span>
        <DatePicker
          format="DD/MM/YYYY"
          placeholder="Đến ngày"
          value={filterEndDate ? dayjs(filterEndDate) : null}
          onChange={(d) => { setFilterEndDate(d ? d.format('YYYY-MM-DD') : ''); setPageNumber(1); }}
          className="w-[140px]"
        />
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={resetFilters}>
          <RotateCcw size={16} />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-16"><Spin /></div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <DataTable
              columns={columns}
              data={displaySessions}
              pageNumber={pageNumber}
              pageSize={PAGE_SIZE}
              totalItems={totalItems}
              onPageChange={(p) => { setPageNumber(p); }}
              onRowClick={(session) => navigate(`/manager/tasks/${session.SessionId}`)}
              comfortable
              tableGap="tight"
              showPagination
            />
          </div>
        )}
      </div>
    </div>
  );
}
