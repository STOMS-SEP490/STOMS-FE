import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { Button } from '@/shared/components/ui/button';
import {
  contributionApi,
  type ContributionListItem,
} from '../api/contributionApi';
import TeacherContributeModal from './TeacherContributeModal';

const columns: ColumnDef<ContributionListItem>[] = [
  {
    accessorKey: 'contributionId',
    header: 'Mã đóng góp',
  },
  {
    accessorKey: 'amount',
    header: 'Số tiền',
    cell: ({ row }) => {
      const amount = row.original.amount ?? 0;
      return (
        <span className="font-semibold text-green-600">
          + {Math.abs(amount).toLocaleString('vi-VN')} đ
        </span>
      );
    },
  },
  {
    id: 'createdAt',
    header: 'Thời gian',
    cell: ({ row }) => {
      const raw = row.original.createdAt;
      if (!raw) return '—';
      const d = new Date(raw);
      return (
        <div>
          <div>{d.toLocaleDateString('vi-VN')}</div>
          <div className="text-xs text-muted-foreground">
            {d.toLocaleTimeString('vi-VN')}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'description',
    header: 'Mô tả',
  },
  {
    id: 'paymentImg',
    header: 'Chứng từ',
    cell: ({ row }) => {
      const url = row.original.paymentImg;
      if (!url) return '—';
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-600 hover:underline text-xs"
        >
          Xem ảnh
        </a>
      );
    },
  },
];

export default function TeacherContributionHistoryPage() {
  const [items, setItems] = useState<ContributionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [contributeOpen, setContributeOpen] = useState(false);

  const memberId =
    Number(
      JSON.parse(localStorage.getItem('user') || '{}')?.memberId || 0,
    ) || 0;

  const fetchData = async () => {
    if (!memberId) return;
    try {
      setLoading(true);
      const res = await contributionApi.getContributions({
        memberId,
        pageNumber,
        pageSize,
      });
      setItems(res.items ?? []);
      setTotalItems(res.totalItems ?? 0);
    } catch (err) {
      console.error('fetch teacher contributions error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [memberId, pageNumber, pageSize]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (x) =>
        String(x.description || '').toLowerCase().includes(q) ||
        String(x.contributionId || '').includes(q),
    );
  }, [items, search]);

  const totalAmount = useMemo(
    () =>
      items.reduce(
        (sum, x) => sum + (typeof x.amount === 'number' ? x.amount : 0),
        0,
      ),
    [items],
  );

  return (
    <div className="relative p-6 space-y-6">
      {loading && (
        <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-md">
          <span className="text-sm text-slate-500">
            Đang tải lịch sử đóng góp...
          </span>
        </div>
      )}

      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">
            Lịch sử đóng góp quỹ
          </h2>
          <p className="text-xs text-gray-500">
            Các khoản đóng góp quỹ của bạn trong hệ thống.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-gray-500">Tổng đã đóng góp</div>
            <div className="text-base font-semibold text-emerald-700">
              {totalAmount.toLocaleString('vi-VN')} đ
            </div>
          </div>
          <Button
            type="button"
            className="bg-[#2197C0] hover:bg-[#208AAE] text-white h-9 px-4 text-sm font-medium"
            onClick={() => setContributeOpen(true)}
          >
            Đóng góp vào quỹ
          </Button>
        </div>
      </div>

      <div className="flex justify-end gap-3 mb-2">
        <HoverSearch
          value={search}
          onChange={setSearch}
          placeholder="Tìm theo mã hoặc mô tả..."
        />
      </div>

      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
        <DataTable
          columns={columns}
          data={filtered}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(p) => setPageNumber(p)}
        />
      </div>

      <TeacherContributeModal
        open={contributeOpen}
        onClose={() => setContributeOpen(false)}
        onSubmitted={() => {
          setPageNumber(1);
          void fetchData();
        }}
      />
    </div>
  );
}
