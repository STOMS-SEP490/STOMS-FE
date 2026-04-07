import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useOutletContext } from 'react-router-dom';
import { Drawer, Modal, message } from 'antd';
import { Eye, RotateCcw } from 'lucide-react';

import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

import type { ExpenseListItem } from '../api/expenseApi';
import { expenseApi } from '../api/expenseApi';
import type { WalletListItem } from '../api/walletApi';
import { walletApi } from '../api/walletApi';
import { getExpenseStatusInfo } from '@/constants/status';

const baseColumns: ColumnDef<ExpenseListItem>[] = [
  {
    accessorKey: 'expenseId',
    header: 'Mã khoản chi',
  },
  {
    accessorKey: 'amount',
    header: 'Số tiền',
    cell: ({ row }) => {
      const amount = row.original.amount ?? 0;
      return (
        <span className="font-semibold text-red-600">
          - {Math.abs(amount).toLocaleString('vi-VN')} đ
        </span>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Trạng thái',
    cell: ({ row }) => {
      const info = getExpenseStatusInfo(row.original.status);
      return <Badge className={info.className}>{info.label}</Badge>;
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
  },
];

export default function ExpenditureFund() {
  const context = useOutletContext<{ position: string }>();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<number | undefined>(undefined);
  const [openDetail, setOpenDetail] = useState(false);
  const [detailItem, setDetailItem] = useState<ExpenseListItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [wallets, setWallets] = useState<WalletListItem[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [data, setData] = useState<ExpenseListItem[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (context.position === 'toolbar') return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await expenseApi.getExpenses({
          pageNumber,
          pageSize,
          status: filterStatus,
        });
        setData(res.items ?? []);
        setTotalItems(res.totalItems ?? 0);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, pageSize, filterStatus, context.position]);

  useEffect(() => {
    if (!approveModalOpen) return;
    const fetchWallets = async () => {
      try {
        setWalletsLoading(true);
        const res = await walletApi.getWallets({
          pageNumber: 1,
          pageSize: 500,
        });
        setWallets(res.items ?? []);
        if (!selectedWalletId && (res.items?.length ?? 0) > 0) {
          setSelectedWalletId(String((res.items ?? [])[0].walletId));
        }
      } finally {
        setWalletsLoading(false);
      }
    };
    fetchWallets();
  }, [approveModalOpen]);

  const filtered = useMemo(
    () =>
      data.filter((x) =>
        search.trim()
          ? x.description.toLowerCase().includes(search.trim().toLowerCase())
          : true
      ),
    [data, search]
  );

  if (context.position === 'toolbar') {
    // Không render filter ở toolbar cho trang này, chỉ dùng filter ở phần content chính
    return null;
  }

  const columns = useMemo<ColumnDef<ExpenseListItem>[]>(
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
              expenseApi
                .getById(row.original.expenseId)
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

  return (
    <div className="px-6 pt-2 pb-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-black">Quản lý khoản chi</h2>
        {loading && (
          <span className="text-xs text-gray-500">Đang tải dữ liệu...</span>
        )}
      </div>

      <div className="flex justify-end gap-3 mb-2">
        <HoverSearch
          placeholder="Tìm theo mô tả..."
          value={search}
          onChange={setSearch}
        />
        <div className="flex items-center gap-3">
          <Select
            value={filterStatus != null ? String(filterStatus) : 'all'}
            onValueChange={(v) => {
              if (v === 'all') setFilterStatus(undefined);
              else setFilterStatus(Number(v));
              setPageNumber(1);
            }}
          >
            <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[190px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="1">Đang chờ</SelectItem>
              <SelectItem value="2">Đã duyệt</SelectItem>
              <SelectItem value="3">Đã từ chối</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="secondary"
            className="bg-white"
            onClick={() => {
              setSearch('');
              setFilterStatus(undefined);
              setPageNumber(1);
            }}
            title="Đặt lại bộ lọc"
          >
            <RotateCcw />
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
          setApproveModalOpen(false);
          setSelectedWalletId('');
          setRejectModalOpen(false);
          setRejectReason('');
        }}
        placement="right"
        width={480}
        title="Chi tiết khoản chi"
      >
        {detailLoading && !detailItem ? (
          <div className="text-sm text-gray-500">Đang tải chi tiết...</div>
        ) : detailItem ? (
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-gray-500">Mã khoản chi</div>
              <div className="font-medium">{detailItem.expenseId}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Mã task report</div>
              <div>{detailItem.taskReportId ?? '—'}</div>
            </div>
            {detailItem.status !== 3 && detailItem.status !== 1 && (
              <div>
                <div className="text-xs text-gray-500">Mã giao dịch</div>
                <div>{detailItem.transactionId ?? '—'}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-gray-500">Số tiền</div>
              <div className="font-semibold text-red-600">
                {detailItem.amount != null
                  ? `- ${Math.abs(detailItem.amount).toLocaleString('vi-VN')} đ`
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Trạng thái</div>
              <div>
                {getExpenseStatusInfo(detailItem.status).label}
              </div>
            </div>
            {detailItem.status === 1 && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
                  disabled={actionLoading}
                  onClick={() => {
                    setSelectedWalletId('');
                    setApproveModalOpen(true);
                  }}
                >
                  Duyệt khoản chi
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  disabled={actionLoading}
                  onClick={() => {
                    setRejectReason('');
                    setRejectModalOpen(true);
                  }}
                >
                  Từ chối
                </Button>
              </div>
            )}
            {detailItem.status !== 1 && (
              <div>
                <div className="text-xs text-gray-500">Người duyệt</div>
                <div>{detailItem.approvedByName ?? '—'}</div>
              </div>
            )}
            {detailItem.status !== 1 && (
              <div>
                <div className="text-xs text-gray-500">Thời gian duyệt</div>
                <div>
                  {detailItem.approvedAt
                    ? new Date(detailItem.approvedAt).toLocaleString('vi-VN')
                    : '—'}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs text-gray-500">Ngày tạo</div>
              <div>
                {detailItem.createdAt
                  ? new Date(detailItem.createdAt).toLocaleString('vi-VN')
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Mô tả</div>
              <div className="whitespace-pre-wrap">
                {detailItem.description || '—'}
              </div>
            </div>
            {detailItem.status === 3 && (
              <div>
                <div className="text-xs text-gray-500">Lý do từ chối</div>
                <div className="whitespace-pre-wrap">
                  {detailItem.rejectReason || '—'}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs text-gray-500">Ảnh chứng từ</div>
              {detailItem.paymentImg ? (
                <a
                  href={detailItem.paymentImg}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  Xem ảnh
                </a>
              ) : ( 
                <div>—</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">Không có dữ liệu.</div>
        )}
      </Drawer>

      <Modal
        title="Duyệt khoản chi"
        open={approveModalOpen}
        onCancel={() => {
          if (!actionLoading) {
            setApproveModalOpen(false);
            setSelectedWalletId('');
          }
        }}
        okText="Đồng ý duyệt"
        cancelText="Hủy"
        confirmLoading={actionLoading}
        onOk={async () => {
          const walletId = Number(selectedWalletId);
          if (!selectedWalletId || Number.isNaN(walletId) || walletId <= 0) {
            message.warning('Vui lòng chọn quỹ chi trả.');
            return;
          }
          if (!detailItem) return;
          try {
            setActionLoading(true);
            await expenseApi.approve({
              walletId,
              expenseIds: [detailItem.expenseId],
            });
            message.success('Đã duyệt khoản chi.');
            setApproveModalOpen(false);
            setSelectedWalletId('');
            const updated = await expenseApi.getById(detailItem.expenseId);
            setDetailItem(updated);
            setData((prev) =>
              prev.map((x) =>
                x.expenseId === detailItem.expenseId ? updated : x
              )
            );
          } catch (err: unknown) {
            const msg =
              err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data
                    ?.message
                : null;
            message.error(msg ?? 'Duyệt thất bại.');
          } finally {
            setActionLoading(false);
          }
        }}
      >
        <div className="py-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chọn quỹ chi trả <span className="text-red-500">*</span>
          </label>
          {walletsLoading ? (
            <div className="text-sm text-gray-500">Đang tải danh sách quỹ...</div>
          ) : (
            <Select
              value={selectedWalletId || undefined}
              onValueChange={setSelectedWalletId}
            >
              <SelectTrigger className="w-full text-gray-700">
                <SelectValue placeholder="Chọn quỹ" />
              </SelectTrigger>
              <SelectContent className="z-[1100]">
                {wallets.map((w) => (
                  <SelectItem key={w.walletId} value={String(w.walletId)}>
                    {w.walletName} · {Number(w.balance ?? 0).toLocaleString('vi-VN')} đ
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </Modal>

      <Modal
        title="Từ chối khoản chi"
        open={rejectModalOpen}
        onCancel={() => {
          if (!actionLoading) {
            setRejectModalOpen(false);
            setRejectReason('');
          }
        }}
        okText="Đồng ý từ chối"
        cancelText="Hủy"
        confirmLoading={actionLoading}
        onOk={async () => {
          const reason = rejectReason.trim();
          if (!reason) {
            message.warning('Vui lòng nhập lý do từ chối.');
            return;
          }
          if (!detailItem) return;
          try {
            setActionLoading(true);
            await expenseApi.reject({
              expenseId: detailItem.expenseId,
              reason,
            });
            message.success('Đã từ chối khoản chi.');
            setRejectModalOpen(false);
            setRejectReason('');
            const updated = await expenseApi.getById(detailItem.expenseId);
            setDetailItem(updated);
            setData((prev) =>
              prev.map((x) => (x.expenseId === detailItem.expenseId ? updated : x))
            );
          } catch (err: unknown) {
            const msg =
              err && typeof err === 'object' && 'response' in err
                ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                : null;
            message.error(msg ?? 'Từ chối thất bại.');
          } finally {
            setActionLoading(false);
          }
        }}
      >
        <div className="py-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lý do từ chối <span className="text-red-500">*</span>
          </label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Nhập lý do từ chối..."
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2197C0] focus:border-transparent"
          />
        </div>
      </Modal>
    </div>
  );
}
