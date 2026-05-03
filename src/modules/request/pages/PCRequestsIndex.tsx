import type { ColumnDef } from '@tanstack/react-table';
import { Plus, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useRequests } from '../hooks/useRequests';
import { useProgramCoordinatorId } from '../hooks/useProgramCoordinatorId';
import type { RequestListItem } from '../request';
import { getRequestStatusInfo } from '@/constants/status';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';

type RequestTypeFilter = 'all' | 'event' | 'subject' | 'course';
type RequestStatusFilter =
  | 'all'
  | 'pending'
  | 'rejected'
  | 'approved'
  | 'assigning'
  | 'published'
  | 'completed'
  | 'cancelled';

const STATUS_FILTER_TO_API: Record<Exclude<RequestStatusFilter, 'all'>, string> = {
  pending: 'PENDING',
  rejected: 'REJECTED',
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

const getRequestTypeInfo = (row: RequestListItem): { key: keyof typeof REQUEST_TYPE_BADGE_CLASS; label: string } => {
  if (row.subjectId) return { key: 'subject', label: 'Môn học' };
  if (row.courseId) return { key: 'course', label: 'Chương trình học' };
  if (row.eventId) return { key: 'event', label: 'Sự kiện' };
  return { key: 'other', label: 'Khác' };
};

export default function PCRequestsIndex() {
  const navigate = useNavigate();
  const programCoordinatorId = useProgramCoordinatorId();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<RequestTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<RequestStatusFilter>('all');
  const [pageNumber, setPageNumber] = useState(1);
  const [refreshKey] = useState(0); // Reserved for future refresh functionality
  const pageSize = 10;

  const queryStatuses = statusFilter === 'all' ? undefined : [STATUS_FILTER_TO_API[statusFilter]];
  const queryRequestTypes = typeFilter === 'all' ? undefined : 
    typeFilter === 'subject' ? [1] : 
    typeFilter === 'course' ? [2] : 
    typeFilter === 'event' ? [3] : undefined;

  const { data, totalItems, loading } = useRequests(pageNumber, pageSize, refreshKey, {
    programCoordinatorId: programCoordinatorId > 0 ? programCoordinatorId : undefined,
    statuses: queryStatuses,
    requestTypes: queryRequestTypes,
    requestCode: search.trim() || undefined,
  });

  const columns: ColumnDef<RequestListItem>[] = [
    {
      accessorKey: 'requestCode',
      header: 'Mã yêu cầu',
      cell: ({ row }) => <span className="font-semibold text-[#1a7a99]">{row.original.requestCode}</span>,
    },
    {
      accessorKey: 'requestName',
      header: 'Tên yêu cầu',
      cell: ({ row }) => <span className="font-semibold text-[#1a7a99]">{row.original.requestName}</span>,
    },
    { accessorKey: 'customerName', header: 'Khách hàng' },
    {
      header: 'Loại',
      cell: ({ row }) => {
        const { key, label } = getRequestTypeInfo(row.original);
        return <Badge className={REQUEST_TYPE_BADGE_CLASS[key]}>{label}</Badge>;
      },
    },
    {
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
      accessorKey: 'startDate',
      header: 'Ngày bắt đầu',
      cell: ({ row }) => dayjs(row.original.startDate).format('DD/MM/YYYY'),
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

  const handleResetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setStatusFilter('all');
    setPageNumber(1);
  };

  return (
    <div className="p-6 pl-8 app-page-bg flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-[#1a7a99]">Tất cả yêu cầu</h2>
          <p className="text-xs text-gray-500">Xem danh sách yêu cầu dạng bảng</p>
        </div>
        <Button
          onClick={() => navigate('/pc/requests/create')}
          className="gap-2 bg-[#2197C0] text-white hover:bg-[#208AAE]"
        >
          <Plus size={16} />
          Tạo yêu cầu mới
        </Button>
      </div>

      <div className="mb-1 px-1">
        <div className="flex flex-wrap items-center justify-end gap-2.5">
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
            <SelectTrigger className="h-10 w-[136px] gap-2 border-slate-200 bg-white px-3 text-sm text-gray-500">
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
              setStatusFilter(v as RequestStatusFilter);
              setPageNumber(1);
            }}
          >
            <SelectTrigger className="h-10 w-[165px] gap-2 border-slate-200 bg-white px-3 text-sm text-gray-500">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="pending">Chờ duyệt</SelectItem>
              <SelectItem value="rejected">Từ chối</SelectItem>
              <SelectItem value="approved">Đã duyệt</SelectItem>
              <SelectItem value="assigning">Đang phân công</SelectItem>
              <SelectItem value="published">Đã công khai</SelectItem>
              <SelectItem value="completed">Hoàn thành</SelectItem>
              <SelectItem value="cancelled">Đã hủy</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 border-slate-200 bg-white text-gray-600 hover:bg-gray-50"
            onClick={handleResetFilters}
            title="Đặt lại bộ lọc"
          >
            <RotateCcw size={16} />
          </Button>
        </div>
      </div>

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
            onRowClick={(row) => navigate(`/pc/requests/${row.requestId}`)}
            fillHeight
            comfortable
            tableGap="tight"
          />
        )}
      </div>
    </div>
  );
}
