import { useEffect, useState } from 'react';
import { Clock, CalendarDays, MapPin } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/shared/components/common/DataTable';
import { StatCard } from '@/shared/components/common/StatCard';
import HoverSearch from '@/shared/components/ui/search';
import teachingHistoryApi, {
  type TeachingHistoryItem,
} from '../api/teachingHistoryApi';

function formatDateTime(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN');
}

function getWeekdayLabel(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  const day = d.getDay();
  if (day === 0) return 'Chủ nhật';
  return `Thứ ${day + 1}`;
}

const columns: ColumnDef<TeachingHistoryItem>[] = [
  {
    accessorKey: 'sessionName',
    header: 'Phiên dạy / Request',
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-semibold text-gray-900">{row.original.sessionName}</span>
        <span className="text-xs text-gray-500">
          ID: {row.original.sessionId}
        </span>
      </div>
    ),
  },
  {
    id: 'weekday',
    header: 'Thứ',
    cell: ({ row }) => (
      <span className="text-sm text-gray-700">
        {getWeekdayLabel(row.original.startAt)}
      </span>
    ),
  },
  {
    id: 'time',
    header: 'Ngày · Giờ',
    cell: ({ row }) => (
      <div className="text-sm text-gray-700">
        <div className="font-medium text-gray-900">
          {formatDate(row.original.startAt)}
        </div>
        <div className="text-xs text-gray-500">
          {formatDateTime(row.original.startAt)} - {formatDateTime(row.original.endAt)}
        </div>
      </div>
    ),
  },
  {
    id: 'location',
    header: 'Địa điểm',
    cell: ({ row }) => (
      <span className="text-sm text-gray-700">
        {row.original.location || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'role',
    header: 'Vai trò',
  },
  {
    accessorKey: 'status',
    header: 'Trạng thái',
  },
];

export default function TeacherAssignments() {
  const [items, setItems] = useState<TeachingHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');

  const memberId =
    Number(JSON.parse(localStorage.getItem('user') || '{}')?.memberId || 0) || undefined;

  const fetchData = async () => {
    if (!memberId) return;
    try {
      setLoading(true);
      const res = await teachingHistoryApi.getTeachingHistory(memberId, {
        pageNumber,
        pageSize,
      });

      let filtered = res.items ?? [];
      const keyword = search.trim().toLowerCase();
      if (keyword) {
        filtered = filtered.filter((x) =>
          (x.sessionName || '').toLowerCase().includes(keyword)
        );
      }

      setItems(filtered);
      setTotalItems(filtered.length);
    } catch (err) {
      console.error('fetch teaching assignments error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, search]);

  return (
    <div className="relative p-6 space-y-6">
      {loading && (
        <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-md">
          <span className="text-sm text-muted-foreground">Đang tải phân công...</span>
        </div>
      )}

      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">Phân công giảng dạy</h2>
          <p className="text-xs text-gray-500">
            Danh sách các buổi dạy mà bạn được phân công.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-2">
        <StatCard
          icon={<CalendarDays />}
          label="Tổng buổi"
          value={totalItems.toString()}
          sub="trong danh sách hiện tại"
        />
        <StatCard
          icon={<Clock />}
          label="Buổi online"
          value={items.filter((x) => x.isOnline).length.toString()}
          sub="trong danh sách hiện tại"
        />
        <StatCard
          icon={<MapPin />}
          label="Buổi offline"
          value={items.filter((x) => x.isOnline === false).length.toString()}
          sub="trong danh sách hiện tại"
        />
      </div>

      <div className="flex justify-end gap-3 mb-2">
        <HoverSearch
          value={search}
          onChange={setSearch}
          placeholder="Tìm theo tên phiên dạy..."
        />
      </div>

      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
        <DataTable
          columns={columns}
          data={items}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(page) => setPageNumber(page)}
        />
      </div>
    </div>
  );
}

