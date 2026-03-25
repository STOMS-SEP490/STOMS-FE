import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { Button } from '@/shared/components/ui/button';
import { type ContributionListItem } from '../api/contributionApi';
import TeacherContributeModal from './TeacherContributeModal';
import { useTeacherContributionHistory } from '../hooks/useTeacherContributionHistory';

const columns: ColumnDef<ContributionListItem>[] = [
  {
    accessorKey: 'contributionId',
    header: 'Mã đóng góp',
  },
  {
    accessorKey: 'amount',
    header: 'Số tiền',
    cell: ({ row }) => {
      const amount = row.original.amount ?? 0;
      return (
        <span className="font-semibold text-green-600">
          + {Math.abs(amount).toLocaleString('vi-VN')} đ
        </span>
      );
    },
  },
  {
    id: 'createdAt',
    header: 'Thời gian',
    cell: ({ row }) => {
      const raw = row.original.createdAt;
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
  },
  {
    id: 'paymentImg',
    header: 'Chứng từ',
    cell: ({ row }) => {
      const url = row.original.paymentImg;
      if (!url) return '—';
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-600 hover:underline text-xs"
        >
          Xem ảnh
        </a>
      );
    },
  },
];

const walletCardThemes = [
  {
    card: 'border-sky-200 bg-sky-50',
    title: 'text-sky-900',
    label: 'text-sky-700/80',
    amount: 'text-sky-700',
  },
  {
    card: 'border-emerald-200 bg-emerald-50',
    title: 'text-emerald-900',
    label: 'text-emerald-700/80',
    amount: 'text-emerald-700',
  },
  {
    card: 'border-violet-200 bg-violet-50',
    title: 'text-violet-900',
    label: 'text-violet-700/80',
    amount: 'text-violet-700',
  },
  {
    card: 'border-amber-200 bg-amber-50',
    title: 'text-amber-900',
    label: 'text-amber-700/80',
    amount: 'text-amber-700',
  },
];

export default function TeacherContributionHistoryPage() {
  const {
    loading,
    walletLoading,
    pageNumber,
    pageSize,
    totalItems,
    search,
    contributeOpen,
    wallets,
    filteredItems,
    totalAmount,
    canViewWalletList,
    setPageNumber,
    setContributeOpen,
    onSearchChange,
    onContributionSubmitted,
  } = useTeacherContributionHistory();

  return (
    <div
      className="relative p-6 bg-slate-50 flex flex-col gap-2 min-h-0 overflow-hidden"
      style={{ height: 'var(--content-height, 100vh)' }}
    >
      <div className="flex shrink-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-black">Lịch sử đóng góp quỹ</h2>
          <p className="text-xs text-gray-500">Các khoản đóng góp quỹ của bạn trong hệ thống.</p>
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-start gap-3 min-[900px]:flex-nowrap min-[900px]:justify-end">
          <HoverSearch
            value={search}
            onChange={onSearchChange}
            placeholder="Tìm theo mã hoặc mô tả..."
          />
          <div className="text-right shrink-0">
            <div className="text-xs text-gray-500">Tổng đã đóng góp</div>
            <div className="text-base font-semibold text-emerald-700">
              {totalAmount.toLocaleString('vi-VN')} đ
            </div>
          </div>
          <Button
            type="button"
            className="h-9 shrink-0 bg-[#2197C0] px-4 text-sm font-medium text-white hover:bg-[#208AAE]"
            onClick={() => setContributeOpen(true)}
          >
            Đóng góp vào quỹ
          </Button>
        </div>
      </div>

      {canViewWalletList && (
        <div className="shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-800">Danh sách ví tiền</h3>
            {walletLoading && <span className="text-xs text-slate-500">Đang tải ví...</span>}
          </div>
          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-3 pb-1">
              {wallets.map((wallet) => {
                const theme =
                  walletCardThemes[Math.abs(wallet.walletId) % walletCardThemes.length];
                return (
                  <div
                    key={wallet.walletId}
                    className={`w-64 shrink-0 rounded-xl border p-3 ${theme.card}`}
                  >
                    <div className={`truncate text-sm font-semibold ${theme.title}`}>
                      {wallet.walletName || 'Không có tên ví'}
                    </div>
                    <div className={`mt-2 text-xs ${theme.label}`}>Số dư hiện tại</div>
                    <div className={`text-base font-semibold ${theme.amount}`}>
                      {Number(wallet.balance ?? 0).toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                );
              })}
              {!walletLoading && wallets.length === 0 && (
                <div className="text-sm text-slate-500">Chưa có ví tiền.</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {loading && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center rounded-2xl">
            <span className="text-sm text-slate-500">
              Đang tải lịch sử đóng góp...
            </span>
          </div>
        )}
        <DataTable
          columns={columns}
          data={filteredItems}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(p) => setPageNumber(p)}
          fillHeight
          comfortable
        />
      </div>

      <TeacherContributeModal
        open={contributeOpen}
        onClose={() => setContributeOpen(false)}
        onSubmitted={onContributionSubmitted}
      />
    </div>
  );
}
