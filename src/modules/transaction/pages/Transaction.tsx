
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
import { TRANSACTION_TYPE } from '@/constants/status';
import { TRANSACTION_TYPE_LABEL } from '@/constants/status';
import type { TransactionListItem } from '../transaction';
import { useTransactions } from '../hooks/useTransactions';

export default function Transactions() {
  const context = useOutletContext<{ position: string }>();

  const [searchParams, setSearchParams] = useSearchParams();
  const openDetailFromUrl = searchParams.get('openDetail');
  const transactionIdFromUrl = searchParams.get('transactionId');

  // Prevent: user closes detail, but URL params update async -> effect runs once more and re-opens.
  const skipNextAutoOpenRef = useRef(false);

  const [search, setSearch] = useState('');

  const { data, loading, pageNumber, pageSize, totalItems, setPageNumber, transactionType, setTransactionType } = useTransactions();

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
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((x) => {
      const t = `${x.walletName ?? ''} ${x.description ?? ''}`.toLowerCase();
      return t.includes(q);
    });
  }, [data, search]);

  if (context.position === 'toolbar') {
    return (
      <div className="flex items-center gap-3">
        <HoverSearch
          placeholder="Tìm theo mô tả / quỹ..."
          value={search}
          onChange={setSearch}
        />

        <Select
          value={transactionType != null ? String(transactionType) : 'all'}
          onValueChange={(v) => {
            if (v === 'all') setTransactionType(undefined);
            else setTransactionType(Number(v));
            setPageNumber(1);
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

        <Button
          variant="secondary"
          className="bg-white"
          onClick={() => {
            setSearch('');
            setTransactionType(undefined);
            setPageNumber(1);
          }}
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
        accessorKey: 'walletName',
        header: 'Quỹ',
      },
      {
        accessorKey: 'transactionType',
        header: 'Loại',
        cell: ({ row }) => {
          const t = row.original.transactionType;
          return (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
              {TRANSACTION_TYPE_LABEL[t] ?? String(t)}
            </span>
          );
        },
      },
      {
        accessorKey: 'amount',
        header: 'Số tiền',
        cell: ({ row }) => {
          const a = row.original.amount ?? 0;
          return (
            <span className={`font-semibold ${a >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {a >= 0 ? '+ ' : '- '}
              {Math.abs(a).toLocaleString('vi-VN')} đ
            </span>
          );
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
        id: 'createdAt',
        header: 'Ngày tạo',
        cell: ({ row }) => (row.original.createdAt ? new Date(row.original.createdAt).toLocaleString('vi-VN') : '—'),
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
              <div className={`font-semibold ${detailItem.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {detailItem.amount >= 0 ? '+ ' : '- '}
                {Math.abs(detailItem.amount).toLocaleString('vi-VN')} đ
              </div>
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
