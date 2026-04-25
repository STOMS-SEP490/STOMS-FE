import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Modal, message } from 'antd';
import { Plus, RotateCcw, Wallet, Pencil, Trash2, Eye, HandCoins, User, ArrowUpDown } from 'lucide-react';

import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

import type { WalletListItem } from '../api/walletApi';
import { walletApi } from '../api/walletApi';
import TeacherContributeModal from './TeacherContributeModal';

function walletBalanceTextClass(balance: number): string {
  if (balance < 0) return 'font-semibold text-red-600';
  if (balance === 0) return 'font-semibold text-yellow-600';
  return 'font-semibold text-green-600';
}

export default function WalletsManagement() {
  const [search, setSearch] = useState('');
  const [data, setData] = useState<WalletListItem[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const [detailItem, setDetailItem] = useState<WalletListItem | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<WalletListItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const [contributeOpen, setContributeOpen] = useState(false);

  const columns: ColumnDef<WalletListItem>[] = [
    {
      accessorKey: 'walletId',
      header: 'Mã quỹ',
      cell: ({ row }) => (
        <span className="font-semibold text-[#1a7a99]">#{row.original.walletId}</span>
      ),
    },
    {
      accessorKey: 'walletName',
      header: 'Tên quỹ',
      cell: ({ row }) => (
        <span className="font-medium text-slate-900">{row.original.walletName}</span>
      ),
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
      accessorKey: 'description',
      header: 'Mô tả',
      cell: ({ row }) => {
        const d = row.original.description;
        return <span className="text-sm text-slate-600">{d ? (d.length > 60 ? `${d.slice(0, 60)}...` : d) : '—'}</span>;
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
      id: 'actions',
      header: () => <span className="block w-full text-center">Thao tác</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex gap-3">
          <span title="Xem chi tiết">
            <Eye
              size={16}
              className="cursor-pointer text-gray-800"
              onClick={(e) => {
                e.stopPropagation();
                handleViewDetail(row.original);
              }}
            />
          </span>
          <span title="Chỉnh sửa">
            <Pencil
              size={16}
              className="cursor-pointer text-blue-600"
              onClick={(e) => {
                e.stopPropagation();
                setEditItem(row.original);
                setEditName(row.original.walletName);
                setEditDescription(row.original.description || '');
                setEditModalOpen(true);
              }}
            />
          </span>
          <span title="Xóa">
            <Trash2
              size={16}
              className="cursor-pointer text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(row.original);
              }}
            />
          </span>
        </div>
      ),
    },
  ];

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

  useEffect(() => { void fetchData(); }, [pageNumber, pageSize, search]);

  const handleViewDetail = async (item: WalletListItem) => {
    try {
      const full = await walletApi.getById(item.walletId);
      setDetailItem(full);
    } catch {
      message.error('Không tải được chi tiết quỹ');
    }
  };

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name) { message.warning('Vui lòng nhập tên quỹ.'); return; }
    try {
      setCreateLoading(true);
      await walletApi.create({ walletName: name, description: createDescription.trim() || undefined });
      message.success('Đã tạo quỹ.');
      setCreateModalOpen(false);
      setCreateName('');
      setCreateDescription('');
      void fetchData();
    } catch (err: any) {
      // BE trả về BadRequest(message) => error là string trực tiếp
      const errorMsg = typeof err === 'string' ? err : (err?.message || 'Tạo quỹ thất bại.');
      message.error(errorMsg);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editItem) return;
    const name = editName.trim();
    if (!name) { message.warning('Vui lòng nhập tên quỹ.'); return; }
    try {
      setEditLoading(true);
      await walletApi.update(editItem.walletId, { 
        walletName: name, 
        description: editDescription.trim() || undefined 
      });
      message.success('Đã cập nhật quỹ.');
      setEditModalOpen(false);
      setEditItem(null);
      setEditName('');
      setEditDescription('');
      void fetchData();
    } catch (err: any) {
      // BE trả về BadRequest(message) => error là string trực tiếp
      const errorMsg = typeof err === 'string' ? err : (err?.message || 'Cập nhật quỹ thất bại.');
      message.error(errorMsg);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteClick = (item: WalletListItem) => {
    Modal.confirm({
      title: 'Xác nhận xóa quỹ',
      content: `Bạn có chắc chắn muốn xóa quỹ "${item.walletName}"? Hành động này không thể hoàn tác.`,
      okText: 'Xóa',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await walletApi.delete(item.walletId);
          message.success('Đã xóa quỹ.');
          void fetchData();
        } catch (err: any) {
          // BE trả về BadRequest(message) => error là string trực tiếp
          const errorMsg = typeof err === 'string' ? err : (err?.message || 'Xóa quỹ thất bại.');
          message.error(errorMsg);
        }
      },
    });
  };

  return (
    <div className="p-6 pl-8 space-y-4">
      {/* HEADER */}
      <div className="flex justify-between bg-white px-6 py-4 rounded-xl border shadow-sm items-center mb-2">
        <div>
          <h2 className="text-xl font-semibold text-[#1a7a99]">Quản lý quỹ</h2>
          <p className="text-xs text-slate-500">Quản lý các quỹ tài chính trong hệ thống</p>
        </div>
        <div className="flex gap-2">
          <Button
            className="gap-2 bg-[#E4A64E] hover:bg-[#d89940] text-white px-3 py-2 rounded-md"
            onClick={() => setContributeOpen(true)}
          >
            <HandCoins size={16} />
            Đóng góp quỹ
          </Button>
          <Button
            className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md"
            onClick={() => { setCreateName(''); setCreateDescription(''); setCreateModalOpen(true); }}
          >
            <Plus size={16} />
            Tạo quỹ
          </Button>
        </div>
      </div>

      {/* FILTER */}
      <div className="flex justify-end gap-3 flex-wrap mb-2">
        <HoverSearch placeholder="Tìm theo tên quỹ..." value={search} onChange={(v) => { setSearch(v); setPageNumber(1); }} />
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-white border-slate-200 text-gray-600 hover:bg-gray-50"
          onClick={() => { setSearch(''); setPageNumber(1); }} title="Đặt lại bộ lọc"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
        {loading && <div className="text-sm text-gray-500 mb-3">Đang tải...</div>}
        <DataTable
          columns={columns}
          data={data}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setPageNumber}
        />
      </div>

      {/* DETAIL PANEL */}
      {detailItem && (
        <>
          <div className="fixed inset-0 z-40 h-full bg-black/35" onClick={() => setDetailItem(null)} aria-hidden />
          <div className="fixed right-0 top-0 z-50 h-full w-[680px] max-w-[96vw] border-l border-slate-200 bg-white shadow-2xl flex flex-col overflow-hidden">
            <header className="w-full shrink-0 border-b border-slate-200 bg-white">
              <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-400">CHI TIẾT QUỸ</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-[#2197C0]" />
                    <h2 className="text-xl font-semibold text-[#1a7a99]">{detailItem.walletName}</h2>
                  </div>
                </div>
                <button type="button" onClick={() => setDetailItem(null)} className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors" aria-label="Đóng">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4 space-y-6">
              {/* Thông tin cơ bản */}
              <div className="space-y-3 pl-4">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2  ">
                  <Wallet size={14} />
                  Thông tin quỹ
                </h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-2">
                  <div>
                    <div className="text-xs font-medium text-[#2197C0]">Mã quỹ</div>
                    <div className="mt-1 text-sm text-black break-words">#{detailItem.walletId}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-[#2197C0]">Tên quỹ</div>
                    <div className="mt-1 text-sm text-black break-words">{detailItem.walletName}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-[#2197C0]">Số dư hiện tại</div>
                    <div className={`mt-1 text-sm font-semibold break-words ${detailItem.balance != null ? walletBalanceTextClass(Number(detailItem.balance)) : 'text-black'}`}>
                      {detailItem.balance != null ? `${Number(detailItem.balance).toLocaleString('vi-VN')} đ` : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-[#2197C0]">Ngày tạo</div>
                    <div className="mt-1 text-sm text-black break-words">
                      {detailItem.createdAt ? new Date(detailItem.createdAt).toLocaleString('vi-VN') : '—'}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs font-medium text-[#2197C0]">Mô tả</div>
                    <div className="mt-1 text-sm text-black break-words">{detailItem.description || '—'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs font-medium text-[#2197C0]">Cập nhật lần cuối</div>
                    <div className="mt-1 text-sm text-black break-words">
                      {detailItem.updatedAt ? new Date(detailItem.updatedAt).toLocaleString('vi-VN') : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Thông tin chủ quỹ */}
              {detailItem.member && (
                <div className="space-y-3 pt-4 border-t  pl-4">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <User size={14} />
                    Chủ quỹ
                  </h3>
                  <div className="flex items-center gap-3 pt-1">
                    <img
                      src={detailItem.member.avatarUrl || '/img/ava.png'}
                      alt="avatar"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900">{detailItem.member.fullName}</p>
                      <p className="text-xs text-slate-500">{detailItem.member.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Lịch sử giao dịch */}
              {detailItem.transactions && detailItem.transactions.length > 0 && (
                <div className="space-y-3 pt-4 border-t  pl-4">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <ArrowUpDown size={14} />
                    Giao dịch gần đây ({detailItem.transactions.length})
                  </h3>
                  <div className="divide-y pt-1">
                    {detailItem.transactions.map((tx) => (
                      <div key={tx.transactionId} className="py-3 first:pt-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-xs font-semibold text-slate-600">#{tx.transactionId}</span>
                          <span className={`text-sm font-semibold ${tx.transactionType === 1 ? 'text-red-600' : 'text-green-600'}`}>
                            {tx.transactionType === 1 ? '-' : '+'}{Number(tx.amount).toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 mb-1">{tx.description || '—'}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>{tx.createdByMember?.fullName || '—'}</span>
                          <span>{tx.transactionDate ? new Date(tx.transactionDate).toLocaleString('vi-VN') : '—'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* CREATE MODAL */}
      <Modal
        title="Tạo quỹ mới"
        open={createModalOpen}
        onCancel={() => { if (!createLoading) { setCreateModalOpen(false); setCreateName(''); setCreateDescription(''); } }}
        okText="Tạo quỹ"
        cancelText="Hủy"
        confirmLoading={createLoading}
        onOk={handleCreate}
        okButtonProps={{ style: { backgroundColor: '#2197C0', borderColor: '#2197C0' } }}
      >
        <div className="py-2 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên quỹ <span className="text-red-500">*</span></label>
            <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Nhập tên quỹ" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
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

      {/* EDIT MODAL */}
      <Modal
        title="Chỉnh sửa quỹ"
        open={editModalOpen}
        onCancel={() => { 
          if (!editLoading) { 
            setEditModalOpen(false); 
            setEditItem(null);
            setEditName(''); 
            setEditDescription(''); 
          } 
        }}
        okText="Cập nhật"
        cancelText="Hủy"
        confirmLoading={editLoading}
        onOk={handleEdit}
        okButtonProps={{ style: { backgroundColor: '#2197C0', borderColor: '#2197C0' } }}
      >
        <div className="py-2 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên quỹ <span className="text-red-500">*</span></label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nhập tên quỹ" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Nhập mô tả (không bắt buộc)"
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2197C0] focus:border-transparent"
            />
          </div>
        </div>
      </Modal>

      {/* CONTRIBUTE MODAL */}
      <TeacherContributeModal
        open={contributeOpen}
        onClose={() => setContributeOpen(false)}
        onSubmitted={() => void fetchData()}
      />
    </div>
  );
}
