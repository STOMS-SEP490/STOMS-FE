import { DataTable } from '@/shared/components/common/DataTable';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';

import type { EventListItem } from '@/modules/event/event';
import type { ColumnDef } from '@tanstack/react-table';
import {
  BookOpen,
  CheckCircle,
  Clock,
  Eye,
  Pencil,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import eventService from '@/modules/event/api/eventApi';
import { Badge } from '@/shared/components/ui/badge';
import { StatCard } from '@/shared/components/common/StatCard';

export default function EventsManagement() {
  const [events, setEvents] = useState<EventListItem[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const fetchEvents = async () => {
    try {
      const res = await eventService.getEvents({
        pageNumber,
        pageSize,
      });

      setEvents(res.items);
      setTotalItems(res.totalItems);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [pageNumber]);

  const columns: ColumnDef<EventListItem>[] = [
    {
      accessorKey: 'eventCode',
      header: 'Mã sự kiện',
    },
    {
      accessorKey: 'eventName',
      header: 'Tên sự kiện',
    },
    {
      id: 'status',
      header: 'Trạng thái',
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge className="bg-green-100 text-green-700">
            Hoạt động
          </Badge>
        ) : (
          <Badge className="bg-gray-200 text-gray-600">
            Ngừng hoạt động
          </Badge>
        ),
    },
    {
      accessorKey: 'duration',
      header: 'Thời lượng',
    },
    {
      accessorKey: 'numberOfSession',
      header: 'Số buổi',
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.numberOfSession} buổi
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Ngày tạo',
      cell: ({ row }) =>
        new Date(row.original.createdAt).toLocaleString(),
    },
    {
      accessorKey: 'updatedAt',
      header: 'Cập nhật',
      cell: ({ row }) =>
        new Date(row.original.updatedAt).toLocaleString(),
    },
    {
      id: 'actions',
      header: 'Thao tác',
      enableSorting: false,
      cell: () => (
        <div className="flex gap-3">
          <Eye size={16} className="text-blue-600 cursor-pointer" />
          <Pencil size={16} className="text-blue-600 cursor-pointer" />
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">
            Quản lý sự kiện
          </h2>
          <p className="text-xs text-gray-500">
            Quản lý các sự kiện trong hệ thống
          </p>
        </div>

        <Button className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md">
          <Plus size={16} />
          Thêm sự kiện
        </Button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4 mb-2">
        <StatCard
          icon={<BookOpen />}
          label="Tổng sự kiện"
          value={totalItems}
          sub="sự kiện trong hệ thống"
        />
        <StatCard
          icon={<CheckCircle />}
          label="Đang hoạt động"
          value={events.filter((e) => e.isActive).length}
          sub="sự kiện active"
          variant="green"
        />
        <StatCard
          icon={<Clock />}
          label="Tổng buổi"
          value={events.reduce(
            (sum, e) => sum + e.numberOfSession,
            0
          )}
          sub="tổng số buổi"
        />
        <StatCard
          icon={<BookOpen />}
          label="Ngừng hoạt động"
          value={events.filter((e) => !e.isActive).length}
          sub="sự kiện inactive"
        />
      </div>

      {/* FILTER BAR */}
      <div className="flex justify-end gap-3 mb-2">
        <HoverSearch />
        <div className="flex items-center gap-3">
          <Select>
            <SelectTrigger className="text-sm bg-white">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="active">Hoạt động</SelectItem>
              <SelectItem value="inactive">Ngừng hoạt động</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="secondary" className="bg-white">
            <RotateCcw size={16} />
          </Button>
        </div>
      </div>

      {/* TABLE */}
      <DataTable
        columns={columns}
        data={events}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={(page) => setPageNumber(page)}
      />
    </div>
  );
}