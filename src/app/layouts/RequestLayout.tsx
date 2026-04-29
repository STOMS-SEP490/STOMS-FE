import { type ManagerRequestStatusFilter } from '@/shared/components/request/RequestSideBar';
import HoverSearch from '@/shared/components/ui/search';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { REQUEST_STATUS, REQUEST_STATUS_LABEL } from '@/constants/status';
import { useRequests } from '@/modules/request/hooks/useRequests';
import type { RequestListItem } from '@/modules/request/request';
import { getRequestStatusCode, getRequestStatusInfo } from '@/constants/status';
import { Badge } from '@/shared/components/ui/badge';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/shared/components/common/DataTable';

/** Tab Duyệt yêu cầu (/approval): chỉ lọc theo các trạng thái phê duyệt. */
const APPROVAL_TAB_STATUS_FILTERS: ManagerRequestStatusFilter[] = [
  'all',
  'pending',
  'rejected',
  'approved',
];

/** Tab Phân công cần duyệt: chỉ trạng thái yêu cầu 3–5 (APPROVED / ASSIGNING / PUBLISHED). */
const ASSIGNMENT_TAB_STATUS_FILTERS: ManagerRequestStatusFilter[] = [
  'all',
  'approved',
  'assigning',
  'published',
];

/** Tab Các yêu cầu cần gán nhóm: chỉ lấy yêu cầu đã duyệt. */
const TEAM_ASSIGN_TAB_STATUS_FILTERS: ManagerRequestStatusFilter[] = ['all', 'approved'];

type RequestTypeKey = 'subject' | 'course' | 'event' | 'other';
const REQUEST_TYPE_BADGE_CLASS: Record<RequestTypeKey, string> = {
  subject: 'bg-blue-100 text-blue-700',
  course: 'bg-purple-100 text-purple-700',
  event: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-200 text-gray-700',
};

const getRequestTypeInfo = (row: RequestListItem): { key: RequestTypeKey; label: string } => {
  if (row.subjectId) return { key: 'subject', label: 'Môn học' };
  if (row.courseId) return { key: 'course', label: 'Chương trình học' };
  if (row.eventId) return { key: 'event', label: 'Sự kiện' };
  return { key: 'other', label: 'Khác' };
};

/** Tab Phân công cần duyệt: chỉ yêu cầu trạng thái 3–5 (APPROVED / ASSIGNING / PUBLISHED). */
const ASSIGNMENT_TAB_REQUEST_STATUSES_API = ['APPROVED', 'ASSIGNING', 'PUBLISHED'] as const;
const ASSIGNMENT_TAB_REQUEST_STATUS_CODES = new Set<number>([
  REQUEST_STATUS.APPROVED,
  REQUEST_STATUS.ASSIGNING,
  REQUEST_STATUS.PUBLISHED,
]);

function isPendingStatus(status: string | undefined): boolean {
  const s = (status ?? '').toLowerCase();
  return s === 'pending' || s.includes('chờ') || s.includes('pending');
}

const STATUS_FILTER_TO_REQUEST_CODE: Record<Exclude<ManagerRequestStatusFilter, 'all'>, number> = {
  pending: REQUEST_STATUS.PENDING,
  approved: REQUEST_STATUS.APPROVED,
  rejected: REQUEST_STATUS.REJECTED,
  assigning: REQUEST_STATUS.ASSIGNING,
  published: REQUEST_STATUS.PUBLISHED,
  completed: REQUEST_STATUS.COMPLETED,
  cancelled: REQUEST_STATUS.CANCELLED,
};

const STATUS_FILTER_TO_API: Record<Exclude<ManagerRequestStatusFilter, 'all'>, string> = {
  pending: 'PENDING',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  assigning: 'ASSIGNING',
  published: 'PUBLISHED',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
};

function formatDateTime(value: string | undefined | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getRequestTimeRange(row: RequestListItem): { startAt?: string; endAt?: string } {
  const sessions = row.sessions ?? [];
  if (!sessions.length) return {};

  const s1 = sessions.find((s) => s.sessionNo === 1);
  const maxNo = sessions.reduce((m, s) => (s.sessionNo > m ? s.sessionNo : m), 1);
  const sLast = sessions.find((s) => s.sessionNo === maxNo);

  // Fallbacks nếu data không đủ sessionNo
  const startAt =
    s1?.startAt ??
    sessions.reduce<string | undefined>((min, s) => {
      if (!s.startAt) return min;
      if (!min) return s.startAt;
      return new Date(s.startAt).getTime() < new Date(min).getTime() ? s.startAt : min;
    }, undefined);
  const endAt =
    sLast?.endAt ??
    sessions.reduce<string | undefined>((max, s) => {
      if (!s.endAt) return max;
      if (!max) return s.endAt;
      return new Date(s.endAt).getTime() > new Date(max).getTime() ? s.endAt : max;
    }, undefined);

  return { startAt, endAt };
}

export default function RequestLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isDetailMode = Boolean(id);
  const [search, setSearch] = useState('');
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const [typeFilter, setTypeFilter] = useState<'all' | 'event' | 'subject' | 'course'>('all');
  const [statusFilter, setStatusFilter] = useState<ManagerRequestStatusFilter>('all');
  const [pageNumber, setPageNumber] = useState(1);
  const tabValue = useMemo<'all' | 'approval' | 'assignment' | 'team_assign'>(() => {
    if (location.pathname.includes('/requests/assignments')) return 'assignment';
    if (location.pathname.includes('/requests/approval')) return 'approval';
    if (location.pathname.includes('/requests/team-assign')) return 'team_assign';
    return 'all';
  }, [location.pathname]);
  const pageSize = 10;

  const outletViewMode =
    tabValue === 'assignment'
      ? 'assignment'
      : tabValue === 'approval'
        ? 'approval'
        : tabValue === 'team_assign'
          ? 'team_assign'
          : 'request';

  const handleResetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setStatusFilter('all');
    setPageNumber(1);
  };

  // Fetch list for table (filtering is client-side because API filter doesn't support keyword/type)
  const requestQueryOptions = useMemo(() => {
    if (tabValue === 'assignment') {
      if (statusFilter !== 'all') {
        return {
          isAssignmentApprovalNeeded: true,
          statuses: [STATUS_FILTER_TO_API[statusFilter]],
        };
      }
      return {
        isAssignmentApprovalNeeded: true,
        statuses: [...ASSIGNMENT_TAB_REQUEST_STATUSES_API],
      };
    }
    if (tabValue === 'approval') {
      return { statuses: ['PENDING'] as string[] };
    }
    if (tabValue === 'team_assign') {
      return { statuses: ['APPROVED'] as string[] };
    }
    if (statusFilter !== 'all') {
      return { statuses: [STATUS_FILTER_TO_API[statusFilter]] };
    }
    // Tab all: fetch all statuses (server-side). Filtering by status is handled above.
    return {};
  }, [statusFilter, tabValue]);

  const { data: requestList, loading: requestLoading } = useRequests(
    1,
    500,
    sidebarRefreshKey,
    requestQueryOptions,
  );

  // Refresh data when navigating back from detail to table
  useEffect(() => {
    if (!isDetailMode) {
      setSidebarRefreshKey((k) => k + 1);
    }
  }, [isDetailMode]);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (requestList ?? []).filter((item) => {
      const matchSearch =
        (item.requestCode ?? '').toLowerCase().includes(q) ||
        (item.requestName ?? '').toLowerCase().includes(q);
      if (!matchSearch) return false;

      const matchType = (() => {
        if (typeFilter === 'all') return true;
        if (typeFilter === 'event') return !!item.eventId;
        if (typeFilter === 'subject') return !!item.subjectId;
        if (typeFilter === 'course') return !!item.courseId;
        return true;
      })();
      if (!matchType) return false;

      // Keep assignment tab status filtering consistent with old sidebar UI
      if (tabValue === 'assignment') {
        const code = getRequestStatusCode(item.status);
        if (code == null || !ASSIGNMENT_TAB_REQUEST_STATUS_CODES.has(code)) return false;
        if (statusFilter === 'all') return true;
        const want = STATUS_FILTER_TO_REQUEST_CODE[statusFilter];
        return code === want;
      }

      if (tabValue === 'approval') return isPendingStatus(item.status);
      if (tabValue === 'team_assign') return getRequestStatusCode(item.status) === REQUEST_STATUS.APPROVED;
      if (statusFilter === 'all') return true;
      const want = STATUS_FILTER_TO_REQUEST_CODE[statusFilter];
      return getRequestStatusCode(item.status) === want;
    });
  }, [requestList, search, statusFilter, tabValue, typeFilter]);

  useEffect(() => {
    setPageNumber(1);
  }, [search, typeFilter, statusFilter, tabValue]);

  const pagedRequests = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, pageNumber, pageSize]);

  const totalPages = useMemo(() => Math.ceil(filteredRequests.length / pageSize), [filteredRequests.length, pageSize]);
  const fromItem = useMemo(
    () => (filteredRequests.length === 0 ? 0 : (pageNumber - 1) * pageSize + 1),
    [filteredRequests.length, pageNumber, pageSize]
  );
  const toItem = useMemo(
    () => (filteredRequests.length === 0 ? 0 : Math.min(pageNumber * pageSize, filteredRequests.length)),
    [filteredRequests.length, pageNumber, pageSize]
  );

  const requestColumns = useMemo<ColumnDef<RequestListItem>[]>(() => {
    return [
      {
        accessorKey: 'requestCode',
        header: 'Mã',
        cell: ({ row }) => (
          <span className="font-semibold text-[#1a7a99]">{row.original.requestCode ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'requestName',
        header: 'Tên yêu cầu',
        cell: ({ row }) => (
          <span className="block max-w-[220px] truncate font-semibold text-[#1a7a99]">
            {row.original.requestName ?? '—'}
          </span>
        ),
      },
      {
        id: 'startAt',
        header: 'Thời gian bắt đầu',
        cell: ({ row }) => {
          const { startAt } = getRequestTimeRange(row.original);
          return <span className="tabular-nums">{formatDateTime(startAt)}</span>;
        },
      },
      {
        id: 'endAt',
        header: 'Thời gian kết thúc',
        cell: ({ row }) => {
          const { endAt } = getRequestTimeRange(row.original);
          return <span className="tabular-nums">{formatDateTime(endAt)}</span>;
        },
      },
      {
        id: 'type',
        header: 'Loại',
        cell: ({ row }) => {
          const { key, label } = getRequestTypeInfo(row.original);
          return <Badge className={REQUEST_TYPE_BADGE_CLASS[key]}>{label}</Badge>;
        },
      },
      {
        id: 'participationType',
        header: 'Hình thức',
        cell: ({ row }) => {
          const isContinuous = (row.original as any).isContinuous;
          return (
            <span className="text-sm text-slate-700">
              {isContinuous ? 'Liên tục' : 'Từng buổi'}
            </span>
          );
        },
      },
      {
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => {
          const info = getRequestStatusInfo(row.original.status);
          return <Badge className={info.className}>{info.label}</Badge>;
        },
      },
    ];
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.add('scrollbar-hide', 'no-scrollbar');
    body.classList.add('scrollbar-hide', 'no-scrollbar');
    return () => {
      root.classList.remove('scrollbar-hide', 'no-scrollbar');
      body.classList.remove('scrollbar-hide', 'no-scrollbar');
    };
  }, []);

  useEffect(() => {
    if (tabValue === 'assignment') {
      setStatusFilter((prev) =>
        ASSIGNMENT_TAB_STATUS_FILTERS.includes(prev) ? prev : 'all',
      );
      return;
    }

    if (tabValue === 'approval') {
      setStatusFilter((prev) =>
        APPROVAL_TAB_STATUS_FILTERS.includes(prev) ? prev : 'all',
      );
      return;
    }

    if (tabValue === 'team_assign') {
      setStatusFilter((prev) =>
        TEAM_ASSIGN_TAB_STATUS_FILTERS.includes(prev) ? prev : 'all',
      );
      return;
    }

    setStatusFilter((prev) => (prev === 'assigning' ? 'all' : prev));
  }, [tabValue]);

  return (
    <div
      className="p-6 pl-8 app-page-bg flex h-[var(--content-height)] flex-col gap-1"
    >
      {/* HEADER */}

      {!isDetailMode && (
        <>
          <div className="bg-white px-6 py-4 mb-0 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-semibold text-[#1a7a99]">Trung tâm phê duyệt</h2>
            <p className="text-xs text-gray-500">
              Quản lý phê duyệt yêu cầu và phê duyệt phân công
            </p>
          </div>

          <div className="px-4 pb-2 pt-2">
            <Tabs
              value={tabValue}
              onValueChange={(v) => {
                const mode = v as 'all' | 'approval' | 'assignment' | 'team_assign';
                if (mode === 'assignment') {
                  setStatusFilter((prev) =>
                    ASSIGNMENT_TAB_STATUS_FILTERS.includes(prev) ? prev : 'all',
                  );
                  navigate('/manager/requests/assignments');
                  return;
                }
                if (mode === 'approval') {
                  setStatusFilter((prev) =>
                    APPROVAL_TAB_STATUS_FILTERS.includes(prev) ? prev : 'all',
                  );
                  navigate('/manager/requests/approval');
                  return;
                }
                if (mode === 'team_assign') {
                  setStatusFilter((prev) =>
                    TEAM_ASSIGN_TAB_STATUS_FILTERS.includes(prev) ? prev : 'all',
                  );
                  navigate('/manager/requests/team-assign');
                  return;
                }
                setStatusFilter((prev) => (prev === 'assigning' ? 'all' : prev));
                navigate('/manager/requests');
              }}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <TabsList>
                  <TabsTrigger
                    value="all"
                    onClick={() => {
                      setPageNumber(1);
                      navigate('/manager/requests');
                    }}
                  >
                    Tất cả yêu cầu
                  </TabsTrigger>
                  <TabsTrigger
                    value="approval"
                    onClick={() => {
                      setPageNumber(1);
                      navigate('/manager/requests/approval');
                    }}
                  >
                  Yêu cầu cần duyệt
                  </TabsTrigger>
                  <TabsTrigger
                    value="team_assign"
                    onClick={() => {
                      setPageNumber(1);
                      navigate('/manager/requests/team-assign');
                    }}
                  >
                    Yêu cầu cần gán nhóm
                  </TabsTrigger>
                  <TabsTrigger
                    value="assignment"
                    onClick={() => {
                      setPageNumber(1);
                      navigate('/manager/requests/assignments');
                    }}
                  >
                    Phân công cần duyệt
                  </TabsTrigger>
                </TabsList>

                <div className="flex flex-wrap items-center justify-end gap-3">
                <HoverSearch value={search} onChange={setSearch} placeholder="Tìm theo mã hoặc tên yêu cầu..." />

                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                  <SelectTrigger className="w-[168px] text-gray-500 text-sm gap-2 bg-white border-slate-200">
                    <SelectValue placeholder="Loại yêu cầu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả loại</SelectItem>
                    <SelectItem value="event">Sự kiện</SelectItem>
                    <SelectItem value="subject">Môn học</SelectItem>
                    <SelectItem value="course">Chương trình học</SelectItem>
                  </SelectContent>
                </Select>

                {/* Status Filter — tab Phân công chỉ 3–5; tab Tất cả đủ enum */}
                {tabValue === 'assignment' && (
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as ManagerRequestStatusFilter)}
                  >
                    <SelectTrigger className="w-[176px] text-gray-500 text-sm gap-2 bg-white border-slate-200">
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả trạng thái</SelectItem>
                      <SelectItem value="approved">{REQUEST_STATUS_LABEL[REQUEST_STATUS.APPROVED]}</SelectItem>
                      <SelectItem value="assigning">{REQUEST_STATUS_LABEL[REQUEST_STATUS.ASSIGNING]}</SelectItem>
                      <SelectItem value="published">{REQUEST_STATUS_LABEL[REQUEST_STATUS.PUBLISHED]}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {tabValue === 'all' && (
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as ManagerRequestStatusFilter)}
                  >
                    <SelectTrigger className="w-[176px] text-gray-500 text-sm gap-2 bg-white border-slate-200">
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả trạng thái</SelectItem>
                      <SelectItem value="pending">{REQUEST_STATUS_LABEL[REQUEST_STATUS.PENDING]}</SelectItem>
                      <SelectItem value="rejected">{REQUEST_STATUS_LABEL[REQUEST_STATUS.REJECTED]}</SelectItem>
                      <SelectItem value="approved">{REQUEST_STATUS_LABEL[REQUEST_STATUS.APPROVED]}</SelectItem>
                      <SelectItem value="assigning">{REQUEST_STATUS_LABEL[REQUEST_STATUS.ASSIGNING]}</SelectItem>
                      <SelectItem value="published">{REQUEST_STATUS_LABEL[REQUEST_STATUS.PUBLISHED]}</SelectItem>
                      <SelectItem value="completed">{REQUEST_STATUS_LABEL[REQUEST_STATUS.COMPLETED]}</SelectItem>
                      <SelectItem value="cancelled">{REQUEST_STATUS_LABEL[REQUEST_STATUS.CANCELLED]}</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 bg-white border-slate-200 text-gray-600 hover:bg-gray-50"
                  onClick={handleResetFilters}
                >
                  <RotateCcw size={16} />
                </Button>
                </div>
              </div>
            </Tabs>
          </div>
        </>
      )}

      <div className="flex-1">
        {!isDetailMode ? (
          <div className="flex min-h-[calc(var(--content-height)-190px)] flex-col rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
            <div className="flex-1">
              {requestLoading ? (
                <div className="p-4 text-sm text-gray-500">Đang tải danh sách...</div>
              ) : (
                <DataTable
                  columns={requestColumns}
                  data={pagedRequests}
                  pageNumber={pageNumber}
                  pageSize={pageSize}
                  totalItems={filteredRequests.length}
                  onPageChange={(page) => setPageNumber(page)}
                  onRowClick={(row) => {
                    navigate(`/manager/requests/${row.requestId}`);
                  }}
                  comfortable
                  tableGap="tight"
                  showPagination={false}
                />
              )}
            </div>

            <div className="mt-auto border-t border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  Hiển thị {fromItem}
                  {' - '}
                  {toItem} trên {filteredRequests.length} bản ghi
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                    disabled={pageNumber <= 1}
                  >
                    Trước
                  </Button>
                  <div className="px-3 py-1 text-sm">
                    {pageNumber} / {totalPages || 1}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPageNumber((p) => Math.min(totalPages || 1, p + 1))}
                    disabled={pageNumber >= totalPages}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <Outlet
              context={{
                refreshRequestSidebar: () => setSidebarRefreshKey((k) => k + 1),
                viewMode: outletViewMode,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
