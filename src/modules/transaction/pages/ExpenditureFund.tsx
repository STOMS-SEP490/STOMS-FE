import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Modal, Skeleton, message } from 'antd';
import { CheckCircle, Hash, RotateCcw, X, XCircle } from 'lucide-react';

import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/components/ui/select';
import { Image } from 'antd';

import type { ExpenseListItem } from '../api/expenseApi';
import { expenseApi } from '../api/expenseApi';
import type { WalletListItem } from '../api/walletApi';
import { walletApi } from '../api/walletApi';
import { getExpenseStatusInfo } from '@/constants/status';

const EXP_PAGE = 'expPage';
const EXP_STATUS = 'expStatus';
const EXP_Q = 'expQ';

// ── Panel helpers ─────────────────────────────────────────────────────────────

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
        <Icon className="h-4 w-4 shrink-0 text-[#2197C0]" strokeWidth={2} aria-hidden />
        <h3 className="text-sm font-semibold text-black">{title}</h3>
      </div>
      <div>{children}</div>
    </section>
  );
}

function MetaRow({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn('py-1.5', className)}>
      <div className="text-xs font-medium text-[#2197C0]">{label}</div>
      <div className="mt-0.5 break-words text-sm text-black">{value}</div>
    </div>
  );
}

// ── Columns ───────────────────────────────────────────────────────────────────

const tableColumns: ColumnDef<ExpenseListItem>[] = [
  {
    accessorKey: 'expenseId',
    header: 'Mã khoản chi',
    cell: ({ row }) => <span className="font-semibold text-[#1a7a99]">#{row.original.expenseId}</span>,
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
    accessorKey: 'status',
    header: 'Trạng thái',
    cell: ({ row }) => {
      const info = getExpenseStatusInfo(row.original.status);
      return <Badge className={cn('border-0 text-xs', info.className)}>{info.label}</Badge>;
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Ngày tạo',
    cell: ({ row }) => row.original.createdAt ? new Date(row.original.createdAt).toLocaleDateString('vi-VN') : '—',
  },
  {
    accessorKey: 'description',
    header: 'Mô tả',
    cell: ({ row }) => <span className="text-sm text-slate-600 line-clamp-2">{row.original.description || '—'}</span>,
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ExpenditureFund() {
  const context = useOutletContext<{ position: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const pageNumber = Math.max(1, Number(searchParams.get(EXP_PAGE) || '1') || 1);
  const pageSize = 10;
  const statusRaw = searchParams.get(EXP_STATUS);
  const filterStatus = statusRaw && statusRaw !== 'all' ? Number(statusRaw) : undefined;
  const normalizedFilterStatus = filterStatus != null && !Number.isNaN(filterStatus) ? filterStatus : undefined;
  const search = searchParams.get(EXP_Q) ?? '';

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
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const setExpensePageNumber = (n: number) => setSearchParams((prev) => { const next = new URLSearchParams(prev); next.set(EXP_PAGE, String(Math.max(1, n))); return next; });
  const setSearch = (q: string) => setSearchParams((prev) => { const next = new URLSearchParams(prev); if (q.trim()) next.set(EXP_Q, q.trim()); else next.delete(EXP_Q); next.set(EXP_PAGE, '1'); return next; });
  const setFilterStatusParam = (v: number | undefined) => setSearchParams((prev) => { const next = new URLSearchParams(prev); if (v == null) next.delete(EXP_STATUS); else next.set(EXP_STATUS, String(v)); next.set(EXP_PAGE, '1'); return next; });
  const resetListFilters = () => setSearchParams((prev) => { const next = new URLSearchParams(prev); next.delete(EXP_PAGE); next.delete(EXP_STATUS); next.delete(EXP_Q); return next; });

  useEffect(() => {
    if (context.position === 'toolbar') return;
    setLoading(true);
    expenseApi.getExpenses({ pageNumber, pageSize, status: normalizedFilterStatus })
      .then((res) => { setData(res.items ?? []); setTotalItems(res.totalItems ?? 0); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, pageSize, normalizedFilterStatus, context.position]);

  useEffect(() => {
    if (!approveModalOpen) return;
    setWalletsLoading(true);
    walletApi.getWallets({ pageNumber: 1, pageSize: 500 })
      .then((res) => { setWallets(res.items ?? []); if (!selectedWalletId && (res.items?.length ?? 0) > 0) setSelectedWalletId(String((res.items ?? [])[0].walletId)); })
      .finally(() => setWalletsLoading(false));
  }, [approveModalOpen]);

  const openDetail = async (item: ExpenseListItem) => {
    setDetailItem(item);
    setDetailLoading(true);
    try {
      const full = await expenseApi.getById(item.expenseId);
      setDetailItem(full);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => { setDetailItem(null); setApproveModalOpen(false); setSelectedWalletId(''); setRejectModalOpen(false); setRejectReason(''); };

  const filtered = useMemo(() => data.filter((x) => search.trim() ? x.description.toLowerCase().includes(search.trim().toLowerCase()) : true), [data, search]);

  if (context.position === 'toolbar') {
    return (
      <div className="flex items-center gap-2">
        <HoverSearch placeholder="Tìm theo mô tả..." value={search} onChange={setSearch} />
        <Select value={normalizedFilterStatus != null ? String(normalizedFilterStatus) : 'all'} onValueChange={(v) => { if (v === 'all') setFilterStatusParam(undefined); else setFilterStatusParam(Number(v)); }}>
          <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[160px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="1">Đang chờ</SelectItem>
            <SelectItem value="2">Đã duyệt</SelectItem>
            <SelectItem value="3">Đã từ chối</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-white border-slate-200 text-gray-600 hover:bg-gray-50" onClick={resetListFilters} title="Đặt lại bộ lọc">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const statusInfo = detailItem ? getExpenseStatusInfo(detailItem.status) : null;

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

      {/* DETAIL PANEL */}
      {detailItem && (
        <>
          <div className="fixed inset-0 z-40 h-full bg-black/35" onClick={closeDetail} aria-hidden />
          <div className={cn('fixed right-0 top-0 z-50 h-full w-[600px] max-w-[96vw]', 'border-l border-slate-200 bg-white shadow-2xl', 'translate-x-0 transition-transform duration-300 ease-out')}>
            <div className="flex h-full flex-col overflow-hidden">
              {/* Header */}
              <header className="w-full shrink-0 border-b border-slate-200 bg-white">
                {detailLoading && !detailItem ? (
                  <div className="px-5 py-5 pr-14"><Skeleton active title={{ width: '55%' }} paragraph={{ rows: 1 }} /></div>
                ) : (
                  <>
                    <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium uppercase tracking-widest text-slate-400">CHI TIẾT KHOẢN CHI</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-semibold text-[#1a7a99]">Khoản chi #{detailItem.expenseId}</h2>
                          {statusInfo && <Badge className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium border-0', statusInfo.className)}>{statusInfo.label}</Badge>}
                        </div>
                      </div>
                      <button type="button" onClick={closeDetail} className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors" aria-label="Đóng">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="grid w-full grid-cols-3 divide-x divide-slate-200 border-t border-slate-200 bg-slate-50">
                      <div className="px-5 py-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Số tiền</p>
                        <p className="mt-0.5 text-sm font-semibold text-red-600">- {Math.abs(detailItem.amount ?? 0).toLocaleString('vi-VN')} đ</p>
                      </div>
                      <div className="px-5 py-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Trạng thái</p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-900">{statusInfo?.label ?? '—'}</p>
                      </div>
                      <div className="px-5 py-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Ngày tạo</p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-900">{detailItem.createdAt ? new Date(detailItem.createdAt).toLocaleDateString('vi-VN') : '—'}</p>
                      </div>
                    </div>
                  </>
                )}
              </header>

              {/* Body */}
              <div className="relative min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4 space-y-4">
                {detailLoading && <div className="pointer-events-none absolute inset-0 z-10 bg-white/45" aria-hidden />}
                <Section icon={Hash} title="Thông tin khoản chi">
                  <div className="pl-4 grid grid-cols-2 gap-x-6">
                    <MetaRow label="Mã khoản chi" value={`#${detailItem.expenseId}`} />
                    <MetaRow label="Mã task report" value={detailItem.taskReportId ? `#${detailItem.taskReportId}` : '—'} />
                    {detailItem.status !== 3 && detailItem.status !== 1 && (
                      <MetaRow label="Mã giao dịch" value={detailItem.transactionId ? `#${detailItem.transactionId}` : '—'} />
                    )}
                    <MetaRow label="Ngày tạo" value={detailItem.createdAt ? new Date(detailItem.createdAt).toLocaleString('vi-VN') : '—'} />
                    <MetaRow label="Mô tả" value={detailItem.description || '—'} className="col-span-2" />
                    {detailItem.status === 3 && (
                      <MetaRow label="Lý do từ chối" value={detailItem.rejectReason || '—'} className="col-span-2" />
                    )}
                    {detailItem.status !== 1 && (
                      <>
                        <MetaRow label="Người duyệt" value={detailItem.approvedByName || '—'} />
                        <MetaRow label="Thời gian duyệt" value={detailItem.approvedAt ? new Date(detailItem.approvedAt).toLocaleString('vi-VN') : '—'} />
                      </>
                    )}
                  </div>
                </Section>

                {detailItem.paymentImg && (
                  <Section icon={Hash} title="Ảnh chứng từ">
                    <div className="pl-4">
                      <Image src={detailItem.paymentImg} alt="Chứng từ" width={160} height={120} style={{ objectFit: 'cover', borderRadius: 6 }} preview={{ mask: 'Xem ảnh' }} />
                    </div>
                  </Section>
                )}

                {detailItem.status === 1 && (
                  <div className="flex gap-2 pl-4">
                    <Button size="sm" className="bg-[#2197C0] hover:bg-[#208AAE] text-white gap-1.5" disabled={actionLoading} onClick={() => { setSelectedWalletId(''); setApproveModalOpen(true); }}>
                      <CheckCircle className="h-4 w-4" /> Duyệt khoản chi
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5" disabled={actionLoading} onClick={() => { setRejectReason(''); setRejectModalOpen(true); }}>
                      <XCircle className="h-4 w-4" /> Từ chối
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Approve Modal */}
      <Modal title="Duyệt khoản chi" open={approveModalOpen}
        onCancel={() => { if (!actionLoading) { setApproveModalOpen(false); setSelectedWalletId(''); } }}
        okText="Đồng ý duyệt" cancelText="Hủy" confirmLoading={actionLoading}
        onOk={async () => {
          const walletId = Number(selectedWalletId);
          if (!selectedWalletId || Number.isNaN(walletId) || walletId <= 0) { message.warning('Vui lòng chọn quỹ chi trả.'); return; }
          if (!detailItem) return;
          try {
            setActionLoading(true);
            await expenseApi.approve({ walletId, expenseIds: [detailItem.expenseId] });
            message.success('Đã duyệt khoản chi.');
            setApproveModalOpen(false);
            setSelectedWalletId('');
            const updated = await expenseApi.getById(detailItem.expenseId);
            setDetailItem(updated);
            setData((prev) => prev.map((x) => x.expenseId === detailItem.expenseId ? updated : x));
          } catch (err: unknown) {
            const msg = err && typeof err === 'object' && 'response' in err ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : null;
            message.error(msg ?? 'Duyệt thất bại.');
          } finally { setActionLoading(false); }
        }}
      >
        <div className="py-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Chọn quỹ chi trả <span className="text-red-500">*</span></label>
          {walletsLoading ? <div className="text-sm text-gray-500">Đang tải danh sách quỹ...</div> : (
            <Select value={selectedWalletId || undefined} onValueChange={setSelectedWalletId}>
              <SelectTrigger className="w-full text-gray-700"><SelectValue placeholder="Chọn quỹ" /></SelectTrigger>
              <SelectContent className="z-[1100]">
                {wallets.map((w) => <SelectItem key={w.walletId} value={String(w.walletId)}>{w.walletName} · {Number(w.balance ?? 0).toLocaleString('vi-VN')} đ</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal title="Từ chối khoản chi" open={rejectModalOpen}
        onCancel={() => { if (!actionLoading) { setRejectModalOpen(false); setRejectReason(''); } }}
        okText="Đồng ý từ chối" cancelText="Hủy" confirmLoading={actionLoading}
        onOk={async () => {
          const reason = rejectReason.trim();
          if (!reason) { message.warning('Vui lòng nhập lý do từ chối.'); return; }
          if (!detailItem) return;
          try {
            setActionLoading(true);
            await expenseApi.reject({ expenseId: detailItem.expenseId, reason });
            message.success('Đã từ chối khoản chi.');
            setRejectModalOpen(false);
            setRejectReason('');
            const updated = await expenseApi.getById(detailItem.expenseId);
            setDetailItem(updated);
            setData((prev) => prev.map((x) => x.expenseId === detailItem.expenseId ? updated : x));
          } catch (err: unknown) {
            const msg = err && typeof err === 'object' && 'response' in err ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : null;
            message.error(msg ?? 'Từ chối thất bại.');
          } finally { setActionLoading(false); }
        }}
      >
        <div className="py-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Lý do từ chối <span className="text-red-500">*</span></label>
          <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Nhập lý do từ chối..." rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2197C0] focus:border-transparent" />
        </div>
      </Modal>
    </div>
  );
}
