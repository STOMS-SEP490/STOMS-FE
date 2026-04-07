
import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import type { ColumnDef } from '@tanstack/react-table';
import { Drawer, message } from 'antd';
import { Eye } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import transactionApi from '../api/transactionApi';
import { walletApi } from '../api/walletApi';
import type { WalletListItem } from '../api/walletApi';
import { TRANSACTION_TYPE, TRANSACTION_TYPE_LABEL, getTransactionTypeInfo } from '@/constants/status';
import type { TransactionListItem } from '../transaction';
import { useTransactions } from '../hooks/useTransactions';

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
    return {
      className: 'font-semibold text-red-600',
      text: `- ${abs.toLocaleString('vi-VN')} đ`,
    };
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

  // Prevent: user closes detail, but URL params update async -> effect runs once more and re-opens.
  const skipNextAutoOpenRef = useRef(false);

  const [wallets, setWallets] = useState<WalletListItem[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(false);

  /** Cùng URL cho cả 2 instance Transactions (toolbar + content) do TransactionsLayout có 2 Outlet. */
  const pageNumber = Math.max(1, Number(searchParams.get(TX_PAGE) || '1') || 1);
  const pageSize = 10;
  const txTypeRaw = searchParams.get(TX_TYPE);
  const transactionTypeParsed =
    txTypeRaw && txTypeRaw !== 'all' ? Number(txTypeRaw) : undefined;
  const transactionType =
    transactionTypeParsed !== undefined && !Number.isNaN(transactionTypeParsed)
      ? transactionTypeParsed
      : undefined;
  const txWalletRaw = searchParams.get(TX_WALLET);
  const walletIdParsed =
    txWalletRaw && txWalletRaw !== 'all' ? Number(txWalletRaw) : undefined;
  const walletId =
    walletIdParsed !== undefined && !Number.isNaN(walletIdParsed)
      ? walletIdParsed
      : undefined;
  const search = searchParams.get(TX_Q) ?? '';

  const setPageNumber = (n: number) => {
    setSearchParams((prev) =>
      mergeListSearchParams(prev, { [TX_PAGE]: String(Math.max(1, n)) })
    );
  };

  const setTransactionType = (v: number | undefined) => {
    setSearchParams((prev) =>
      mergeListSearchParams(prev, {
        [TX_TYPE]: v == null ? null : String(v),
        [TX_PAGE]: '1',
      })
    );
  };

  const setWalletId = (v: number | undefined) => {
    setSearchParams((prev) =>
      mergeListSearchParams(prev, {
        [TX_WALLET]: v == null ? null : String(v),
        [TX_PAGE]: '1',
      })
    );
  };

  const setSearch = (q: string) => {
    setSearchParams((prev) =>
      mergeListSearchParams(prev, {
        [TX_Q]: q.trim() ? q : null,
        [TX_PAGE]: '1',
      })
    );
  };

  const resetListFilters = () => {
    setSearchParams((prev) =>
      mergeListSearchParams(prev, {
        [TX_PAGE]: null,
        [TX_TYPE]: null,
        [TX_WALLET]: null,
        [TX_Q]: null,
      })
    );
  };

  const { data, loading, totalItems } = useTransactions({
    pageNumber,
    pageSize,
    transactionType,
    walletId,
    enabled: context.position !== 'toolbar',
  });

  useEffect(() => {
    const load = async () => {
      try {
        setWalletsLoading(true);
        const res = await walletApi.getWallets({ pageNumber: 1, pageSize: 500 });
        setWallets(res.items ?? []);
      } catch {
        setWallets([]);
      } finally {
        setWalletsLoading(false);
      }
    };
    void load();
  }, []);

  const [openDetail, setOpenDetail] = useState(false);
  const [detailItem, setDetailItem] = useState<TransactionListItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const closeDetailFromUrl = () => {
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
      const full = await transactionApi.getById(id);
      setDetailItem(full);
      setOpenDetail(true);
    } catch {
      message.error('Không tải được thông tin giao dịch');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (openDetailFromUrl !== '1') return;
    if (!transactionIdFromUrl) return;
    if (skipNextAutoOpenRef.current) {
      skipNextAutoOpenRef.current = false;
      return;
    }

    const id = Number(transactionIdFromUrl);
    if (!id || Number.isNaN(id)) return;

    if (openDetail && detailItem?.transactionId === id) return;

    void openDetailById(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDetailFromUrl, transactionIdFromUrl, openDetail, detailItem?.transactionId]);

  const filtered = useMemo(() => {
    let rows = data;
    if (walletId != null && !Number.isNaN(walletId)) {
      rows = rows.filter((x) => x.walletId === walletId);
    }
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((x) => {
      const t = `${x.description ?? ''}`.toLowerCase();
      return t.includes(q);
    });
  }, [data, search, walletId]);

  if (context.position === 'toolbar') {
    return (
      <div className="flex items-center gap-3">
        <HoverSearch
          placeholder="Tìm theo mô tả..."
          value={search}
          onChange={setSearch}
        />

        <Select
          value={transactionType != null ? String(transactionType) : 'all'}
          onValueChange={(v) => {
            if (v === 'all') setTransactionType(undefined);
            else setTransactionType(Number(v));
          }}
        >
          <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[190px]">
            <SelectValue placeholder="Loại giao dịch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            <SelectItem value={String(TRANSACTION_TYPE.EXPENSE)}>Chi phí</SelectItem>
            <SelectItem value={String(TRANSACTION_TYPE.CONTRIBUTION)}>Đóng góp</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={walletId != null ? String(walletId) : 'all'}
          onValueChange={(v) => {
            if (v === 'all') setWalletId(undefined);
            else setWalletId(Number(v));
          }}
          disabled={walletsLoading}
        >
          <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[240px]">
            <SelectValue placeholder={walletsLoading ? 'Đang tải quỹ...' : 'Quỹ'} />
          </SelectTrigger>
          <SelectContent className="z-[1100]">
            <SelectItem value="all">Tất cả quỹ</SelectItem>
            {walletId != null &&
              !wallets.some((w) => w.walletId === walletId) && (
                <SelectItem value={String(walletId)}>Quỹ #{walletId}</SelectItem>
              )}
            {wallets.map((w) => (
              <SelectItem key={w.walletId} value={String(w.walletId)}>
                {w.walletName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="secondary"
          className="bg-white"
          onClick={() => resetListFilters()}
          title="Đặt lại bộ lọc"
        >
          Đặt lại
        </Button>
      </div>
    );
  }

  const columns = useMemo<ColumnDef<TransactionListItem>[]>(
    () => [
      {
        accessorKey: 'transactionId',
        header: 'Mã giao dịch',
      },
      {
        accessorKey: 'transactionType',
        header: 'Loại',
        cell: ({ row }) => {
          const t = row.original.transactionType;
          const typeInfo = getTransactionTypeInfo(t);
          return (
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${typeInfo.className}`}>
              {typeInfo.label}
            </span>
          );
        },
      },
      {
        accessorKey: 'amount',
        header: 'Số tiền',
        cell: ({ row }) => {
          const { className, text } = formatTransactionAmountDisplay(
            row.original.amount,
            row.original.transactionType
          );
          return <span className={className}>{text}</span>;
        },
      },
      {
        accessorKey: 'description',
        header: 'Mô tả',
      },
      {
        accessorKey: 'transactionDate',
        header: 'Ngày giao dịch',
        cell: ({ row }) => (row.original.transactionDate ? new Date(row.original.transactionDate).toLocaleDateString('vi-VN') : '—'),
      },
      {
        id: 'actions',
        header: 'Chi tiết',
        enableSorting: false,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => void openDetailById(row.original.transactionId)}
            title="Xem chi tiết"
          >
            <Eye className="w-4 h-4 text-blue-600 cursor-pointer" />
          </button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactionType]
  );

  return (
    <div className="px-6 pt-2 pb-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-black">Quản lý giao dịch</h2>
        {loading && <span className="text-xs text-gray-500">Đang tải dữ liệu...</span>}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPageNumber}
      />

      <Drawer
        open={openDetail}
        onClose={closeDetailFromUrl}
        placement="right"
        width={520}
        title="Chi tiết giao dịch"
      >
        {detailLoading && !detailItem ? (
          <div className="text-sm text-gray-500">Đang tải chi tiết...</div>
        ) : detailItem ? (
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-gray-500">Mã giao dịch</div>
              <div className="font-medium">{detailItem.transactionId}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Quỹ</div>
              <div>{detailItem.walletName ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Loại</div>
              <div>{TRANSACTION_TYPE_LABEL[detailItem.transactionType] ?? detailItem.transactionType}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Số tiền</div>
              {(() => {
                const fmt = formatTransactionAmountDisplay(
                  detailItem.amount,
                  detailItem.transactionType
                );
                return <div className={fmt.className}>{fmt.text}</div>;
              })()}
            </div>
            <div>
              <div className="text-xs text-gray-500">Mô tả</div>
              <div className="whitespace-pre-wrap">{detailItem.description || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Ngày giao dịch</div>
              <div>{detailItem.transactionDate ? new Date(detailItem.transactionDate).toLocaleString('vi-VN') : '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Người tạo</div>
              <div>{detailItem.createdByName ?? detailItem.createdBy ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Ngày tạo</div>
              <div>{detailItem.createdAt ? new Date(detailItem.createdAt).toLocaleString('vi-VN') : '—'}</div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">Không có dữ liệu.</div>
        )}
      </Drawer>
    </div>
  );
}
