import type { LucideIcon } from 'lucide-react';
import {
  X,
  CalendarClock,
  FileText,
  Hash,
  GraduationCap,
  MapPin,
  Monitor,
  User,
  Mail,
  Phone,
  Home,
  CreditCard,
  Landmark,
  Receipt,
  Clock,
} from 'lucide-react';
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
        <div className="fixed inset-0 z-40 h-full bg-black/35" onClick={onClose} aria-hidden />
        <div
          className={cn(
            'fixed right-0 top-0 z-50 h-full w-full max-w-2xl',
            'border-l border-slate-200/80 bg-white shadow-2xl',
            'transition-transform duration-300 ease-out',
            open ? 'translate-x-0' : 'translate-x-full'
          )}
        >
          <div className="flex h-full flex-col overflow-hidden">
            <header className="shrink-0 bg-gradient-to-b from-slate-50/90 to-white px-5 pb-4 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Chi tiết hợp đồng</p>
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900">Đang tải…</h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Đóng"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>
            <div className="flex flex-1 items-center justify-center bg-slate-50/70 px-5">
              <span className="text-sm text-slate-500">
                {loading ? 'Đang tải chi tiết hợp đồng...' : 'Không có dữ liệu hợp đồng'}
              </span>
            </div>
          </div>
        </div>
      </>
    );
  }

  const lecturer = contract.createdByUser?.member;
  const lecturerName = lecturer?.fullName ?? '—';

  const statusLabel =
    contract.isPaid === true ? 'Đã thanh toán' : contract.isPaid === false ? 'Chưa thanh toán' : 'Không rõ';
  const statusBadgeClass =
    contract.isPaid === true
      ? 'border-0 bg-emerald-100 text-emerald-800'
      : contract.isPaid === false
        ? 'border-0 bg-amber-100 text-amber-900'
        : 'border-0 bg-slate-200 text-slate-700';

  const amountFormatted =
    contract.amount != null ? `${contract.amount.toLocaleString('vi-VN')} đ` : '—';

  const sessionTitle = getSessionTitle(contract.session);
  const modeLabel =
    contract.session?.isOnline == null
      ? 'Không rõ'
      : contract.session.isOnline
        ? 'Online'
        : 'Offline';

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 h-full bg-black/35" onClick={onClose} aria-hidden />
      )}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full max-w-2xl',
          'border-l border-slate-200/80 bg-white shadow-2xl',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <header className="shrink-0 bg-gradient-to-b from-slate-50/90 to-white px-5 pb-4 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Chi tiết hợp đồng</p>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-semibold tracking-tight text-slate-900">
                    Hợp đồng {contract.contractCode}
                  </h2>
                  <Badge className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', statusBadgeClass)}>
                    {statusLabel}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <HeaderChip icon={Hash} label={contract.contractCode} title="Mã hợp đồng" />
                  <HeaderChip icon={Receipt} label={`#${contract.contractId}`} title="ID hợp đồng" />
                  <HeaderChip
                    icon={FileText}
                    label={amountFormatted}
                    title="Số tiền"
                    accent="emerald"
                  />
                  <HeaderChip icon={User} label={lecturerName} title="Giảng viên" />
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-5 py-5">
            <div className="space-y-8">
              <Section icon={FileText} title="Thông tin hợp đồng" tone="indigo">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    <MetaRow icon={Hash} label="Mã hợp đồng" value={contract.contractCode} />
                    <MetaRow icon={Receipt} label="ID hợp đồng" value={String(contract.contractId)} />
                    <MetaRow
                      icon={FileText}
                      label="Số tiền"
                      value={
                        contract.amount != null ? (
                          <span className="font-semibold text-emerald-700 tabular-nums">
                            {contract.amount.toLocaleString('vi-VN')} đ
                          </span>
                        ) : (
                          '—'
                        )
                      }
                    />
                    <MetaRow icon={CalendarClock} label="Ngày tạo" value={formatDateTime(contract.createdAt)} />
                    <MetaRow
                      icon={CalendarClock}
                      label="Ngày cập nhật"
                      value={formatDateTime(contract.updatedAt)}
                      className="sm:col-span-2"
                    />
                  </div>
                </div>
              </Section>

              <Section icon={GraduationCap} title="Thông tin giảng viên" tone="amber">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    <MetaRow icon={User} label="Họ tên" value={lecturerName} />
                    <MetaRow icon={Mail} label="Email" value={contract.createdByUser?.email ?? '—'} />
                    <MetaRow icon={Phone} label="Số điện thoại" value={lecturer?.phone ?? '—'} />
                    <MetaRow icon={Home} label="Địa chỉ" value={lecturer?.address ?? '—'} />
                    <MetaRow icon={CreditCard} label="CCCD" value={lecturer?.cin ?? '—'} />
                    <MetaRow
                      icon={Landmark}
                      label="Ngân hàng"
                      value={
                        lecturer?.bankName && lecturer?.bankCode
                          ? `${lecturer.bankName} · ${lecturer.bankCode}`
                          : '—'
                      }
                    />
                    <MetaRow icon={Receipt} label="Mã số thuế" value={lecturer?.taxNumber ?? '—'} />
                  </div>
                </div>
              </Section>

              <Section icon={Monitor} title="Thông tin buổi học" tone="teal">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <h4 className="min-w-0 flex-1 text-sm font-semibold leading-snug text-slate-900">
                      {sessionTitle}
                    </h4>
                    {contract.session?.sessionNo != null ? (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
                        Buổi {contract.session.sessionNo}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    <MetaRow
                      icon={Clock}
                      label="Thời gian"
                      value={
                        contract.session?.startAt && contract.session?.endAt
                          ? `${formatDateTime(contract.session.startAt)} → ${formatDateTime(contract.session.endAt)}`
                          : '—'
                      }
                    />
                    <MetaRow icon={MapPin} label="Địa điểm" value={contract.session?.location ?? '—'} />
                    <MetaRow icon={Monitor} label="Hình thức" value={modeLabel} />
                    <MetaRow icon={User} label="Vai trò" value={roleLabel ?? '—'} />
                  </div>
                </div>
              </Section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function HeaderChip({
  icon: Icon,
  label,
  title,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  accent?: 'emerald';
}) {
  const chipIconClass = accent === 'emerald' ? 'text-emerald-600' : 'text-[#2197C0]';
  return (
    <span
      title={title}
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-slate-700',
        accent === 'emerald'
          ? 'bg-emerald-50/90 font-semibold text-emerald-900'
          : 'bg-white/90 font-medium'
      )}
    >
      <Icon className={cn('h-3.5 w-3.5 shrink-0', chipIconClass)} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}

const sectionIconClass = {
  indigo: 'text-indigo-600',
  amber: 'text-amber-600',
  teal: 'text-teal-600',
} as const;

function Section({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: LucideIcon;
  title: string;
  tone: keyof typeof sectionIconClass;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2.5">
        <Icon
          className={cn('h-5 w-5 shrink-0', sectionIconClass[tone])}
          strokeWidth={2}
          aria-hidden
        />
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div>{children}</div>
    </section>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 gap-3', className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#2197C0]" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className="mt-0.5 text-sm font-medium break-words text-slate-900">{value}</div>
      </div>
    </div>
  );
}
