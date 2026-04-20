import type { ColumnDef } from '@tanstack/react-table';
import { Plus, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
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
  if (row.courseId) return { key: 'course', label: 'Khóa học' };
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
  const pageSize = 10;

  const queryStatuses = statusFilter === 'all' ? undefined : [STATUS_FILTER_TO_API[statusFilter]];
  const { data, totalItems, loading } = useRequests(1, 500, 0, {
    programCoordinatorId: programCoordinatorId > 0 ? programCoordinatorId : undefined,
    statuses: queryStatuses,
  });

  const filteredData = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return data.filter((row) => {
      const matchesSearch =
        !keyword ||
        row.requestCode?.toLowerCase().includes(keyword) ||
        row.requestName?.toLowerCase().includes(keyword);
      const type = getRequestTypeInfo(row).key;
      const matchesType = typeFilter === 'all' || type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [data, search, typeFilter]);

  const paginatedData = useMemo(() => {
    const start = (pageNumber - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, pageNumber]);

  const columns: ColumnDef<RequestListItem>[] = [
    {
      accessorKey: 'requestCode',
      header: 'Mã yêu cầu',
      cell: ({ row }) => <span className="font-semibold">{row.original.requestCode}</span>,
    },
    {
      accessorKey: 'requestName',
      header: 'Tên yêu cầu',
      cell: ({ row }) => <span className="font-semibold text-slate-800">{row.original.requestName}</span>,
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
    <div className="p-6 pl-8 app-page-bg flex h-full min-h-0 flex-col gap-3 overflow-hidden">
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
            placeholder="Tìm theo mã hoặc tên yêu cầu..."
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
              <SelectItem value="course">Khóa học</SelectItem>
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
          <>
            <DataTable
              columns={columns}
              data={paginatedData}
              pageNumber={pageNumber}
              pageSize={pageSize}
              totalItems={filteredData.length}
              onPageChange={setPageNumber}
              onRowClick={(row) => navigate(`/pc/requests/${row.requestId}`)}
              fillHeight
              comfortable
              tableGap="tight"
            />
            {totalItems > 500 ? (
              <p className="pt-2 text-xs text-slate-500">
                Đang hiển thị dữ liệu trong 500 yêu cầu gần nhất, vui lòng lọc theo trạng thái để xem chính xác hơn.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
