import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useOutletContext } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';

import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { Button } from '@/shared/components/ui/button';

import transactionApi from '../api/transactionApi';
import type { TransactionListItem } from '../transaction';
import { TRANSACTION_TYPE } from '@/constants/status';
import TransactionDetailPanel from '../components/TransactionDetailPanel';

// ── Columns ───────────────────────────────────────────────────────────────────

const tableColumns: ColumnDef<TransactionListItem>[] = [
  {
    accessorKey: 'transactionId',
    header: 'Mã giao dịch',
    cell: ({ row }) => <span className="font-mono text-sm">#{row.original.transactionId}</span>,
  },
  {
    accessorKey: 'createdByName',
    header: 'Người giao dịch',
    cell: ({ row }) => {
      const name = row.original.createdByName;
      const email = row.original.createdByEmail;
      const avatar = row.original.createdByAvatar;
      
      return (
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-100">
            {avatar ? (
              <img
                src={avatar}
                alt={name || 'Avatar'}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-medium text-slate-500">
                {name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-slate-900">{name || '—'}</div>
            <div className="text-xs text-slate-500">{email || '—'}</div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'amount',
    header: 'Số tiền',
    cell: ({ row }) => (
      <span className="font-semibold text-green-600">
        + {Math.abs(row.original.amount ?? 0).toLocaleString('vi-VN')} đ
      </span>
    ),
  },
  {
    id: 'transactionDate',
    header: 'Thời gian',
    cell: ({ row }) => {
      const raw = row.original.transactionDate;
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
    cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.description || '—'}</span>,
  },
  {
    accessorKey: 'walletName',
    header: 'Quỹ',
    cell: ({ row }) => <span className="text-sm text-slate-700">{row.original.walletName || '—'}</span>,
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ContributionFund() {
  const context = useOutletContext<{ position: string }>();
  const [search, setSearch] = useState('');
  const [data, setData] = useState<TransactionListItem[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detailItem, setDetailItem] = useState<TransactionListItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (context.position === 'toolbar') return;
    setLoading(true);
    transactionApi.getTransactions({ pageNumber, pageSize, transactionType: TRANSACTION_TYPE.CONTRIBUTION })
      .then((res) => { setData(res.items ?? []); setTotalItems(res.totalItems ?? 0); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, pageSize, context.position]);

  const openDetail = async (item: TransactionListItem) => {
    setDetailItem(item);
    setDetailLoading(true);
    try {
      const full = await transactionApi.getById(item.transactionId);
      setDetailItem(full);
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = useMemo(() =>
    data.filter((x) => search.trim() ? x.description.toLowerCase().includes(search.trim().toLowerCase()) : true),
    [data, search]
  );

  if (context.position === 'toolbar') {
    return (
      <div className="flex gap-2">
        <HoverSearch placeholder="Tìm theo mô tả giao dịch..." value={search} onChange={setSearch} />
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-white border-slate-200 text-gray-600 hover:bg-gray-50" onClick={() => setSearch('')} title="Đặt lại bộ lọc">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="px-2 pt-2 pb-2">
      {loading && <div className="text-xs text-gray-500 mb-2">Đang tải dữ liệu...</div>}
      <DataTable
        columns={tableColumns}
        data={filtered}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPageNumber}
        onRowClick={openDetail}
      />

      {detailItem && (
        <TransactionDetailPanel
          item={detailItem}
          loading={detailLoading}
          onClose={() => setDetailItem(null)}
        />
      )}
    </div>
  );
}
