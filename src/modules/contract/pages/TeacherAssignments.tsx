import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import teachingHistoryApi from '../api/teachingHistoryApi';
import type { TeachingScheduleItem } from '../teachingHistory';
import { sessionDisplayName } from '../teachingHistory';
import { useNavigate } from 'react-router-dom';

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

function getMyRole(item: TeachingScheduleItem, memberId?: number): string {
  if (!memberId || !item.members?.length) return '—';
  const me = item.members.find((m) => m.memberId === memberId);
  return me?.staffRole || '—';
}

export default function TeacherAssignments() {
  const [items, setItems] = useState<TeachingScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const memberId =
    Number(JSON.parse(localStorage.getItem('user') || '{}')?.memberId || 0) || undefined;

  const columns: ColumnDef<TeachingScheduleItem>[] = [
    {
      id: 'sessionName',
      header: 'Phiên dạy / Request',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900">{sessionDisplayName(row.original)}</span>
          <span className="text-xs text-gray-500">ID: {row.original.sessionId}</span>
        </div>
      ),
    },
    {
      id: 'weekday',
      header: 'Thứ',
      cell: ({ row }) => (
        <span className="text-sm text-gray-700">{getWeekdayLabel(row.original.startAt)}</span>
      ),
    },
    {
      id: 'time',
      header: 'Ngày · Giờ',
      cell: ({ row }) => (
        <div className="text-sm text-gray-700">
          <div className="font-medium text-gray-900">{formatDate(row.original.startAt)}</div>
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
        <span className="text-sm text-gray-700">{row.original.location || '—'}</span>
      ),
    },
    {
      id: 'role',
      header: 'Vai trò',
      cell: ({ row }) => getMyRole(row.original, memberId),
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
    },
  ];

  const fetchData = async () => {
    if (!memberId) return;
    try {
      setLoading(true);
      const res = await teachingHistoryApi.getTeachingSchedule(memberId, {
        pageNumber,
        pageSize,
      });
      let rows = res.items ?? [];
      const keyword = search.trim().toLowerCase();
      if (keyword) {
        rows = rows.filter((x) => sessionDisplayName(x).toLowerCase().includes(keyword));
      }

      setItems(rows);
      setTotalItems(res.totalItems ?? rows.length);
    } catch (err) {
      console.error('fetch teaching assignments error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, pageNumber, pageSize]);

  return (
    <div className="relative p-6 space-y-6 bg-[#f3f4f6]" style={{ minHeight: 'var(--content-height, 100vh)' }}>
      {loading && (
        <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-md">
          <span className="text-sm text-muted-foreground">Đang tải phân công...</span>
        </div>
      )}

      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">Thời khóa biểu & phân công</h2>
          <p className="text-xs text-gray-500">Danh sách phân công; mở lịch khi cần xem dạng lịch.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/teacher/timetable')}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            title="Mở thời khóa biểu"
          >
            <CalendarDays className="w-3 h-3" />
            <span>Mở lịch</span>
          </button>
        </div>
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
