import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import type { ColumnDef } from '@tanstack/react-table';
import { message } from 'antd';
import { RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import transactionApi from '../api/transactionApi';
import { walletApi } from '../api/walletApi';
import type { WalletListItem } from '../api/walletApi';
import { TRANSACTION_TYPE, getTransactionTypeInfo } from '@/constants/status';
import type { TransactionListItem } from '../transaction';
import { useTransactions } from '../hooks/useTransactions';
import TransactionDetailPanel from '../components/TransactionDetailPanel';

const TX_PAGE = 'txPage';
const TX_TYPE = 'txType';
const TX_WALLET = 'txWallet';
const TX_Q = 'txQ';

function mergeListSearchParams(
  prev: URLSearchParams,
  updates: Record<string, string | null | undefined>
): URLSearchParams {
  const next = new URLSearchParams(prev);
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined || value === '') next.delete(key);
    else next.set(key, value);
  }
  return next;
}

function formatTransactionAmountDisplay(amount: number | undefined, transactionType: number) {
  const abs = Math.abs(amount ?? 0);
  if (transactionType === TRANSACTION_TYPE.EXPENSE) {
    return { className: 'font-semibold text-red-600', text: `- ${abs.toLocaleString('vi-VN')} đ` };
  }
  const a = amount ?? 0;
  return {
    className: `font-semibold ${a >= 0 ? 'text-green-600' : 'text-red-600'}`,
    text: `${a >= 0 ? '+ ' : '- '}${abs.toLocaleString('vi-VN')} đ`,
  };
}

export default function Transactions() {
  const context = useOutletContext<{ position: string }>();

  const [searchParams, setSearchParams] = useSearchParams();
  const openDetailFromUrl = searchParams.get('openDetail');
  const transactionIdFromUrl = searchParams.get('transactionId');
  const skipNextAutoOpenRef = useRef(false);

  const [wallets, setWallets] = useState<WalletListItem[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(false);

  const pageNumber = Math.max(1, Number(searchParams.get(TX_PAGE) || '1') || 1);
  const pageSize = 10;
  const txTypeRaw = searchParams.get(TX_TYPE);
  const transactionTypeParsed = txTypeRaw && txTypeRaw !== 'all' ? Number(txTypeRaw) : undefined;
  const transactionType = transactionTypeParsed !== undefined && !Number.isNaN(transactionTypeParsed) ? transactionTypeParsed : undefined;
  const txWalletRaw = searchParams.get(TX_WALLET);
  const walletIdParsed = txWalletRaw && txWalletRaw !== 'all' ? Number(txWalletRaw) : undefined;
  const walletId = walletIdParsed !== undefined && !Number.isNaN(walletIdParsed) ? walletIdParsed : undefined;
  const search = searchParams.get(TX_Q) ?? '';

  const setPageNumber = (n: number) => setSearchParams((prev) => mergeListSearchParams(prev, { [TX_PAGE]: String(Math.max(1, n)) }));
  const setTransactionType = (v: number | undefined) => setSearchParams((prev) => mergeListSearchParams(prev, { [TX_TYPE]: v == null ? null : String(v), [TX_PAGE]: '1' }));
  const setWalletId = (v: number | undefined) => setSearchParams((prev) => mergeListSearchParams(prev, { [TX_WALLET]: v == null ? null : String(v), [TX_PAGE]: '1' }));
  const setSearch = (q: string) => setSearchParams((prev) => mergeListSearchParams(prev, { [TX_Q]: q.trim() ? q : null, [TX_PAGE]: '1' }));
  const resetListFilters = () => setSearchParams((prev) => mergeListSearchParams(prev, { [TX_PAGE]: null, [TX_TYPE]: null, [TX_WALLET]: null, [TX_Q]: null }));

  const { data, loading, totalItems } = useTransactions({
    pageNumber, pageSize, transactionType, walletId,
    enabled: context.position !== 'toolbar',
  });

  useEffect(() => {
    walletApi.getWallets({ pageNumber: 1, pageSize: 500 })
      .then((res) => setWallets(res.items ?? []))
      .catch(() => setWallets([]))
      .finally(() => setWalletsLoading(false));
  }, []);

  const [openDetail, setOpenDetail] = useState(false);
  const [detailItem, setDetailItem] = useState<TransactionListItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const closeDetail = () => {
    skipNextAutoOpenRef.current = openDetailFromUrl === '1';
    setOpenDetail(false);
    setDetailItem(null);
    setDetailLoading(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openDetail');
      next.delete('transactionId');
      return next;
    });
  };

  const openDetailById = async (id: number) => {
    try {
      setDetailLoading(true);
      setOpenDetail(true);
      const full = await transactionApi.getById(id);
      setDetailItem(full);
    } catch {
      message.error('Không tải được thông tin giao dịch');
      setOpenDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (openDetailFromUrl !== '1') return;
    if (!transactionIdFromUrl) return;
    if (skipNextAutoOpenRef.current) { skipNextAutoOpenRef.current = false; return; }
    const id = Number(transactionIdFromUrl);
    if (!id || Number.isNaN(id)) return;
    if (openDetail && detailItem?.transactionId === id) return;
    void openDetailById(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDetailFromUrl, transactionIdFromUrl, openDetail, detailItem?.transactionId]);

  const filtered = useMemo(() => {
    let rows = data;
    if (walletId != null && !Number.isNaN(walletId)) rows = rows.filter((x) => x.walletId === walletId);
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((x) => `${x.description ?? ''}`.toLowerCase().includes(q));
  }, [data, search, walletId]);

  // Toolbar slot (inside TransactionsLayout tabs row)
  if (context.position === 'toolbar') {
    return (
      <div className="flex items-center gap-2">
        <HoverSearch placeholder="Tìm theo mô tả..." value={search} onChange={setSearch} />
        <Select value={transactionType != null ? String(transactionType) : 'all'} onValueChange={(v) => { if (v === 'all') setTransactionType(undefined); else setTransactionType(Number(v)); }}>
          <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[160px]">
            <SelectValue placeholder="Loại giao dịch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            <SelectItem value={String(TRANSACTION_TYPE.EXPENSE)}>Chi phí</SelectItem>
            <SelectItem value={String(TRANSACTION_TYPE.CONTRIBUTION)}>Đóng góp</SelectItem>
          </SelectContent>
        </Select>
        <Select value={walletId != null ? String(walletId) : 'all'} onValueChange={(v) => { if (v === 'all') setWalletId(undefined); else setWalletId(Number(v)); }} disabled={walletsLoading}>
          <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[200px]">
            <SelectValue placeholder={walletsLoading ? 'Đang tải quỹ...' : 'Quỹ'} />
          </SelectTrigger>
          <SelectContent className="z-[1100]">
            <SelectItem value="all">Tất cả quỹ</SelectItem>
            {walletId != null && !wallets.some((w) => w.walletId === walletId) && (
              <SelectItem value={String(walletId)}>Quỹ #{walletId}</SelectItem>
            )}
            {wallets.map((w) => (
              <SelectItem key={w.walletId} value={String(w.walletId)}>{w.walletName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-white border-slate-200 text-gray-600 hover:bg-gray-50" onClick={resetListFilters} title="Đặt lại bộ lọc">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Check if in manager tab context (no extra padding needed)
  const isInTabContext = context.position !== 'toolbar';

  const columns = useMemo<ColumnDef<TransactionListItem>[]>(() => {
    const baseColumns: ColumnDef<TransactionListItem>[] = [
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
    ];

    // Chỉ hiện cột "Loại" khi xem theo quỹ cụ thể
    if (walletId != null) {
      baseColumns.push({
        accessorKey: 'transactionType',
        header: 'Loại',
        cell: ({ row }) => {
          const typeInfo = getTransactionTypeInfo(row.original.transactionType);
          return (
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${typeInfo.className}`}>
              {typeInfo.label}
            </span>
          );
        },
      });
    }

    baseColumns.push(
      {
        accessorKey: 'amount',
        header: 'Số tiền',
        cell: ({ row }) => {
          const { className, text } = formatTransactionAmountDisplay(row.original.amount, row.original.transactionType);
          return <span className={className}>{text}</span>;
        },
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
    );

    // Chỉ hiện cột "Quỹ" khi xem tất cả
    if (walletId == null) {
      baseColumns.push({
        accessorKey: 'walletName',
        header: 'Quỹ',
        cell: ({ row }) => <span className="text-sm text-slate-700">{row.original.walletName || '—'}</span>,
      });
    }

    return baseColumns;
  }, [walletId]);

  return (
    <div className={isInTabContext ? 'space-y-0' : 'px-2 pt-2 pb-2 space-y-2'}>
      {/* Table */}
      <div className="relative flex flex-col bg-white p-2">
        {loading && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
            <span className="text-sm text-slate-500">
              Đang tải giao dịch...
            </span>
          </div>
        )}
        <DataTable
          columns={columns}
          data={filtered}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setPageNumber}
          onRowClick={(item) => void openDetailById(item.transactionId)}
        />
      </div>

      {openDetail && (
        <TransactionDetailPanel
          item={detailItem}
          loading={detailLoading}
          onClose={closeDetail}
        />
      )}
    </div>
  );
}
