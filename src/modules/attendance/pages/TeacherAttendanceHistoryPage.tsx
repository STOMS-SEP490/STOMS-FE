import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { attendanceApi, type AttendanceHistoryItem } from '../api/attendanceApi';

type Row = AttendanceHistoryItem;

function formatDate(value?: string | null) {
  if (!value) return '—';
  return dayjs(value).locale('vi').format('DD/MM/YYYY');
}

function formatTime(value?: string | null) {
  if (!value) return '—';
  return dayjs(value).format('HH:mm');
}

const columns: ColumnDef<Row>[] = [
  {
    accessorKey: 'date',
    header: 'NGÀY',
    cell: ({ row }) => {
      const d = row.original.session.startAt;
      return (
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-900">{formatDate(d)}</span>
          <span className="text-xs text-slate-500">
            {formatTime(row.original.session.startAt)} - {formatTime(row.original.session.endAt)}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: 'sessionName',
    header: 'PHIÊN',
    cell: ({ row }) => (
      <div className="min-w-0 max-w-[280px]">
        <div className="text-sm font-semibold text-slate-900 truncate">
          {row.original.request?.requestName || row.original.request?.requestCode || '—'}
        </div>
        <div className="text-xs text-slate-500">
          {row.original.session.sessionTitle || '—'}
        </div>
      </div>
    ),
  },
  {
    id: 'checkin',
    header: 'CHECK-IN',
    cell: ({ row }) => {
      const hasIn = !!row.original.checkinAt;
      return (
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-900">{formatTime(row.original.checkinAt)}</span>
          <span className={`text-xs ${hasIn ? 'text-emerald-600' : 'text-slate-500'}`}>
            {hasIn ? 'Đúng giờ' : 'Chưa check-in'}
          </span>
        </div>
      );
    },
  },
  {
    id: 'checkout',
    header: 'CHECK-OUT',
    cell: ({ row }) => {
      const hasIn = !!row.original.checkinAt;
      const hasOut = !!row.original.checkoutAt;
      const status =
        !hasIn && !hasOut ? 'Chưa điểm danh' : hasIn && !hasOut ? 'Thiếu checkout' : 'Đúng giờ';
      return (
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-900">
            {formatTime(row.original.checkoutAt)}
          </span>
          <span
            className={`text-xs ${
              status === 'Đúng giờ'
                ? 'text-emerald-600'
                : status === 'Thiếu checkout'
                  ? 'text-amber-600'
                  : 'text-slate-500'
            }`}
          >
            {status}
          </span>
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: 'THAO TÁC',
    cell: ({ row }) => {
      const navigate = useNavigate();
      return (
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700 hover:text-sky-800"
          onClick={() => navigate(`/teacher/attendance/${row.original.sessionId}`)}
        >
          Chi tiết <ChevronRight className="h-4 w-4" />
        </button>
      );
    },
  },
];

export default function TeacherAttendanceHistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(8);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');

  const memberId = Number(JSON.parse(localStorage.getItem('user') || '{}')?.memberId || 0) || 0;

  useEffect(() => {
    const run = async () => {
      if (!memberId) return;
      try {
        setLoading(true);
        const res = await attendanceApi.getHistoryByMember(memberId, {
          pageNumber,
          pageSize,
        });
        const items = (res.items ?? []) as Row[];

        let filtered = items;
        const q = search.trim().toLowerCase();
        if (q) {
          filtered = items.filter((r) => (r.session.sessionTitle || '').toLowerCase().includes(q));
        }

        setRows(filtered);
        setTotalItems(res.totalItems ?? items.length);
      } catch (err) {
        console.error('teacher attendance history error:', err);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [memberId, pageNumber, pageSize, search]);

  return (
    <div className="relative p-6 space-y-6">
      {loading && (
        <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-md">
          <span className="text-sm text-slate-500">Đang tải lịch sử điểm danh...</span>
        </div>
      )}

      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">Lịch sử điểm danh</h2>
          <p className="text-xs text-gray-500">Các phiên bạn đã được điểm danh, cùng trạng thái check-in/check-out.</p>
        </div>
      </div>

      <div className="flex justify-end gap-3 mb-2">
        <HoverSearch value={search} onChange={setSearch} placeholder="Tìm theo tên phiên..." />
      </div>

      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
        <DataTable
          columns={columns}
          data={rows}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(p) => setPageNumber(p)}
        />
      </div>
    </div>
  );
}

