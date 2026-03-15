import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { Button } from '@/shared/components/ui/button';
import transactionApi from '../api/transactionApi';
import type { TransactionListItem } from '../transaction';
import TeacherContributeModal from './TeacherContributeModal';

type TeacherTransaction = TransactionListItem & {
  createdAtText?: string;
};

const columns: ColumnDef<TeacherTransaction>[] = [
  {
    accessorKey: 'transactionId',
    header: 'Mã giao dịch',
  },
  {
    accessorKey: 'amount',
    header: 'Số tiền',
    cell: ({ row }) => {
      const amount = row.original.amount ?? 0;
      const isPositive = amount >= 0;
      return (
        <span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? '+' : '-'} {Math.abs(amount).toLocaleString('vi-VN')} đ
        </span>
      );
    },
  },
  {
    accessorKey: 'fundTotal',
    header: 'Số dư sau GD',
    cell: ({ row }) =>
      row.original.fundTotal != null ? (
        <span className="font-medium">{row.original.fundTotal.toLocaleString('vi-VN')} đ</span>
      ) : (
        '—'
      ),
  },
  {
    id: 'createdAt',
    header: 'Thời gian',
    cell: ({ row }) => {
      const raw = row.original.approvedAt as string | null;
      if (!raw) return '—';
      const d = new Date(raw);
      return (
        <div>
          <div>{d.toLocaleDateString('vi-VN')}</div>
          <div className="text-xs text-muted-foreground">{d.toLocaleTimeString('vi-VN')}</div>
        </div>
      );
    },
  },
  {
    accessorKey: 'description',
    header: 'Mô tả',
  },
];

export default function TeacherContributionHistoryPage() {
  const [items, setItems] = useState<TeacherTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [contributeOpen, setContributeOpen] = useState(false);

  // Lấy memberId từ localStorage giống các trang teacher khác
  const memberId = Number(JSON.parse(localStorage.getItem('user') || '{}')?.memberId || 0) || 0;

  useEffect(() => {
    const run = async () => {
      if (!memberId) return;
      try {
        setLoading(true);
        const res = await transactionApi.getTransactions({
          pageNumber,
          pageSize,
          type: 'Contribution',
          memberId,
        } as any);

        let rows = (res.items ?? []) as TeacherTransaction[];
        const q = search.trim().toLowerCase();
        if (q) {
          rows = rows.filter(
            (x) =>
              String(x.description || '').toLowerCase().includes(q) ||
              String(x.transactionId || '').toLowerCase().includes(q),
          );
        }
        setItems(rows);
        setTotalItems(res.totalItems ?? rows.length);
      } catch (err) {
        console.error('fetch teacher contributions error:', err);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [memberId, pageNumber, pageSize, search]);

  const totalAmount = useMemo(
    () => items.reduce((sum, x) => sum + (typeof x.amount === 'number' ? x.amount : 0), 0),
    [items],
  );

  return (
    <div className="relative p-6 space-y-6">
      {loading && (
        <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-md">
          <span className="text-sm text-slate-500">Đang tải lịch sử đóng góp...</span>
        </div>
      )}

      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">Lịch sử đóng góp quỹ</h2>
          <p className="text-xs text-gray-500">Các giao dịch đóng góp quỹ của bạn trong hệ thống.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-gray-500">Tổng đã đóng góp (trang hiện tại)</div>
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
        <HoverSearch value={search} onChange={setSearch} placeholder="Tìm theo mã GD hoặc mô tả..." />
      </div>

      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
        <DataTable
          columns={columns}
          data={items}
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
        }}
      />
    </div>
  );
}

