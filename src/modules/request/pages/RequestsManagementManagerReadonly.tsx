import type { ColumnDef } from '@tanstack/react-table';
import { Eye, List, Clock, CheckCircle2, RotateCcw, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

import { useRequests } from '../hooks/useRequests';
import type { RequestListItem } from '../request';
import { getRequestStatusInfo, getRequestStatusLabel } from '@/constants/status';
import { Badge } from '@/shared/components/ui/badge';
import { StatCard } from '@/shared/components/common/StatCard';
import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';

const getRequestType = (row: RequestListItem) => {
  if (row.subjectId) return 'Subject';
  if (row.courseId) return 'Course';
  if (row.eventId) return 'Event';
  return 'Khác';
};

export default function RequestsManagementManagerReadonly() {
  const navigate = useNavigate();
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 10;
  const [refreshKey] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'event' | 'subject' | 'course'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const selectedStatuses = useMemo(() => {
    if (statusFilter === 'pending') return ['PENDING'];
    if (statusFilter === 'approved') return ['APPROVED'];
    if (statusFilter === 'rejected') return ['REJECTED'];
    return undefined;
  }, [statusFilter]);
  const { data, totalItems } = useRequests(pageNumber, pageSize, refreshKey, { statuses: selectedStatuses });

  const { totalItems: pendingTotalItems } = useRequests(1, 1, refreshKey, { statuses: ['PENDING'] });
  const { totalItems: approvedTotalItems } = useRequests(1, 1, refreshKey, { statuses: ['APPROVED'] });
  const { totalItems: rejectedTotalItems } = useRequests(1, 1, refreshKey, { statuses: ['REJECTED'] });

  const stats = useMemo(
    () => ({
      pending: pendingTotalItems,
      approved: approvedTotalItems,
      rejected: rejectedTotalItems,
    }),
    [pendingTotalItems, approvedTotalItems, rejectedTotalItems]
  );

  const filteredData = useMemo(() => {
    const query = search.trim().toLowerCase();

    return data.filter((item) => {
      const matchesSearch =
        !query ||
        item.requestCode?.toLowerCase().includes(query) ||
        item.requestName?.toLowerCase().includes(query) ||
        item.customerName?.toLowerCase().includes(query);

      const matchesType =
        typeFilter === 'all' ||
        (typeFilter === 'event' && Boolean(item.eventId)) ||
        (typeFilter === 'subject' && Boolean(item.subjectId)) ||
        (typeFilter === 'course' && Boolean(item.courseId));

      return matchesSearch && matchesType;
    });
  }, [data, search, typeFilter]);

  const handleResetFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setStatusFilter('all');
    setPageNumber(1);
  };

  const columns: ColumnDef<RequestListItem>[] = [
    {
      accessorKey: 'requestCode',
      header: 'Mã yêu cầu',
      cell: ({ row }) => <span className="font-semibold">{row.original.requestCode}</span>,
    },
    { accessorKey: 'requestName', header: 'Tên yêu cầu' },
    { accessorKey: 'customerName', header: 'Khách hàng' },
    {
      header: 'Loại',
      cell: ({ row }) => {
        const type = getRequestType(row.original);
        const colorMap: Record<string, string> = {
          Subject: 'bg-blue-100 text-blue-700',
          Course: 'bg-purple-100 text-purple-700',
          Event: 'bg-orange-100 text-orange-700',
          Khác: 'bg-gray-200 text-gray-700',
        };

        return <Badge className={colorMap[type]}>{type}</Badge>;
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
    {
      id: 'actions',
      header: 'Thao tác',
      cell: ({ row }) => {
        const isRejected = getRequestStatusLabel(row.original.status) === 'Từ chối';
        return (
          <div className="flex gap-3 items-center">
            <Eye
              size={16}
              className="cursor-pointer"
              onClick={() => navigate(`/manager/requests-view/${row.original.requestId}`)}
            />
            {isRejected ? (
              <span className="text-xs text-slate-400">(chỉ xem)</span>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 flex flex-col gap-3 min-h-0 h-full">
      <div className="bg-white px-6 py-4 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-black">Tất cả yêu cầu</h2>
          <p className="text-xs text-gray-500">Xem danh sách yêu cầu</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <StatCard icon={<List />} label="Tổng yêu cầu" value={totalItems.toString()} variant="blue" />
        <StatCard icon={<Clock />} label="Chờ duyệt" value={stats.pending.toString()} variant="amber" />
        <StatCard icon={<CheckCircle2 />} label="Đã duyệt" value={stats.approved.toString()} variant="green" />
        <StatCard icon={<X />} label="Từ chối" value={stats.rejected.toString()} variant="rose" />
      </div>

      <div className="py-1">
        <div className="flex items-center justify-end gap-3">
          <HoverSearch
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPageNumber(1);
            }}
            placeholder="Tìm theo mã, tên yêu cầu, khách hàng..."
          />

          <Select
            value={typeFilter}
            onValueChange={(value) => {
              setTypeFilter(value as typeof typeFilter);
              setPageNumber(1);
            }}
          >
            <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[150px] border-none shadow-none">
              <SelectValue placeholder="Loại yêu cầu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="subject">Môn</SelectItem>
              <SelectItem value="course">Khóa học</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as typeof statusFilter);
              setPageNumber(1);
            }}
          >
            <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[170px] border-none shadow-none">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="pending">Chờ duyệt</SelectItem>
              <SelectItem value="approved">Đã duyệt</SelectItem>
              <SelectItem value="rejected">Từ chối</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="secondary"
            className="bg-white"
            onClick={handleResetFilters}
            type="button"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm px-6 py-4 flex-1 min-h-0 overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredData}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(page) => setPageNumber(page)}
          fillHeight
          comfortable
          tableGap="tight"
        />
      </div>
    </div>
  );
}

