import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { DatePicker, Spin, Switch } from 'antd';
import dayjs from 'dayjs';

import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
import { DataTable } from '@/shared/components/common/DataTable';
import type { ColumnDef } from '@tanstack/react-table';

import sessionApi from '@/modules/request/api/sessionApi';
import { taskReportApi } from '@/modules/task-report/api/taskReportApi';
import type { SessionResponse } from '@/modules/request/session.types';

const PAGE_SIZE = 10;
const FETCH_ALL_SIZE = 1000;

export default function TaskReportsManagement() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [showPendingOnly, setShowPendingOnly] = useState(false);

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
    enabled: !showPendingOnly,
  });

  // ── Khi bật switch: fetch expenses pending từ BE ──
  const { data: pendingExpensesData, isLoading: pendingExpensesLoading } = useQuery({
    queryKey: ['expenses-pending-tasks'],
    queryFn: () => taskReportApi.getExpenses({ status: 1, pageNumber: 1, pageSize: FETCH_ALL_SIZE }),
    staleTime: 30_000,
    enabled: showPendingOnly,
  });

  // Lấy set taskReportIds có expense pending
  const pendingTaskReportIds = useMemo(() => {
    if (!pendingExpensesData?.items) return new Set<number>();
    return new Set(
      (pendingExpensesData.items ?? [])
        .map((e) => e.taskReportId)
        .filter((id): id is number => id != null)
    );
  }, [pendingExpensesData]);

  // ── Khi bật switch: fetch tất cả sessions để filter ──
  const { data: allSessionsPaged, isLoading: allSessionsLoading } = useQuery({
    queryKey: ['sessions-tasks-all', filterStartDate, filterEndDate],
    queryFn: () =>
      sessionApi.getFilter({
        PageNumber: 1,
        PageSize: FETCH_ALL_SIZE,
        Statuses: [9],
        StartAt: filterStartDate ? `${filterStartDate}T00:00:00` : undefined,
        EndAt: filterEndDate ? `${filterEndDate}T23:59:59` : undefined,
      }),
    staleTime: 30_000,
    enabled: showPendingOnly,
  });

  const isLoading = showPendingOnly
    ? pendingExpensesLoading || allSessionsLoading
    : sessionsLoading;

  const { displaySessions, totalItems } = useMemo(() => {
    if (!showPendingOnly) {
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
    }

    const q = search.trim().toLowerCase();
    let result = allSessionsPaged?.Items ?? [];

    if (q) {
      result = result.filter((s) => {
        const reqName = String(s.Request?.RequestName ?? '').toLowerCase();
        const reqCode = String(s.Request?.RequestCode ?? '').toLowerCase();
        const loc = String(s.Location ?? '').toLowerCase();
        return reqName.includes(q) || reqCode.includes(q) || loc.includes(q);
      });
    }

    // Chỉ giữ session có task report nằm trong danh sách có expense pending
    result = result.filter((s) => {
      const reports = (s.TaskReports as Array<{ TaskReportId?: number }> | null | undefined) ?? [];
      return reports.some((r) => r.TaskReportId != null && pendingTaskReportIds.has(r.TaskReportId));
    });

    const total = result.length;
    const paged = result.slice((pageNumber - 1) * PAGE_SIZE, pageNumber * PAGE_SIZE);
    return { displaySessions: paged, totalItems: total };
  }, [showPendingOnly, sessionsPaged, allSessionsPaged, search, pageNumber, pendingTaskReportIds]);

  const resetFilters = () => {
    setSearch('');
    setFilterStartDate('');
    setFilterEndDate('');
    setPageNumber(1);
    setShowPendingOnly(false);
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
          const reports = (row.original.TaskReports as Array<{ Expenses?: Array<{ Status?: number | string }> }> | null | undefined) ?? [];
          const count = reports.length;
          const hasPendingExpense = reports.some((r) =>
            (r.Expenses ?? []).some((e) => e.Status === 1 || e.Status === 'Pending')
          );
          return (
            <div className="flex flex-col items-center gap-1">
              {count > 0
                ? <Badge className="bg-[#2197C0]/10 text-[#1a7a99] border border-[#2197C0]/20 font-semibold">{count} báo cáo</Badge>
                : <span className="text-xs text-slate-400">—</span>}
              {hasPendingExpense && (
                <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-2 py-0.5 whitespace-nowrap">
                  Có khoản chi chưa duyệt
                </Badge>
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
      <div className="shrink-0 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <h2 className="text-xl font-semibold text-[#1a7a99]">Quản lý báo cáo công việc</h2>
        <p className="text-xs text-slate-500">Xem danh sách buổi học, click vào buổi để xem báo cáo công việc.</p>
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
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <Switch
            checked={showPendingOnly}
            onChange={(v) => { setShowPendingOnly(v); setPageNumber(1); }}
            style={{ backgroundColor: showPendingOnly ? '#2197C0' : undefined }}
          />
          <span className="text-sm text-slate-700 whitespace-nowrap">Chỉ task cần duyệt</span>
        </div>
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
