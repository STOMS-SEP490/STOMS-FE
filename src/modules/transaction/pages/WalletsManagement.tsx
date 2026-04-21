import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Modal, message } from 'antd';
import { Plus, RotateCcw, Wallet } from 'lucide-react';

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
];

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

  const handleRowClick = async (item: WalletListItem) => {
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
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null;
      message.error(msg ?? 'Tạo quỹ thất bại.');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="p-6 pl-8 space-y-4">
      {/* HEADER */}
      <div className="flex justify-between bg-white px-6 py-4 rounded-xl border shadow-sm items-center mb-2">
        <div>
          <h2 className="text-xl font-semibold text-[#1a7a99]">Quản lý quỹ</h2>
          <p className="text-xs text-slate-500">Quản lý các quỹ tài chính trong hệ thống</p>
        </div>
        <Button
          className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md"
          onClick={() => { setCreateName(''); setCreateDescription(''); setCreateModalOpen(true); }}
        >
          <Plus size={16} />
          Tạo quỹ
        </Button>
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
          onRowClick={handleRowClick}
        />
      </div>

      {/* DETAIL PANEL */}
      {detailItem && (
        <>
          <div className="fixed inset-0 z-40 h-full bg-black/35" onClick={() => setDetailItem(null)} aria-hidden />
          <div className="fixed right-0 top-0 z-50 h-full w-[520px] max-w-[96vw] border-l border-slate-200 bg-white shadow-2xl flex flex-col overflow-hidden">
            <header className="w-full shrink-0 border-b border-slate-200 bg-white">
              <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-400">CHI TIẾT QUỸ</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-[#2197C0]" />
                    <h2 className="text-xl font-semibold text-[#1a7a99]">{detailItem.walletName}</h2>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Quỹ #{detailItem.walletId}</p>
                </div>
                <button type="button" onClick={() => setDetailItem(null)} className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors" aria-label="Đóng">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="grid w-full grid-cols-2 divide-x divide-slate-200 border-t border-slate-200 bg-slate-50">
                <div className="px-5 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Số dư</p>
                  <p className={`mt-0.5 text-sm font-semibold ${detailItem.balance != null ? walletBalanceTextClass(Number(detailItem.balance)) : 'text-slate-900'}`}>
                    {detailItem.balance != null ? `${Number(detailItem.balance).toLocaleString('vi-VN')} đ` : '—'}
                  </p>
                </div>
                <div className="px-5 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Ngày tạo</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {detailItem.createdAt ? new Date(detailItem.createdAt).toLocaleDateString('vi-VN') : '—'}
                  </p>
                </div>
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4 space-y-3">
              {[
                { label: 'Mã quỹ', value: `#${detailItem.walletId}` },
                { label: 'Tên quỹ', value: detailItem.walletName },
                { label: 'Mã chủ quỹ', value: detailItem.memberId ? `#${detailItem.memberId}` : '—' },
                { label: 'Mô tả', value: detailItem.description || '—' },
                { label: 'Ngày tạo', value: detailItem.createdAt ? new Date(detailItem.createdAt).toLocaleString('vi-VN') : '—' },
                { label: 'Cập nhật lần cuối', value: detailItem.updatedAt ? new Date(detailItem.updatedAt).toLocaleString('vi-VN') : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="py-1.5">
                  <div className="text-xs font-medium text-[#2197C0]">{label}</div>
                  <div className="mt-0.5 text-sm text-black break-words">{value}</div>
                </div>
              ))}
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
    </div>
  );
}
