import dayjs from 'dayjs';
import { Pencil, X, ImageOff } from 'lucide-react';
import type { ReservationDetail } from '@/modules/reservation/reservation.types';
import { Badge } from '@/shared/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { cn } from '@/shared/lib/utils';
import { Image } from 'antd';

type Props = {
  open: boolean;
  onClose: () => void;
  reservation: ReservationDetail | null;
  onEditReservation?: () => void;
};

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  // Guard Invalid Date
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN');
}

function sessionStatusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s.includes('assign')) return 'border-0 bg-amber-100 text-amber-900';
  if (s.includes('cancel') || s.includes('reject')) return 'border-0 bg-red-100 text-red-800';
  if (s.includes('done') || s.includes('complete') || s.includes('publish')) return 'border-0 bg-emerald-100 text-emerald-900';
  return 'border-0 bg-indigo-100 text-indigo-900';
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-slate-900 break-words">{value}</div>
    </div>
  );
}

/** Một lớp bo góc nhẹ cho khối ngoài; không lồng thêm khung bo góc bên trong. */
function sectionShellClassName() {
  return 'rounded-md border border-slate-200 bg-white overflow-hidden';
}

function sectionHeaderClassName() {
  return 'px-4 py-2 border-b border-slate-100 bg-slate-50/80';
}

export default function ReservationDetailSidebar({
  open,
  onClose,
  reservation,
  onEditReservation,
}: Props) {
  if (!reservation) return null;

  const createdBy = reservation.CreatedByUser;
  const hasEnded = !dayjs(reservation.EndAt).isAfter(dayjs());
  const reservationCancelled = reservation.IsTemporarilyCancelled === true;
  const showEditButton = Boolean(onEditReservation) && !hasEnded && !reservationCancelled;
  const sessions = reservation.Sessions ?? [];
  const singleSession = sessions.length === 1 ? sessions[0] : null;
  /** Chỉ tách khối « Phiên » khi 0 hoặc nhiều phiên; 1 phiên thì gộp vào « Thông tin chung ». */
  const showSeparateSessionSection = sessions.length !== 1;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/35 z-40 h-full"
          onClick={onClose}
          aria-hidden
        />
      )}

      <div
        className={cn(
          'fixed top-0 right-0 h-full w-[560px] z-50 bg-white border-l border-slate-200/80 shadow-2xl shadow-indigo-950/10',
          'transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 pt-5 pb-3 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-slate-900 truncate">
                  Chi tiết lịch sử đặt trước #{reservation.ReservationId}
                </h2>
                {reservation.IsTemporarilyCancelled != null && (
                  <Badge
                    className={
                      reservation.IsTemporarilyCancelled
                        ? 'bg-red-50 text-red-700 border border-red-100'
                        : 'bg-green-50 text-green-700 border border-green-100'
                    }
                  >
                    {reservation.IsTemporarilyCancelled ? 'Tạm hủy' : 'Đang hoạt động'}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-600">
                {formatDateTime(reservation.StartAt ?? null)} - {formatDateTime(reservation.EndAt ?? null)}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {showEditButton ? (
                <button
                  type="button"
                  onClick={onEditReservation}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                  Sửa đặt trước
                </button>
              ) : null}
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-slate-500 hover:text-indigo-700 hover:bg-white/80 transition-colors"
                aria-label="Đóng"
                type="button"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="px-5 py-4 space-y-4 bg-slate-50">
            {/* Thông tin chung */}
            <div className={sectionShellClassName()}>
              <div className={sectionHeaderClassName()}>
                <h3 className="font-semibold text-slate-900 text-sm">Thông tin chung</h3>
              </div>
              <div className="px-4 py-3 grid grid-cols-2 gap-3">
                <InfoRow label="Mã đặt trước" value={<span className="font-semibold">#{reservation.ReservationId}</span>} />
                <InfoRow label="Trạng thái" value={reservation.IsTemporarilyCancelled ? 'Tạm hủy' : 'Đang hoạt động'} />
                <InfoRow label="Bắt đầu" value={formatDateTime(reservation.StartAt ?? null)} />
                <InfoRow label="Kết thúc" value={formatDateTime(reservation.EndAt ?? null)} />
                <InfoRow label="Ngày tạo" value={formatDateTime(reservation.CreatedAt ?? null)} />
                <InfoRow
                  label="Số thiết bị"
                  value={
                    <span className="font-medium">{(reservation.EquipmentReservations ?? []).length}</span>
                  }
                />

                {singleSession ? (
                  <div className="col-span-2 mt-2 border-t border-slate-100 pt-3 grid grid-cols-2 gap-3">
                    <InfoRow
                      label="Phiên"
                      value={`Phiên ${singleSession.SessionNo} (#${singleSession.SessionId})`}
                    />
                    <InfoRow
                      label="Trạng thái phiên"
                      value={
                        <Badge
                          className={cn(
                            'text-[11px] font-medium',
                            sessionStatusBadgeClass(singleSession.Status ?? ''),
                          )}
                        >
                          {singleSession.Status}
                        </Badge>
                      }
                    />
                    <InfoRow
                      label="Thời gian phiên"
                      value={`${formatDateTime(singleSession.StartAt)} — ${formatDateTime(singleSession.EndAt)}`}
                    />
                    <InfoRow
                      label="Địa điểm"
                      value={`${singleSession.Location || '—'}${
                        singleSession.IsOnline != null
                          ? singleSession.IsOnline
                            ? ' · Online'
                            : ' · Offline'
                          : ''
                      }`}
                    />
                    {singleSession.Notes ? (
                      <div className="col-span-2">
                        <InfoRow label="Ghi chú phiên" value={singleSession.Notes} />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Người tạo */}
            <div className={sectionShellClassName()}>
              <div className={sectionHeaderClassName()}>
                <h3 className="font-semibold text-slate-900 text-sm">Người tạo</h3>
              </div>
              <div className="px-4 py-3">
                {createdBy ? (
                  <div className="flex items-center gap-3 py-1">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={createdBy.AvatarUrl ?? undefined} />
                      <AvatarFallback className="bg-indigo-100 text-indigo-800">
                        {createdBy.FullName?.charAt(0) ?? '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900 truncate">{createdBy.FullName}</div>
                      <div className="text-xs text-slate-600">
                        {createdBy.Phone ?? '—'} {createdBy.MemberId ? `• Member #${createdBy.MemberId}` : ''}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">—</p>
                )}
              </div>
            </div>

            {showSeparateSessionSection ? (
              <div className={sectionShellClassName()}>
                <div className={sectionHeaderClassName()}>
                  <h3 className="font-semibold text-slate-900 text-sm">Phiên</h3>
                </div>
                <div className="px-4 py-3">
                  {sessions.length === 0 ? (
                    <p className="text-xs text-slate-500">Không có phiên.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {sessions.map((s) => (
                        <div key={s.SessionId} className="space-y-2 py-3 first:pt-0 last:pb-0">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-slate-900">
                              Phiên {s.SessionNo} · #{s.SessionId}
                            </div>
                            <Badge className={cn('text-[11px] font-medium', sessionStatusBadgeClass(s.Status ?? ''))}>
                              {s.Status}
                            </Badge>
                          </div>
                          <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                            <div>
                              <span className="font-medium text-slate-500">Thời gian · </span>
                              {formatDateTime(s.StartAt)} — {formatDateTime(s.EndAt)}
                            </div>
                            <div>
                              <span className="font-medium text-slate-500">Địa điểm · </span>
                              {s.Location || '—'}
                              {s.IsOnline != null ? (s.IsOnline ? ' · Online' : ' · Offline') : ''}
                            </div>
                          </div>
                          {s.Notes ? (
                            <div className="text-xs text-slate-600">
                              <span className="font-medium text-slate-500">Ghi chú · </span>
                              {s.Notes}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Thiết bị đặt trước */}
            <div className={sectionShellClassName()}>
              <div className={sectionHeaderClassName()}>
                <h3 className="font-semibold text-slate-900 text-sm">Thiết bị trong lịch sử đặt trước</h3>
              </div>
              <div className="px-4 py-3">
                {(reservation.EquipmentReservations ?? []).length === 0 ? (
                  <p className="text-xs text-slate-500">Không có thiết bị.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {(reservation.EquipmentReservations ?? []).map((er) => {
                      const eq = er.Equipment;
                      return (
                      <li key={er.EquipmentId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <div className="w-14 h-14 shrink-0 overflow-hidden rounded-sm bg-slate-100 flex items-center justify-center border border-slate-200">
                          {eq?.ImgLink ? (
                            <Image
                              src={eq.ImgLink}
                              alt={eq.EquipmentName ?? `Thiết bị #${er.EquipmentId}`}
                              width={56}
                              height={56}
                              className="object-cover"
                              preview={{ mask: 'Xem ảnh' }}
                            />
                          ) : (
                            <ImageOff className="w-6 h-6 text-slate-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-semibold text-sm text-slate-900 truncate">
                                {eq?.EquipmentName || `Thiết bị #${er.EquipmentId}`}
                              </div>
                              <div className="text-xs text-slate-600 mt-0.5">
                                Mã:{' '}
                                <span className="font-medium text-slate-800">
                                  {eq?.EquipmentCode || er.EquipmentId}
                                </span>
                              </div>
                              <div className="text-xs text-slate-600 mt-1 truncate">
                                Danh mục: <span className="text-slate-800">{eq?.CategoryName || '—'}</span>
                              </div>
                            </div>
                            {er.IsTemporarilyCancelled ? (
                              <Badge className="shrink-0 bg-red-50 text-red-700 border border-red-100 text-[11px]">
                                Tạm hủy
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

