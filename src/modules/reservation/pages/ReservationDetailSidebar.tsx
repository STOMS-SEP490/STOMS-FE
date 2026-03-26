import { X, ImageOff } from 'lucide-react';
import type { ReservationDetail } from '@/modules/request/type';
import { Badge } from '@/shared/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { cn } from '@/shared/lib/utils';
import { useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  reservation: ReservationDetail | null;
};

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  // Guard Invalid Date
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN');
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
      <div className="mt-0.5 text-sm text-gray-900 break-words">{value}</div>
    </div>
  );
}

export default function ReservationDetailSidebar({ open, onClose, reservation }: Props) {
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageAlt, setImageAlt] = useState<string>('Hình ảnh thiết bị');

  if (!reservation) return null;

  const createdBy = reservation.createdByUser;

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
          'fixed top-0 right-0 h-full w-[560px] z-50 bg-white border-l shadow-2xl',
          'transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          <div className="sticky top-0 z-10 bg-white border-b px-5 pt-5 pb-3 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-black truncate">
                  Chi tiết lịch sử đặt trước #{reservation.reservationId}
                </h2>
                {reservation.isTemporarilyCancelled != null && (
                  <Badge
                    className={
                      reservation.isTemporarilyCancelled
                        ? 'bg-red-50 text-red-700 border border-red-100'
                        : 'bg-green-50 text-green-700 border border-green-100'
                    }
                  >
                    {reservation.isTemporarilyCancelled ? 'Tạm hủy' : 'Đang hoạt động'}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {formatDateTime(reservation.startAt)} - {formatDateTime(reservation.endAt)}
              </p>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Đóng"
              type="button"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-5 py-4 space-y-4 bg-[#f7f7f8]">
            {/* Thông tin chung */}
            <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b">
                <h3 className="font-semibold text-gray-900 text-sm">Thông tin chung</h3>
              </div>
              <div className="px-4 py-3 grid grid-cols-2 gap-3">
                <InfoRow label="Mã đặt trước" value={<span className="font-semibold">#{reservation.reservationId}</span>} />
                <InfoRow label="Trạng thái" value={reservation.isTemporarilyCancelled ? 'Tạm hủy' : 'Đang hoạt động'} />
                <InfoRow label="Bắt đầu" value={formatDateTime(reservation.startAt)} />
                <InfoRow label="Kết thúc" value={formatDateTime(reservation.endAt)} />
                <InfoRow label="Ngày tạo" value={formatDateTime(reservation.createdAt ?? null)} />
                <InfoRow
                  label="Số thiết bị"
                  value={<span className="font-medium">{reservation.equipmentReservations.length}</span>}
                />
              </div>
            </div>

            {/* Người tạo */}
            <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b">
                <h3 className="font-semibold text-gray-900 text-sm">Người tạo</h3>
              </div>
              <div className="px-4 py-3">
                {createdBy ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={createdBy.avatarUrl ?? undefined} />
                      <AvatarFallback>{createdBy.fullName?.charAt(0) ?? '?'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-gray-900 truncate">{createdBy.fullName}</div>
                      <div className="text-xs text-gray-500">
                        {createdBy.phone ?? '—'} {createdBy.memberId ? `• Member #${createdBy.memberId}` : ''}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">—</p>
                )}
              </div>
            </div>

            {/* Phiên */}
            <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b">
                <h3 className="font-semibold text-gray-900 text-sm">Danh sách phiên</h3>
              </div>
              <div className="px-4 py-3">
                {reservation.sessions.length === 0 ? (
                  <p className="text-xs text-gray-500">Không có phiên.</p>
                ) : (
                  <ul className="space-y-2">
                    {reservation.sessions.map((s) => (
                      <li key={s.sessionId} className="rounded-xl border bg-white px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium text-gray-900">
                            Phiên {s.sessionNo} (#{s.sessionId})
                          </div>
                          <Badge className="bg-gray-100 text-gray-700 text-[11px]">{s.status}</Badge>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {formatDateTime(s.startAt)} - {formatDateTime(s.endAt)}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          Địa điểm: {s.location || '—'} {s.isOnline != null ? (s.isOnline ? '• Online' : '• Offline') : ''}
                        </div>
                        {s.notes ? <div className="mt-1 text-xs text-gray-500">Ghi chú: {s.notes}</div> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Thiết bị đặt trước */}
            <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b">
                <h3 className="font-semibold text-gray-900 text-sm">Thiết bị trong lịch sử đặt trước</h3>
              </div>
              <div className="px-4 py-3">
                {reservation.equipmentReservations.length === 0 ? (
                  <p className="text-xs text-gray-500">Không có thiết bị.</p>
                ) : (
                  <ul className="space-y-2">
                    {reservation.equipmentReservations.map((er) => {
                      const eq = er.equipment;
                      return (
                      <li
                        key={er.equipmentId}
                        className="rounded-xl border bg-white px-3 py-2 flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-50 flex-shrink-0 flex items-center justify-center">
                          {eq?.imgLink ? (
                            <button
                              type="button"
                              className="w-full h-full"
                              onClick={() => {
                                setImageUrl(eq.imgLink ?? null);
                                setImageAlt(eq.equipmentName ?? 'Hình ảnh thiết bị');
                                setImageOpen(true);
                              }}
                              title="Xem ảnh thiết bị"
                            >
                              <img
                                src={eq.imgLink}
                                alt={eq.equipmentName ?? undefined}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </button>
                          ) : (
                            <ImageOff className="w-5 h-5 text-gray-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="font-medium text-sm text-gray-900 truncate">
                                {eq?.equipmentName || `Thiết bị #${er.equipmentId}`}
                              </div>
                              <div className="text-xs text-gray-500">
                                Mã: {eq?.equipmentCode || er.equipmentId}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {er.isTemporarilyCancelled ? (
                                <Badge className="bg-red-50 text-red-700 border border-red-100 text-[11px]">
                                  Tạm hủy
                                </Badge>
                              ) : null}
                              {eq?.status ? (
                                <Badge className="bg-gray-100 text-gray-700 text-[11px] flex-shrink-0">
                                  {eq.status}
                                </Badge>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-gray-500">
                            <span className="truncate">Danh mục: {eq?.categoryName || '—'}</span>
                            <span className="whitespace-nowrap">Tạo lúc: {formatDateTime(er.createdAt ?? null)}</span>
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

      {imageOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
          onClick={() => setImageOpen(false)}
        >
          <div
            className="max-w-3xl max-h-[80vh] bg-white rounded-2xl overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={imageAlt}
                className="w-full h-full object-contain bg-black"
              />
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}

