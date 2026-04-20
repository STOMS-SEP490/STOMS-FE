import { X } from 'lucide-react';
import type { ContractListItem } from '../contract';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  contract: ContractListItem | null;
  loading?: boolean;
  roleLabel?: string | null;
};

function formatDateTime(date?: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleString('vi-VN');
}

function getSessionTitle(session: ContractListItem['session']): string {
  const s = session as { sessionTitle?: string; title?: string } | undefined;
  const t = (s?.sessionTitle || s?.title || '').trim();
  return t || '—';
}

export default function ContractDetailSidebar({ open, onClose, contract, loading, roleLabel }: Props) {
  if (!open) return null;

  if (loading || !contract) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} aria-hidden />
        <div className={cn(
          'fixed right-0 top-0 z-50 h-full w-full max-w-xl',
          'border-l border-slate-200 bg-white shadow-xl',
          'transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}>
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <span className="text-xs font-medium uppercase tracking-widest text-slate-400">CHI TIẾT HỢP ĐỒNG</span>
              <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" aria-label="Đóng">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-1 items-center justify-center">
              <span className="text-sm text-slate-400">{loading ? 'Đang tải...' : 'Không có dữ liệu'}</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  const lecturer = contract.createdByUser?.member;
  const lecturerName = lecturer?.fullName ?? '—';
  const statusLabel = contract.isPaid === true ? 'Đã thanh toán' : contract.isPaid === false ? 'Chưa thanh toán' : 'Không rõ';
  const statusBadgeClass = contract.isPaid === true
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    : contract.isPaid === false
      ? 'bg-amber-50 text-amber-800 border border-amber-200'
      : 'bg-slate-100 text-slate-600 border border-slate-200';

  const amountFormatted = contract.amount != null ? `${contract.amount.toLocaleString('vi-VN')} đ` : '—';
  const sessionTitle = getSessionTitle(contract.session);
  const modeLabel = contract.session?.isOnline == null ? 'Không rõ' : contract.session.isOnline ? 'Trực tuyến' : 'Trực tiếp';

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} aria-hidden />
      <div className={cn(
        'fixed right-0 top-0 z-50 h-full w-full max-w-xl',
        'border-l border-slate-200 bg-white shadow-xl',
        'transition-transform duration-200 ease-out',
        open ? 'translate-x-0' : 'translate-x-full'
      )}>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="shrink-0 border-b border-slate-100 px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-widest text-slate-400">CHI TIẾT HỢP ĐỒNG</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-[#1a7a99]">
                    Hợp đồng {contract.contractCode}
                  </h2>
                  <Badge className={cn('text-xs font-medium px-2.5 py-0.5 rounded-full', statusBadgeClass)}>
                    {statusLabel}
                  </Badge>
                </div>
                {/* Quick meta */}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span># {contract.contractCode}</span>
                  <span>·</span>
                  <span>#{contract.contractId}</span>
                  <span>·</span>
                  <span className="font-semibold text-emerald-700 tabular-nums">{amountFormatted}</span>
                  <span>·</span>
                  <span>{lecturerName}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {/* Section: Thông tin hợp đồng */}
            <div className="border-b border-slate-100 px-6 py-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">Thông tin hợp đồng</p>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
                <Field label="Mã hợp đồng" value={contract.contractCode} />
                <Field label="ID hợp đồng" value={String(contract.contractId)} />
                <Field label="Số tiền" value={
                  <span className="font-semibold text-emerald-700 tabular-nums">{amountFormatted}</span>
                } />
                <Field label="Ngày tạo" value={formatDateTime(contract.createdAt)} />
                <Field label="Ngày cập nhật" value={formatDateTime(contract.updatedAt)} className="col-span-2" />
              </dl>
            </div>

            {/* Section: Thông tin giảng viên */}
            <div className="border-b border-slate-100 px-6 py-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">Thông tin giảng viên</p>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
                <Field label="Họ tên" value={lecturerName} />
                <Field label="Email" value={contract.createdByUser?.email ?? '—'} />
                <Field label="Số điện thoại" value={lecturer?.phone ?? '—'} />
                <Field label="Địa chỉ" value={lecturer?.address ?? '—'} />
                <Field label="CCCD" value={lecturer?.cin ?? '—'} />
                <Field label="Ngân hàng" value={
                  lecturer?.bankName && lecturer?.bankCode
                    ? `${lecturer.bankName} · ${lecturer.bankCode}`
                    : '—'
                } />
                <Field label="Mã số thuế" value={lecturer?.taxNumber ?? '—'} className="col-span-2" />
              </dl>
            </div>

            {/* Section: Thông tin buổi */}
            <div className="px-6 py-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">Thông tin buổi</p>
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-sm font-semibold text-[#1a7a99]">{sessionTitle}</span>
                {contract.session?.sessionNo != null && (
                  <span className="text-xs font-medium text-slate-500 tabular-nums">
                    Buổi {contract.session.sessionNo}
                  </span>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
                <Field
                  label="Thời gian"
                  value={
                    contract.session?.startAt && contract.session?.endAt
                      ? `${formatDateTime(contract.session.startAt)} → ${formatDateTime(contract.session.endAt)}`
                      : '—'
                  }
                  className="col-span-2"
                />
                <Field label="Địa điểm" value={contract.session?.location ?? '—'} />
                <Field label="Hình thức" value={modeLabel} />
                <Field label="Vai trò" value={roleLabel ?? '—'} />
              </dl>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-900 break-words">{value}</dd>
    </div>
  );
}
