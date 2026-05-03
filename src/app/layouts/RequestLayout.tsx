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
import { getRequestStatusInfo } from '@/constants/status';
import { Badge } from '@/shared/components/ui/badge';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/shared/components/common/DataTable';
import {
  type ManagerRequestStatusFilter,
  STATUS_FILTER_TO_API,
} from '@/modules/request/types/filters';

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

const ASSIGNMENT_TAB_REQUEST_STATUSES_API = ['ASSIGNING', 'PUBLISHED'] as const;

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

  const requestQueryOptions = useMemo(() => {
    const queryRequestTypes = typeFilter === 'all' ? undefined : 
      typeFilter === 'subject' ? [1] : 
      typeFilter === 'course' ? [2] : 
      typeFilter === 'event' ? [3] : undefined;

    const baseOptions = {
      requestTypes: queryRequestTypes,
      requestCode: search.trim() || undefined,
    };

    if (tabValue === 'assignment') {
      if (statusFilter !== 'all') {
        return {
          ...baseOptions,
          isAssignmentApprovalNeeded: true,
          statuses: [STATUS_FILTER_TO_API[statusFilter]],
        };
      }
      return {
        ...baseOptions,
        isAssignmentApprovalNeeded: true,
        statuses: [...ASSIGNMENT_TAB_REQUEST_STATUSES_API],
      };
    }
    if (tabValue === 'approval') {
      return { ...baseOptions, statuses: ['PENDING'] as string[] };
    }
    if (tabValue === 'team_assign') {
      return { ...baseOptions, statuses: ['APPROVED'] as string[] };
    }
    if (statusFilter !== 'all') {
      return { ...baseOptions, statuses: [STATUS_FILTER_TO_API[statusFilter]] };
    }
    return baseOptions;
  }, [statusFilter, tabValue, typeFilter, search]);

  const { data: requestList, totalItems, loading: requestLoading } = useRequests(
    pageNumber,
    pageSize,
    sidebarRefreshKey,
    requestQueryOptions,
  );

  // Refresh data when navigating back from detail to table
  useEffect(() => {
    if (!isDetailMode) {
      setSidebarRefreshKey((k) => k + 1);
    }
  }, [isDetailMode]);

  useEffect(() => {
    setPageNumber(1);
  }, [search, typeFilter, statusFilter, tabValue]);

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
                    Yêu cầu chờ phân công
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
                <HoverSearch value={search} onChange={setSearch} placeholder="Tìm theo mã yêu cầu..." />

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
                  data={requestList}
                  pageNumber={pageNumber}
                  pageSize={pageSize}
                  totalItems={totalItems}
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
