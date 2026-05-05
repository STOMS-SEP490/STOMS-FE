import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { CalendarClock, CheckCircle, Hash, User, X } from 'lucide-react';
import { Skeleton } from 'antd';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import type { ContractListItem } from '../contract';

type Props = {
  open: boolean;
  onClose: () => void;
  contract: ContractListItem | null;
  loading?: boolean;
  roleLabel?: string | null;
  onConfirm?: (contract: ContractListItem) => void;
  confirming?: boolean;
};

function formatDateTime(date?: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleString('vi-VN');
}

function getSessionTitle(session: ContractListItem['session']): string {
  const s = session as { sessionTitle?: string; title?: string } | undefined;
  return (s?.sessionTitle || s?.title || '').trim() || '—';
}

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

export default function ContractDetailSidebar({ open, onClose, contract, loading, roleLabel, onConfirm, confirming }: Props) {
  if (!open) return null;

  const lecturer = contract?.createdByUser?.member;
  const lecturerName = lecturer?.fullName ?? '—';
  const amountFormatted = contract?.amount != null ? `${contract.amount.toLocaleString('vi-VN')} đ` : '—';
  const statusLabel = contract?.isPaid === true ? 'Đã thanh toán' : contract?.isPaid === false ? 'Chưa thanh toán' : 'Không rõ';
  const statusBadgeClass = contract?.isPaid === true
    ? 'border-0 bg-emerald-100 text-emerald-800'
    : contract?.isPaid === false
      ? 'border-0 bg-amber-100 text-amber-800'
      : 'border-0 bg-slate-100 text-slate-600';
  const sessionTitle = contract ? getSessionTitle(contract.session) : '—';
  const modeLabel = contract?.session?.isOnline == null ? 'Không rõ' : contract.session.isOnline ? 'Trực tuyến' : 'Trực tiếp';

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/35 mb-0" onClick={onClose} aria-hidden />

      <div className={cn(
        'fixed right-0 top-0 z-50 h-full w-[680px] max-w-[96vw]',
        'border-l border-slate-200 bg-white shadow-2xl',
        'translate-x-0 transition-transform duration-300 ease-out',
      )}>
        <div className="flex h-full flex-col overflow-hidden">

          {/* HEADER */}
          <header className="w-full shrink-0 border-b border-slate-200 bg-white">
            {loading && !contract ? (
              <div className="px-5 py-5 pr-14">
                <Skeleton active title={{ width: '55%' }} paragraph={{ rows: 1 }} />
              </div>
            ) : contract ? (
              <>
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-widest text-slate-400">CHI TIẾT HỢP ĐỒNG</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-[#1a7a99]">{contract.contractCode}</h2>
                        <Badge className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', statusBadgeClass)}>
                          {statusLabel}
                        </Badge>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <img
                          src={lecturer?.avatarUrl?.trim() || '/img/ava.png'}
                          alt=""
                          className="h-5 w-5 rounded-full object-cover shrink-0"
                        />
                        <span className="text-sm text-slate-600 truncate">{lecturerName}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-500 truncate">{contract.createdByUser?.email ?? '—'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      aria-label="Đóng"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Meta bar */}
                <div className="grid w-full grid-cols-3 divide-x divide-slate-200 border-t border-slate-200 bg-slate-50">
                  <div className="px-5 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Số tiền</p>
                    <p className="mt-0.5 text-sm font-semibold text-emerald-700 tabular-nums">{amountFormatted}</p>
                  </div>
                  <div className="px-5 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Ngày tạo</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">{formatDateTime(contract.createdAt)}</p>
                  </div>
                  <div className="px-5 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Trạng thái</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">{statusLabel}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-start justify-between gap-3 px-5 py-5">
                <p className="text-sm text-slate-500">Không có dữ liệu.</p>
                <button type="button" onClick={onClose} className="shrink-0 p-1.5 text-slate-400 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </header>

          {/* BODY */}
          <div className="relative min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4 space-y-4">
            {loading && contract && (
              <div className="pointer-events-none absolute inset-0 z-10 bg-white/45" aria-hidden />
            )}

            {loading && !contract ? (
              <div className="space-y-4">
                <Skeleton active paragraph={{ rows: 4 }} />
                <Skeleton active paragraph={{ rows: 4 }} />
              </div>
            ) : contract ? (
              <>
                {/* Thông tin hợp đồng */}
                <Section icon={Hash} title="Thông tin hợp đồng">
                  <div className="pl-4 grid grid-cols-2 gap-x-6">
                    <MetaRow label="Mã hợp đồng" value={contract.contractCode} />
                    <MetaRow label="ID" value={`#${contract.contractId}`} />
                    <MetaRow label="Số tiền" value={
                      <span className="font-semibold text-emerald-700 tabular-nums">{amountFormatted}</span>
                    } />
                    <MetaRow label="Trạng thái" value={
                      <Badge className={cn('text-xs', statusBadgeClass)}>{statusLabel}</Badge>
                    } />
                    <MetaRow label="Ngày tạo" value={formatDateTime(contract.createdAt)} />
                    <MetaRow label="Cập nhật lần cuối" value={formatDateTime(contract.updatedAt)} />
                    {contract.request && (
                      <MetaRow label="Mã yêu cầu" value={
                        <span className="font-medium text-[#1a7a99]">{contract.request.requestCode}</span>
                      } />
                    )}
                  </div>
                </Section>

                {/* Thông tin giảng viên */}
                <Section icon={User} title="Thông tin giảng viên">
                  <div className="pl-4">
                    {lecturer && (
                      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100">
                        <img src={lecturer.avatarUrl?.trim() || '/img/ava.png'} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-black">{lecturerName}</p>
                          <p className="text-xs text-slate-500">{contract.createdByUser?.email ?? '—'}</p>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-x-6">
                      <MetaRow label="Số điện thoại" value={lecturer?.phone || '—'} />
                      <MetaRow label="Vai trò" value={roleLabel ?? '—'} />
                      <MetaRow label="CCCD" value={lecturer?.cin || '—'} />
                      <MetaRow label="Mã số thuế" value={lecturer?.taxNumber || '—'} />
                      <MetaRow label="Ngân hàng" value={
                        lecturer?.bankName && lecturer?.bankCode
                          ? `${lecturer.bankName} · ${lecturer.bankCode}`
                          : '—'
                      } />
                      <MetaRow label="Địa chỉ" value={lecturer?.address || '—'} />
                    </div>
                  </div>
                </Section>

                {/* Thông tin buổi */}
                <Section icon={CalendarClock} title="Thông tin buổi">
                  <div className="pl-4 grid grid-cols-2 gap-x-6">
                    <MetaRow label="Tiêu đề buổi" value={sessionTitle} className="col-span-2" />
                    {contract.session?.sessionNo != null && (
                      <MetaRow label="Số buổi" value={`Buổi ${contract.session.sessionNo}`} />
                    )}
                    <MetaRow label="Hình thức" value={modeLabel} />
                    <MetaRow
                      label="Thời gian"
                      value={
                        contract.session?.startAt && contract.session?.endAt
                          ? `${formatDateTime(contract.session.startAt)} → ${formatDateTime(contract.session.endAt)}`
                          : '—'
                      }
                      className="col-span-2"
                    />
                    <MetaRow label="Địa điểm" value={contract.session?.location || '—'} className="col-span-2" />
                  </div>
                </Section>
              </>
            ) : null}
          </div>

          {/* FOOTER: nút xác nhận khi chưa thanh toán */}
          {contract && contract.isPaid === false && onConfirm && (
            <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3 flex items-center justify-end gap-3">
           
              <Button
                type="button"
                disabled={confirming}
                onClick={() => onConfirm(contract)}
                className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <CheckCircle className="h-4 w-4" />
                {confirming ? 'Đang xác nhận...' : 'Xác nhận hợp đồng đã được thanh toán'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
