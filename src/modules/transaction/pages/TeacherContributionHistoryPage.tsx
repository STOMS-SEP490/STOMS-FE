import type { ColumnDef } from '@tanstack/react-table';
import { Image } from 'antd';
import { CheckCircle2, WalletCards } from 'lucide-react';
import { useMemo } from 'react';
import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { type ContributionListItem } from '../api/contributionApi';
import TeacherContributeModal from './TeacherContributeModal';
import { useTeacherContributionHistory } from '../hooks/useTeacherContributionHistory';
import { TRANSACTION_TYPE } from '@/constants/status';

function getAmountDisplay(item: ContributionListItem, isManager: boolean) {
  const amount = item.amount ?? 0;
  const abs = Math.abs(amount);
  const isExpenseForNonManager =
    !isManager && item.transactionType === TRANSACTION_TYPE.EXPENSE;

  if (isExpenseForNonManager) {
    return {
      className: 'font-semibold text-red-600',
      text: `- ${abs.toLocaleString('vi-VN')} đ`,
    };
  }

  return {
    className: 'font-semibold text-green-600',
    text: `+ ${abs.toLocaleString('vi-VN')} đ`,
  };
}

const walletCardThemes = [
  {
    card: 'border-[#c8deea] bg-gradient-to-br from-[#f6fbfe] to-[#eef7fc]',
    title: 'text-slate-800',
    label: 'text-slate-500',
    amount: 'text-[#1d5f7a]',
  },
  {
    card: 'border-[#d8e3d6] bg-gradient-to-br from-[#f8fcf7] to-[#f1f8ef]',
    title: 'text-slate-800',
    label: 'text-slate-500',
    amount: 'text-[#2f6b4a]',
  },
  {
    card: 'border-[#ddd8ea] bg-gradient-to-br from-[#faf8fe] to-[#f4f1fb]',
    title: 'text-slate-800',
    label: 'text-slate-500',
    amount: 'text-[#5f4a8a]',
  },
  {
    card: 'border-[#e7dfd0] bg-gradient-to-br from-[#fdfbf6] to-[#f9f5ea]',
    title: 'text-slate-800',
    label: 'text-slate-500',
    amount: 'text-[#7a6030]',
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
    selectedWalletId,
    filteredItems,
    totalAmount,
    canViewWalletList,
    isManager,
    setPageNumber,
    setContributeOpen,
    onSearchChange,
    onSelectWallet,
    onContributionSubmitted,
  } = useTeacherContributionHistory();

  const columns = useMemo<ColumnDef<ContributionListItem>[]>(
    () => {
      const baseColumns: ColumnDef<ContributionListItem>[] = [
        {
        accessorKey: 'amount',
        header: 'Số tiền',
        cell: ({ row }) => {
          const display = getAmountDisplay(row.original, isManager);
          return <span className={display.className}>{display.text}</span>;
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
      ];

      // Chỉ hiện cột chứng từ ở bảng "Tất cả khoản của tôi".
      if (selectedWalletId == null) {
        baseColumns.push({
          id: 'paymentImg',
          header: 'Chứng từ',
          cell: ({ row }) => {
            const url = row.original.paymentImg;
            if (!url) return '—';
            return (
              <div className="flex items-center">
                <Image
                  src={url}
                  alt="Chứng từ"
                  width={44}
                  height={44}
                  className="rounded-md object-cover"
                  preview
                />
              </div>
            );
          },
        });
      }

      return baseColumns;
    },
    [isManager, selectedWalletId],
  );

  return (
    <div
      className="relative flex flex-col gap-2 app-page-bg p-6"
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
          <div className="mb-4 flex flex-col gap-2 min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between">
            <div className="flex items-center gap-2">
              <WalletCards className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-800">Chọn quỹ để xem giao dịch</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2 min-[900px]:justify-end">
              <Button
                type="button"
                variant={selectedWalletId == null ? 'default' : 'outline'}
                className={cn(
                  'h-8 rounded-full px-3 text-xs',
                  selectedWalletId == null
                    ? 'bg-[#2197C0] text-white hover:bg-[#208AAE]'
                    : 'border-slate-200 text-slate-600',
                )}
                onClick={() => onSelectWallet(null)}
              >
                Tất cả khoản của tôi
              </Button>
              {selectedWalletId != null && (
                <span className="rounded-full bg-[#2197C0]/10 px-2.5 py-1 text-xs font-medium text-[#208AAE]">
                  Đang lọc theo quỹ đã chọn
                </span>
              )}
              {walletLoading && <span className="text-xs text-slate-500">Đang tải ví...</span>}
            </div>
          </div>
          <div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {wallets.map((wallet) => {
                const theme =
                  walletCardThemes[Math.abs(wallet.walletId) % walletCardThemes.length];
                const active = selectedWalletId === wallet.walletId;
                return (
                  <button
                    type="button"
                    key={wallet.walletId}
                    onClick={() => onSelectWallet(wallet.walletId)}
                    className={cn(
                      'relative min-h-[104px] rounded-xl border p-3.5 text-left transition-all',
                      theme.card,
                      active
                        ? 'border-[#2197C0] ring-2 ring-[#2197C0]/20 shadow-md'
                        : 'hover:border-slate-300 hover:shadow-sm',
                    )}
                  >
                    {active && (
                      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#2197C0]/12 px-2 py-0.5 text-[11px] font-semibold text-[#208AAE]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Đang chọn
                      </span>
                    )}
                    <div className={`pr-20 text-sm font-semibold leading-snug ${theme.title}`}>
                      {wallet.walletName || 'Không có tên ví'}
                    </div>
                    <div className={`mt-2 text-xs ${theme.label}`}>Số dư hiện tại</div>
                    <div className={`mt-0.5 text-lg font-semibold ${theme.amount}`}>
                      {Number(wallet.balance ?? 0).toLocaleString('vi-VN')} đ
                    </div>
                  </button>
                );
              })}
            </div>
            {!walletLoading && wallets.length === 0 && (
              <div className="text-sm text-slate-500">Chưa có ví tiền.</div>
            )}
          </div>
        </div>
      )}

      <div className="relative flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
