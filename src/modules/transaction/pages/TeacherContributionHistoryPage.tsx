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
    <div
      className="relative p-6 bg-slate-50 flex flex-col gap-3 min-h-0 overflow-hidden"
      style={{ height: 'var(--content-height, 100vh)' }}
    >
      <div className="flex shrink-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-black">Lịch sử đóng góp quỹ</h2>
          <p className="text-xs text-gray-500">Các khoản đóng góp quỹ của bạn trong hệ thống.</p>
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-start gap-3 min-[900px]:flex-nowrap min-[900px]:justify-end">
          <HoverSearch
            value={search}
            onChange={(v) => {
              setPageNumber(1);
              setSearch(v);
            }}
            placeholder="Tìm theo mã hoặc mô tả..."
          />
          <div className="text-right shrink-0">
            <div className="text-xs text-gray-500">Tổng đã đóng góp</div>
            <div className="text-base font-semibold text-emerald-700">
              {totalAmount.toLocaleString('vi-VN')} đ
            </div>
          </div>
          <Button
            type="button"
            className="h-9 shrink-0 bg-[#2197C0] px-4 text-sm font-medium text-white hover:bg-[#208AAE]"
            onClick={() => setContributeOpen(true)}
          >
            Đóng góp vào quỹ
          </Button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {loading && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-2xl">
            <span className="text-sm text-slate-500">
              Đang tải lịch sử đóng góp...
            </span>
          </div>
        )}
        <DataTable
          columns={columns}
          data={filtered}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(p) => setPageNumber(p)}
          fillHeight
          comfortable
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
