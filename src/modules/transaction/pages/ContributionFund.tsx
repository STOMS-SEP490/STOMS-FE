import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useOutletContext } from 'react-router-dom';
import { Skeleton } from 'antd';
import { Hash, RotateCcw, X } from 'lucide-react';

import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { Image } from 'antd';

import type { ContributionListItem } from '../api/contributionApi';
import { contributionApi } from '../api/contributionApi';

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

const tableColumns: ColumnDef<ContributionListItem>[] = [
  {
    accessorKey: 'contributionId',
    header: 'Mã đóng góp',
    cell: ({ row }) => <span className="font-semibold text-[#1a7a99]">#{row.original.contributionId}</span>,
  },
  {
    accessorKey: 'memberName',
    header: 'Thành viên',
    cell: ({ row }) => <span className="text-sm font-medium text-slate-900">{row.original.memberName || '—'}</span>,
  },
  {
    accessorKey: 'amount',
    header: 'Số tiền',
    cell: ({ row }) => (
      <span className="font-semibold text-green-600">
        + {Math.abs(row.original.amount ?? 0).toLocaleString('vi-VN')} đ
      </span>
    ),
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

export default function ContributionFund() {
  const context = useOutletContext<{ position: string }>();
  const [search, setSearch] = useState('');
  const [data, setData] = useState<ContributionListItem[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detailItem, setDetailItem] = useState<ContributionListItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (context.position === 'toolbar') return;
    setLoading(true);
    contributionApi.getContributions({ pageNumber, pageSize })
      .then((res) => { setData(res.items ?? []); setTotalItems(res.totalItems ?? 0); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, pageSize, context.position]);

  const openDetail = async (item: ContributionListItem) => {
    setDetailItem(item);
    setDetailLoading(true);
    try {
      const full = await contributionApi.getById(item.contributionId);
      setDetailItem(full);
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = useMemo(() =>
    data.filter((x) => search.trim() ? x.description.toLowerCase().includes(search.trim().toLowerCase()) : true),
    [data, search]
  );

  if (context.position === 'toolbar') {
    return (
      <div className="flex gap-2">
        <HoverSearch placeholder="Tìm theo mô tả giao dịch..." value={search} onChange={setSearch} />
        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-white border-slate-200 text-gray-600 hover:bg-gray-50" onClick={() => setSearch('')} title="Đặt lại bộ lọc">
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
        onPageChange={setPageNumber}
        onRowClick={openDetail}
      />

      {/* DETAIL PANEL */}
      {detailItem && (
        <>
          <div className="fixed inset-0 z-40 h-full bg-black/35" onClick={() => setDetailItem(null)} aria-hidden />
          <div className={cn('fixed right-0 top-0 z-50 h-full w-[560px] max-w-[96vw]', 'border-l border-slate-200 bg-white shadow-2xl', 'translate-x-0 transition-transform duration-300 ease-out')}>
            <div className="flex h-full flex-col overflow-hidden">
              {/* Header */}
              <header className="w-full shrink-0 border-b border-slate-200 bg-white">
                {detailLoading && !detailItem ? (
                  <div className="px-5 py-5 pr-14"><Skeleton active title={{ width: '55%' }} paragraph={{ rows: 1 }} /></div>
                ) : (
                  <>
                    <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium uppercase tracking-widest text-slate-400">CHI TIẾT ĐÓNG GÓP</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-semibold text-[#1a7a99]">Đóng góp #{detailItem.contributionId}</h2>
                        </div>
                        {detailItem.memberName && <p className="mt-1 text-xs text-slate-500">{detailItem.memberName}</p>}
                      </div>
                      <button type="button" onClick={() => setDetailItem(null)} className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors" aria-label="Đóng">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="grid w-full grid-cols-3 divide-x divide-slate-200 border-t border-slate-200 bg-slate-50">
                      <div className="px-5 py-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Số tiền</p>
                        <p className="mt-0.5 text-sm font-semibold text-green-600">+ {Math.abs(detailItem.amount ?? 0).toLocaleString('vi-VN')} đ</p>
                      </div>
                      <div className="px-5 py-3">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Thành viên</p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-900 truncate">{detailItem.memberName || '—'}</p>
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
                <Section icon={Hash} title="Thông tin đóng góp">
                  <div className="pl-4 grid grid-cols-2 gap-x-6">
                    <MetaRow label="Mã đóng góp" value={`#${detailItem.contributionId}`} />
                    <MetaRow label="Mã giao dịch" value={detailItem.transactionId ? `#${detailItem.transactionId}` : '—'} />
                    <MetaRow label="Thành viên" value={detailItem.memberName || '—'} />
                    <MetaRow label="Ngày tạo" value={detailItem.createdAt ? new Date(detailItem.createdAt).toLocaleString('vi-VN') : '—'} />
                    <MetaRow label="Mô tả" value={detailItem.description || '—'} className="col-span-2" />
                  </div>
                </Section>

                {detailItem.paymentImg && (
                  <Section icon={Hash} title="Ảnh chứng từ">
                    <div className="pl-4">
                      <Image src={detailItem.paymentImg} alt="Chứng từ" width={160} height={120} style={{ objectFit: 'cover', borderRadius: 6 }} preview={{ mask: 'Xem ảnh' }} />
                    </div>
                  </Section>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
