import type { ColumnDef } from '@tanstack/react-table';
import { RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Badge } from '@/shared/components/ui/badge';
import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { Button } from '@/shared/components/ui/button';
import { Switch } from '@/shared/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { getRequestStatusInfo } from '@/constants/status';
import type { TeamLeaderAssignmentsTab } from '@/modules/contract/hooks/type';
import { useTeamLeaderRequests } from '@/modules/request/hooks/useTeamLeaderRequests';
import memberApi from '@/modules/request/api/memberApi';
import { teamApi } from '@/modules/team/api/teamApi';

type RequestTypeFilter = 'all' | 'event' | 'subject' | 'course';
type TlRequestStatusFilter = 'all' | 'approved' | 'assigning' | 'published' | 'completed' | 'cancelled';

const TL_STATUS_FILTER_TO_API: Record<Exclude<TlRequestStatusFilter, 'all'>, string> = {
  approved: 'APPROVED',
  assigning: 'ASSIGNING',
  published: 'PUBLISHED',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
};

const REQUEST_TYPE_BADGE_CLASS: Record<Exclude<RequestTypeFilter, 'all'> | 'other', string> = {
  subject: 'bg-blue-100 text-blue-700',
  course: 'bg-purple-100 text-purple-700',
  event: 'bg-orange-100 text-orange-700',
  other: 'bg-gray-200 text-gray-700',
};

function getRequestTypeInfo(row: {
  subjectId?: number | null;
  courseId?: number | null;
  eventId?: number | null;
}): { key: keyof typeof REQUEST_TYPE_BADGE_CLASS; label: string } {
  if (row.subjectId) return { key: 'subject', label: 'Môn học' };
  if (row.courseId) return { key: 'course', label: 'Chương trình học' };
  if (row.eventId) return { key: 'event', label: 'Sự kiện' };
  return { key: 'other', label: 'Khác' };
}

export default function TeamLeaderAssignmentsTablePage({ tab }: { tab: TeamLeaderAssignmentsTab }) {
  const navigate = useNavigate();
  const [pageNumber, setPageNumber] = useState(1);
  const [refreshKey] = useState(0); // Reserved for future use
  const pageSize = 10;

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<RequestTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<TlRequestStatusFilter>('all');
  const [onlyNeedsAction, setOnlyNeedsAction] = useState(false);
  const [teamId, setTeamId] = useState<number | null>(null);

  // Fetch team ID for current user
  useEffect(() => {
    const fetchTeamId = async () => {
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) return;
        const user = JSON.parse(userStr);
        const memberId = user.memberId;
        if (!memberId) return;

        // Try to get team from member first
        try {
          const me = await memberApi.getById(memberId);
          if (me.teamId != null) {
            setTeamId(Number(me.teamId));
            return;
          }
        } catch {}

        // Fallback: get team where user is leader
        const teamsRes = await teamApi.getTeams({
          pageNumber: 1,
          pageSize: 20,
          leaderMemberId: memberId,
        });
        const firstTeam = teamsRes.items?.[0];
        if (firstTeam?.teamId != null) {
          setTeamId(Number(firstTeam.teamId));
        }
      } catch (err) {
        console.error('Failed to fetch team ID:', err);
      }
    };

    fetchTeamId();
  }, []);

  const queryRequestTypes = typeFilter === 'all' ? undefined : 
    typeFilter === 'subject' ? [1] : 
    typeFilter === 'course' ? [2] : 
    typeFilter === 'event' ? [3] : undefined;

  const queryStatuses = useMemo(() => {
    if (tab === 'rejected') {
      return undefined; // Will use sessionStatuses instead
    }
    if (onlyNeedsAction) {
      // Khi bật "Chỉ hiện yêu cầu cần xử lý": chỉ truyền IsAssignmentApprovalNeeded=true
      // Backend sẽ tự động lọc các requests APPROVED và ASSIGNING cần xử lý
      return undefined;
    }
    if (statusFilter !== 'all') {
      return [TL_STATUS_FILTER_TO_API[statusFilter]];
    }
    // Khi chọn "Tất cả trạng thái": không filter theo status, hiển thị tất cả
    return undefined;
  }, [tab, onlyNeedsAction, statusFilter]);

  const { data, totalItems, loading } = useTeamLeaderRequests(
    pageNumber,
    pageSize,
    refreshKey,
    {
      teamId: teamId ?? undefined,
      statuses: queryStatuses,
      sessionStatuses: tab === 'rejected' ? ['AssignmentRejected'] : undefined,
      requestTypes: queryRequestTypes,
      requestCode: search.trim() || undefined,
      isNeedingStaffAssignment: (tab === 'assigning' && onlyNeedsAction) ? true : undefined,
    }
  );

  const handleResetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setStatusFilter('all');
    setOnlyNeedsAction(false);
    setPageNumber(1);
  };

  const columns: ColumnDef<typeof data[number]>[] = [
    {
      accessorKey: 'requestCode',
      header: 'Mã yêu cầu',
      cell: ({ row }) => <span className="font-semibold text-[#1a7a99]">{row.original.requestCode}</span>,
    },
    {
      accessorKey: 'requestName',
      header: 'Tên yêu cầu',
      cell: ({ row }) => <span className="font-semibold text-[#1a7a99]">{row.original.requestName ?? '—'}</span>,
    },
    { accessorKey: 'customerName', header: 'Khách hàng' },
    {
      id: 'type',
      header: 'Loại',
      cell: ({ row }) => {
        const { key, label } = getRequestTypeInfo(row.original);
        return <Badge className={REQUEST_TYPE_BADGE_CLASS[key]}>{label}</Badge>;
      },
    },
    {
      id: 'startDate',
      header: 'Ngày bắt đầu',
      cell: ({ row }) => {
        const raw = row.original.startDate;
        return raw ? dayjs(raw).format('DD/MM/YYYY') : '—';
      },
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => {
        const info = getRequestStatusInfo(row.original.status);
        return <Badge className={info.className}>{info.label}</Badge>;
      },
    },
  ];

  const filterSlot = document.getElementById('tl-assignments-filters');

  return (
    <div className="flex h-full flex-col gap-3">
      {filterSlot ? createPortal(
        <div className="flex flex-wrap items-center gap-2.5">
          <HoverSearch
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPageNumber(1);
            }}
            placeholder="Tìm theo mã yêu cầu..."
          />
          <Select
            value={typeFilter}
            onValueChange={(v) => {
              setTypeFilter(v as RequestTypeFilter);
              setPageNumber(1);
            }}
          >
            <SelectTrigger className="h-10 w-[140px] gap-2 border-slate-200 bg-white px-3 text-sm text-gray-500">
              <SelectValue placeholder="Loại yêu cầu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              <SelectItem value="event">Sự kiện</SelectItem>
              <SelectItem value="subject">Môn học</SelectItem>
              <SelectItem value="course">Chương trình học</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as TlRequestStatusFilter);
              setPageNumber(1);
            }}
          >
            <SelectTrigger className="h-10 w-[180px] gap-2 border-slate-200 bg-white px-3 text-sm text-gray-500">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="approved">Đã duyệt</SelectItem>
              <SelectItem value="assigning">Đang phân công</SelectItem>
              <SelectItem value="published">Đã công khai</SelectItem>
              <SelectItem value="completed">Hoàn thành</SelectItem>
              <SelectItem value="cancelled">Đã hủy</SelectItem>
            </SelectContent>
          </Select>
          {tab === 'assigning' ? (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 h-10">
              <Switch
                checked={onlyNeedsAction}
                onCheckedChange={(checked) => {
                  setOnlyNeedsAction(checked);
                  setPageNumber(1);
                }}
                className="data-[state=checked]:bg-[#2197C0] rounded-full"
              />
              <span className="text-sm text-slate-700 whitespace-nowrap">Chỉ hiện yêu cầu cần xử lý</span>
            </div>
          ) : null}
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 border-slate-200 bg-white text-gray-600 hover:bg-gray-50"
            onClick={handleResetFilters}
            title="Đặt lại bộ lọc"
          >
            <RotateCcw size={16} />
          </Button>
        </div>,
        filterSlot
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border bg-white px-6 py-4 shadow-sm">
        {loading ? (
          <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-slate-600">
            Đang tải danh sách yêu cầu...
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={data}
            pageNumber={pageNumber}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setPageNumber}
            onRowClick={(row) => navigate(`/tl/assignments/${tab}/${row.requestId}`)}
            fillHeight
            comfortable
            tableGap="tight"
          />
        )}
      </div>
    </div>
  );
}
