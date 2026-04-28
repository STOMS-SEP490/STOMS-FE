import { useEffect, useMemo, useState, useCallback } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { RotateCcw, Plus, X, Image as ImageIcon } from 'lucide-react';
import { message } from 'antd';

import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { Button } from '@/shared/components/ui/button';
import { Dialog } from '@/shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';

import transactionApi from '../api/transactionApi';
import type { TransactionListItem } from '../transaction';
import { TRANSACTION_TYPE } from '@/constants/status';
import TransactionDetailPanel from '../components/TransactionDetailPanel';
import { walletApi, type WalletListItem } from '../api/walletApi';
import { taskReportApi } from '@/modules/task-report/api/taskReportApi';

const EXP_PAGE = 'expPage';
const EXP_Q = 'expQ';

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
      <span className="font-semibold text-red-600">
        - {Math.abs(row.original.amount ?? 0).toLocaleString('vi-VN')} đ
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

export default function ExpenditureFund() {
  const context = useOutletContext<{ position: string; onCreateExpense?: () => void }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const pageNumber = Math.max(1, Number(searchParams.get(EXP_PAGE) || '1') || 1);
  const pageSize = 10;
  const search = searchParams.get(EXP_Q) ?? '';

  const [detailItem, setDetailItem] = useState<TransactionListItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [data, setData] = useState<TransactionListItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  // ── Create expense modal ──
  const [openCreateExpenseModal, setOpenCreateExpenseModal] = useState(false);
  const [createExpenseAmount, setCreateExpenseAmount] = useState('');
  const [createExpenseDescription, setCreateExpenseDescription] = useState('');
  const [createExpenseFile, setCreateExpenseFile] = useState<File | null>(null);
  const [createExpensePreview, setCreateExpensePreview] = useState('');
  const [createExpenseWalletId, setCreateExpenseWalletId] = useState<number | null>(null);
  const [creatingExpense, setCreatingExpense] = useState(false);
  const [wallets, setWallets] = useState<WalletListItem[]>([]);
  const [walletsLoading, setWalletsLoading] = useState(false);

  const setExpensePageNumber = (n: number) => setSearchParams((prev) => { const next = new URLSearchParams(prev); next.set(EXP_PAGE, String(Math.max(1, n))); return next; });
  const setSearch = (q: string) => setSearchParams((prev) => { const next = new URLSearchParams(prev); if (q.trim()) next.set(EXP_Q, q.trim()); else next.delete(EXP_Q); next.set(EXP_PAGE, '1'); return next; });
  const resetListFilters = () => setSearchParams((prev) => { const next = new URLSearchParams(prev); next.delete(EXP_PAGE); next.delete(EXP_Q); return next; });

  // ── Load wallets ──
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setWalletsLoading(true);
      try {
        const res = await walletApi.getWallets({ pageNumber: 1, pageSize: 50 });
        if (cancelled) return;
        setWallets(res.items ?? []);
        if (res.items && res.items.length > 0) {
          setCreateExpenseWalletId(res.items[0].walletId);
        }
      } catch {
        if (cancelled) return;
        message.error('Không tải được danh sách ví.');
      } finally {
        if (cancelled) return;
        setWalletsLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (context.position === 'toolbar' || context.position === 'header-button') return;
    setLoading(true);
    transactionApi.getTransactions({ pageNumber, pageSize, transactionType: TRANSACTION_TYPE.EXPENSE })
      .then((res) => { setData(res.items ?? []); setTotalItems(res.totalItems ?? 0); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, pageSize, context.position, searchParams]);

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

  const closeDetail = () => { setDetailItem(null); };

  const openCreateExpenseModalHandler = useCallback(() => {
    setOpenCreateExpenseModal(true);
    setCreateExpenseAmount('');
    setCreateExpenseDescription('');
    setCreateExpenseFile(null);
    setCreateExpensePreview('');
    if (wallets.length > 0) {
      setCreateExpenseWalletId(wallets[0].walletId);
    }
  }, [wallets]);

  const closeCreateExpenseModal = useCallback(() => {
    setOpenCreateExpenseModal(false);
    setCreateExpenseAmount('');
    setCreateExpenseDescription('');
    setCreateExpenseFile(null);
    setCreateExpensePreview('');
  }, []);

  const handleCreateExpense = useCallback(async () => {
    const amount = Number(createExpenseAmount.replace(/\D/g, ''));
    if (!amount || amount <= 0) {
      message.warning('Vui lòng nhập số tiền hợp lệ.');
      return;
    }
    if (!createExpenseDescription.trim()) {
      message.warning('Vui lòng nhập mô tả khoản chi.');
      return;
    }
    if (!createExpenseWalletId) {
      message.warning('Vui lòng chọn ví thanh toán.');
      return;
    }

    setCreatingExpense(true);
    try {
      await taskReportApi.addExpense({
        walletId: createExpenseWalletId,
        amount,
        description: createExpenseDescription.trim(),
        paymentImg: createExpenseFile || undefined,
      });
      message.success('Đã tạo khoản chi thành công.');
      closeCreateExpenseModal();
      // Force reload by updating search params
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('_t', Date.now().toString());
        return next;
      });
    } catch (err) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null;
      message.error(msg || 'Tạo khoản chi thất bại.');
    } finally {
      setCreatingExpense(false);
    }
  }, [createExpenseAmount, createExpenseDescription, createExpenseWalletId, createExpenseFile, closeCreateExpenseModal, setSearchParams]);

  const filtered = useMemo(() => data.filter((x) => search.trim() ? x.description.toLowerCase().includes(search.trim().toLowerCase()) : true), [data, search]);

  if (context.position === 'header-button') {
    return (
      <>
        <Button
          type="button"
          size="sm"
          className="shrink-0 gap-1.5 bg-[#2197C0] hover:bg-[#208AAE] text-white text-xs h-9"
          onClick={openCreateExpenseModalHandler}
        >
          <Plus className="h-3.5 w-3.5" />
          Tạo khoản chi
        </Button>

        {/* Modal needs to be here too */}
        <Dialog
          open={openCreateExpenseModal}
          onClose={closeCreateExpenseModal}
          title="Tạo khoản chi"
          description="Tạo khoản chi mới từ ví của câu lạc bộ"
          className="max-w-lg"
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Chọn ví thanh toán *</label>
              {walletsLoading ? (
                <div className="text-sm text-slate-500">Đang tải danh sách ví...</div>
              ) : wallets.length === 0 ? (
                <div className="text-sm text-rose-600">Không có ví nào khả dụng</div>
              ) : (
                <Select 
                  value={createExpenseWalletId?.toString() ?? ''} 
                  onValueChange={(v) => setCreateExpenseWalletId(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn ví thanh toán" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map((wallet) => (
                      <SelectItem key={wallet.walletId} value={wallet.walletId.toString()}>
                        {wallet.walletName}: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(wallet.balance)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Số tiền (VNĐ) *</label>
              <input
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2197C0]"
                placeholder="Nhập số tiền"
                value={createExpenseAmount}
                onChange={(e) => setCreateExpenseAmount(e.target.value.replace(/\D/g, ''))}
              />
              {createExpenseAmount && (
                <p className="mt-1 text-xs text-slate-500">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(createExpenseAmount))}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả *</label>
              <textarea
                className="w-full min-h-[80px] resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2197C0]"
                placeholder="Mô tả khoản chi..."
                value={createExpenseDescription}
                onChange={(e) => setCreateExpenseDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ảnh chứng từ</label>
              {createExpensePreview ? (
                <div className="relative">
                  <img 
                    src={createExpensePreview} 
                    alt="preview" 
                    className="h-32 w-full rounded-lg object-cover border border-slate-200" 
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCreateExpenseFile(null);
                      setCreateExpensePreview('');
                    }}
                    className="absolute top-1 right-1 rounded-full bg-white/80 p-0.5 text-slate-600 hover:text-rose-600 shadow"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-3 py-6 text-xs text-slate-500 hover:border-[#2197C0] hover:text-[#2197C0] transition-colors">
                  <ImageIcon className="h-5 w-5" />
                  Chọn ảnh PNG/JPG (tối đa 5MB)
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      if (!file) return;
                      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
                        message.warning('Vui lòng chọn ảnh PNG hoặc JPG.');
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        message.warning('Ảnh tối đa 5MB.');
                        return;
                      }
                      setCreateExpenseFile(file);
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string') {
                          setCreateExpensePreview(reader.result);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={closeCreateExpenseModal}
                disabled={creatingExpense}
              >
                Hủy
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
                onClick={() => void handleCreateExpense()}
                disabled={creatingExpense || !createExpenseAmount || !createExpenseDescription.trim() || !createExpenseWalletId}
              >
                {creatingExpense ? 'Đang tạo...' : 'Tạo khoản chi'}
              </Button>
            </div>
          </div>
        </Dialog>
      </>
    );
  }

  if (context.position === 'toolbar') {
    return (
      <div className="flex items-center gap-2">
        <HoverSearch placeholder="Tìm theo mô tả..." value={search} onChange={setSearch} />
        <Button 
          variant="outline" 
          size="icon" 
          className="h-9 w-9 shrink-0 bg-white border-slate-200 text-gray-600 hover:bg-gray-50" 
          onClick={resetListFilters} 
          title="Đặt lại bộ lọc"
        >
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
        onPageChange={setExpensePageNumber}
        onRowClick={openDetail}
      />

      {detailItem && (
        <TransactionDetailPanel
          item={detailItem}
          loading={detailLoading}
          onClose={closeDetail}
        />
      )}

      {/* Create Expense Modal */}
      <Dialog
        open={openCreateExpenseModal}
        onClose={closeCreateExpenseModal}
        title="Tạo khoản chi"
        description="Tạo khoản chi mới từ ví của câu lạc bộ"
        className="max-w-lg"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Chọn ví thanh toán *</label>
            {walletsLoading ? (
              <div className="text-sm text-slate-500">Đang tải danh sách ví...</div>
            ) : wallets.length === 0 ? (
              <div className="text-sm text-rose-600">Không có ví nào khả dụng</div>
            ) : (
              <Select 
                value={createExpenseWalletId?.toString() ?? ''} 
                onValueChange={(v) => setCreateExpenseWalletId(Number(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn ví thanh toán" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((wallet) => (
                    <SelectItem key={wallet.walletId} value={wallet.walletId.toString()}>
                      {wallet.walletName}: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(wallet.balance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Số tiền (VNĐ) *</label>
            <input
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2197C0]"
              placeholder="Nhập số tiền"
              value={createExpenseAmount}
              onChange={(e) => setCreateExpenseAmount(e.target.value.replace(/\D/g, ''))}
            />
            {createExpenseAmount && (
              <p className="mt-1 text-xs text-slate-500">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(createExpenseAmount))}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả *</label>
            <textarea
              className="w-full min-h-[80px] resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2197C0]"
              placeholder="Mô tả khoản chi..."
              value={createExpenseDescription}
              onChange={(e) => setCreateExpenseDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ảnh chứng từ</label>
            {createExpensePreview ? (
              <div className="relative">
                <img 
                  src={createExpensePreview} 
                  alt="preview" 
                  className="h-32 w-full rounded-lg object-cover border border-slate-200" 
                />
                <button
                  type="button"
                  onClick={() => {
                    setCreateExpenseFile(null);
                    setCreateExpensePreview('');
                  }}
                  className="absolute top-1 right-1 rounded-full bg-white/80 p-0.5 text-slate-600 hover:text-rose-600 shadow"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-3 py-6 text-xs text-slate-500 hover:border-[#2197C0] hover:text-[#2197C0] transition-colors">
                <ImageIcon className="h-5 w-5" />
                Chọn ảnh PNG/JPG (tối đa 5MB)
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (!file) return;
                    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
                      message.warning('Vui lòng chọn ảnh PNG hoặc JPG.');
                      return;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      message.warning('Ảnh tối đa 5MB.');
                      return;
                    }
                    setCreateExpenseFile(file);
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === 'string') {
                        setCreateExpensePreview(reader.result);
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={closeCreateExpenseModal}
              disabled={creatingExpense}
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
              onClick={() => void handleCreateExpense()}
              disabled={creatingExpense || !createExpenseAmount || !createExpenseDescription.trim() || !createExpenseWalletId}
            >
              {creatingExpense ? 'Đang tạo...' : 'Tạo khoản chi'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
