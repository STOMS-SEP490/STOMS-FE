import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';
import type { ColumnDef } from '@tanstack/react-table';
import { Skeleton, message } from 'antd';
import { CalendarClock, Hash, RotateCcw, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
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
    return { className: 'font-semibold text-red-600', text: `- ${abs.toLocaleString('vi-VN')} đ` };
  }
  const a = amount ?? 0;
  return {
    className: `font-semibold ${a >= 0 ? 'text-green-600' : 'text-red-600'}`,
    text: `${a >= 0 ? '+ ' : '- '}${abs.toLocaleString('vi-VN')} đ`,
  };
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

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

function TransactionDetailPanel({ item, loading, onClose }: { item: TransactionListItem | null; loading: boolean; onClose: () => void }) {
  const typeInfo = item ? getTransactionTypeInfo(item.transactionType) : null;
  const typeLabel = item ? (TRANSACTION_TYPE_LABEL[item.transactionType] ?? String(item.transactionType)) : '—';
  const amountFmt = item ? formatTransactionAmountDisplay(item.amount, item.transactionType) : null;

  return (
    <>
      <div className="fixed inset-0 z-40 h-full bg-black/35" onClick={onClose} aria-hidden />
      <div className={cn(
        'fixed right-0 top-0 z-50 h-full w-[560px] max-w-[96vw]',
        'border-l border-slate-200 bg-white shadow-2xl',
        'translate-x-0 transition-transform duration-300 ease-out',
      )}>
        <div className="flex h-full flex-col overflow-hidden">
          {/* HEADER */}
          <header className="w-full shrink-0 border-b border-slate-200 bg-white">
            {loading && !item ? (
              <div className="px-5 py-5 pr-14">
                <Skeleton active title={{ width: '55%' }} paragraph={{ rows: 1 }} />
              </div>
            ) : item ? (
              <>
                <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-widest text-slate-400">CHI TIẾT GIAO DỊCH</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-[#1a7a99]">Giao dịch #{item.transactionId}</h2>
                      {typeInfo && (
                        <Badge className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium border-0', typeInfo.className)}>
                          {typeLabel}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{item.walletName || '—'}</p>
                  </div>
                  <button type="button" onClick={onClose} className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors" aria-label="Đóng">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {/* Meta bar */}
                <div className="grid w-full grid-cols-3 divide-x divide-slate-200 border-t border-slate-200 bg-slate-50">
                  <div className="px-5 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Số tiền</p>
                    <p className={cn('mt-0.5 text-sm font-semibold', amountFmt?.className)}>{amountFmt?.text ?? '—'}</p>
                  </div>
                  <div className="px-5 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Loại</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">{typeLabel}</p>
                  </div>
                  <div className="px-5 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Ngày giao dịch</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">
                      {item.transactionDate ? new Date(item.transactionDate).toLocaleDateString('vi-VN') : '—'}
                    </p>
                  </div>
                </div>
              </>
            ) : null}
          </header>

          {/* BODY */}
          <div className="relative min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4 space-y-4">
            {loading && item && <div className="pointer-events-none absolute inset-0 z-10 bg-white/45" aria-hidden />}
            {loading && !item ? (
              <Skeleton active paragraph={{ rows: 5 }} />
            ) : item ? (
              <>
                <Section icon={Hash} title="Thông tin giao dịch">
                  <div className="pl-4 grid grid-cols-2 gap-x-6">
                    <MetaRow label="Mã giao dịch" value={`#${item.transactionId}`} />
                    <MetaRow label="Quỹ" value={item.walletName || '—'} />
                    <MetaRow label="Loại" value={
                      typeInfo ? <Badge className={cn('border-0 text-xs', typeInfo.className)}>{typeLabel}</Badge> : typeLabel
                    } />
                    <MetaRow label="Số tiền" value={
                      amountFmt ? <span className={amountFmt.className}>{amountFmt.text}</span> : '—'
                    } />
                    <MetaRow label="Người tạo" value={item.createdByName || '—'} />
                  </div>
                </Section>

                <Section icon={CalendarClock} title="Thời gian & mô tả">
                  <div className="pl-4 grid grid-cols-2 gap-x-6">
                    <MetaRow label="Ngày giao dịch" value={item.transactionDate ? new Date(item.transactionDate).toLocaleString('vi-VN') : '—'} className="col-span-2" />
                    <MetaRow label="Mô tả" value={item.description || '—'} className="col-span-2" />
                  </div>
                </Section>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

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

  const columns = useMemo<ColumnDef<TransactionListItem>[]>(() => [
    {
      accessorKey: 'transactionId',
      header: 'Mã giao dịch',
      cell: ({ row }) => <span className="font-semibold text-[#1a7a99]">#{row.original.transactionId}</span>,
    },
    {
      accessorKey: 'transactionType',
      header: 'Loại',
      cell: ({ row }) => {
        const typeInfo = getTransactionTypeInfo(row.original.transactionType);
        return <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${typeInfo.className}`}>{typeInfo.label}</span>;
      },
    },
    {
      accessorKey: 'amount',
      header: 'Số tiền',
      cell: ({ row }) => {
        const { className, text } = formatTransactionAmountDisplay(row.original.amount, row.original.transactionType);
        return <span className={className}>{text}</span>;
      },
    },
    {
      accessorKey: 'walletName',
      header: 'Quỹ',
      cell: ({ row }) => <span className="text-sm text-slate-700">{row.original.walletName || '—'}</span>,
    },
    {
      accessorKey: 'description',
      header: 'Mô tả',
      cell: ({ row }) => <span className="text-sm text-slate-600 line-clamp-2">{row.original.description || '—'}</span>,
    },
    {
      accessorKey: 'transactionDate',
      header: 'Ngày giao dịch',
      cell: ({ row }) => row.original.transactionDate ? new Date(row.original.transactionDate).toLocaleDateString('vi-VN') : '—',
    },
  ], []);

  return (
    <div className="px-2 pt-2 pb-2">
      {loading && <div className="text-xs text-gray-500 mb-2">Đang tải dữ liệu...</div>}
      <DataTable
        columns={columns}
        data={filtered}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPageNumber}
        onRowClick={(item) => void openDetailById(item.transactionId)}
      />
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
