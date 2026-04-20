import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useOutletContext } from 'react-router-dom';
import { Drawer, Modal, message } from 'antd';
import { Eye, Plus, RotateCcw } from 'lucide-react';

import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

import type { WalletListItem } from '../api/walletApi';
import { walletApi } from '../api/walletApi';

function walletBalanceTextClass(balance: number): string {
  if (balance < 0) return 'font-semibold text-red-600';
  if (balance === 0) return 'font-semibold text-yellow-600';
  return 'font-semibold text-green-600';
}

const baseColumns: ColumnDef<WalletListItem>[] = [
  {
    accessorKey: 'walletId',
    header: 'Mã quỹ',
  },
  {
    accessorKey: 'walletName',
    header: 'Tên quỹ',
  },
  {
    accessorKey: 'balance',
    header: 'Số dư',
    cell: ({ row }) => {
      const balance = Number(row.original.balance ?? 0);
      return (
        <span className={walletBalanceTextClass(balance)}>
          {balance.toLocaleString('vi-VN')} đ
        </span>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Ngày tạo',
    cell: ({ row }) =>
      row.original.createdAt
        ? new Date(row.original.createdAt).toLocaleDateString('vi-VN')
        : '—',
  },
  {
    accessorKey: 'description',
    header: 'Mô tả',
    cell: ({ row }) => {
      const d = row.original.description;
      return d ? (d.length > 50 ? `${d.slice(0, 50)}...` : d) : '—';
    },
  },
];

export default function WalletsManagement() {
  const context = useOutletContext<{ position: string }>();
  const [search, setSearch] = useState('');
  const [openDetail, setOpenDetail] = useState(false);
  const [detailItem, setDetailItem] = useState<WalletListItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [data, setData] = useState<WalletListItem[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    if (context.position === 'toolbar') return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await walletApi.getWallets({
          pageNumber,
          pageSize,
          walletName: search.trim() || undefined,
        });
        setData(res.items ?? []);
        setTotalItems(res.totalItems ?? 0);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, pageSize, search, context.position]);

  const filtered = data;

  if (context.position === 'toolbar') {
    return (
      <div className="flex gap-3">
        <div className="[&>div]:bg-[#2197C0] [&>div]:hover:bg-[#208AAE] [&>div]:border-[#2197C0] [&_svg]:text-white [&_svg]:stroke-[2.5] [&_input]:text-white [&_input]:font-medium [&_input::placeholder]:text-white/80 [&_input::placeholder]:font-medium">
          <HoverSearch
            placeholder="Tìm theo tên quỹ..."
            value={search}
            onChange={setSearch}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 bg-[#2197C0] hover:bg-[#208AAE] text-white border-[#2197C0]"
          onClick={() => {
            setSearch('');
            setPageNumber(1);
          }}
          title="Đặt lại bộ lọc"
        >
          <RotateCcw />
        </Button>
      </div>
    );
  }

  const columns = useMemo<ColumnDef<WalletListItem>[]>(
    () => [
      ...baseColumns,
      {
        id: 'actions',
        header: 'Chi tiết',
        enableSorting: false,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => {
              setOpenDetail(true);
              setDetailItem(null);
              setDetailLoading(true);
              walletApi
                .getById(row.original.walletId)
                .then((res) => {
                  setDetailItem(res);
                })
                .finally(() => setDetailLoading(false));
            }}
            title="Xem chi tiết"
          >
            <Eye size={16} className="text-gray-700 cursor-pointer" />
          </button>
        ),
      },
    ],
    []
  );

  const refetch = () => {
    walletApi
      .getWallets({ pageNumber, pageSize, walletName: search.trim() || undefined })
      .then((res) => {
        setData(res.items ?? []);
        setTotalItems(res.totalItems ?? 0);
      });
  };

  return (
    <div className="px-6 pt-2 pb-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-black">Quản lý quỹ</h2>
        <div className="flex items-center gap-2">
          {loading && (
            <span className="text-xs text-gray-500">Đang tải dữ liệu...</span>
          )}
          <Button
            size="sm"
            className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
            onClick={() => {
              setCreateName('');
              setCreateDescription('');
              setCreateModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Tạo quỹ
          </Button>
        </div>
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
        onClose={() => {
          setOpenDetail(false);
          setDetailItem(null);
        }}
        placement="right"
        width={480}
        title="Chi tiết quỹ"
      >
        {detailLoading && !detailItem ? (
          <div className="text-sm text-gray-500">Đang tải chi tiết...</div>
        ) : detailItem ? (
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-gray-500">Mã quỹ</div>
              <div className="font-medium">{detailItem.walletId}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Tên quỹ</div>
              <div className="font-medium">{detailItem.walletName}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Mã chủ quỹ</div>
              <div>{detailItem.memberId ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Số dư</div>
              <div
                className={
                  detailItem.balance != null
                    ? walletBalanceTextClass(Number(detailItem.balance))
                    : 'font-semibold text-gray-600'
                }
              >
                {detailItem.balance != null
                  ? `${Number(detailItem.balance).toLocaleString('vi-VN')} đ`
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Mô tả</div>
              <div className="whitespace-pre-wrap">
                {detailItem.description || '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Ngày tạo</div>
              <div>
                {detailItem.createdAt
                  ? new Date(detailItem.createdAt).toLocaleString('vi-VN')
                  : '—'}
              </div>
            </div>
            {detailItem.updatedAt && (
              <div>
                <div className="text-xs text-gray-500">Cập nhật lúc</div>
                <div>
                  {new Date(detailItem.updatedAt).toLocaleString('vi-VN')}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-500">Không có dữ liệu.</div>
        )}
      </Drawer>

      <Modal
        title="Tạo quỹ mới"
        open={createModalOpen}
        onCancel={() => {
          if (!createLoading) {
            setCreateModalOpen(false);
            setCreateName('');
            setCreateDescription('');
          }
        }}
        okText="Tạo quỹ"
        cancelText="Hủy"
        confirmLoading={createLoading}
        onOk={async () => {
          const name = createName.trim();
          if (!name) {
            message.warning('Vui lòng nhập tên quỹ.');
            return;
          }
          try {
            setCreateLoading(true);
            await walletApi.create({
              walletName: name,
              description: createDescription.trim() || undefined,
            });
            message.success('Đã tạo quỹ.');
            setCreateModalOpen(false);
            setCreateName('');
            setCreateDescription('');
            refetch();
          } catch (err: unknown) {
            const msg =
              err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : null;
            message.error(msg ?? 'Tạo quỹ thất bại.');
          } finally {
            setCreateLoading(false);
          }
        }}
      >
        <div className="py-2 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên quỹ <span className="text-red-500">*</span>
            </label>
            <Input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Nhập tên quỹ"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mô tả
            </label>
            <textarea
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              placeholder="Nhập mô tả (không bắt buộc)"
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2197C0] focus:border-transparent"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
