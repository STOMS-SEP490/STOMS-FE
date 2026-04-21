import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { CalendarClock, Hash, ListChecks, Mail, Pencil, Phone, User, X, ImageOff, CheckCircle, XCircle } from 'lucide-react';
import type { ReservationDetail } from '@/modules/reservation/reservation.types';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Checkbox, message } from 'antd';
import { getSessionStatusInfo } from '@/constants/status';
import { cn } from '@/shared/lib/utils';
import { Image } from 'antd';
import { ROLE_ID } from '@/constants/role';
import reservationApi from '../api/reservationApi';

type Props = {
  open: boolean;
  onClose: () => void;
  reservation: ReservationDetail | null;
  onEditReservation?: () => void;
  onEquipmentsApproved?: () => void;
};

function formatDateTime(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN');
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-[#2197C0] uppercase tracking-wide">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-slate-900 break-words">{value}</div>
    </div>
  );
}

function sectionShellClassName() {
  return 'border-t border-b border-gray-200 bg-white overflow-hidden';
}

function sectionHeaderClassName() {
  return 'px-5 py-3 border-b border-gray-100 bg-sky-50/30';
}

function HeaderStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function ReservationDetailSidebar({
  open,
  onClose,
  reservation,
  onEditReservation,
  onEquipmentsApproved,
}: Props) {
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<number[]>([]);
  const [approving, setApproving] = useState(false);

  const currentUserRole = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return null;
      const roleId = Number(JSON.parse(raw).roleId);
      return Number.isFinite(roleId) && roleId > 0 ? roleId : null;
    } catch {
      return null;
    }
  }, []);

  const isEquipmentManager = currentUserRole === ROLE_ID.EQUIPMENT_MANAGER;

  if (!reservation) return null;

  const createdBy = reservation.CreatedByUser;
  const hasEnded = !dayjs(reservation.EndAt).isAfter(dayjs());
  const reservationCancelled = reservation.IsTemporarilyCancelled === true;
  const showEditButton = Boolean(onEditReservation) && !hasEnded && !reservationCancelled;
  const sessions = reservation.Sessions ?? [];
  const singleSession = sessions.length === 1 ? sessions[0] : null;
  const showSeparateSessionSection = sessions.length !== 1;

  const equipmentList = reservation.EquipmentReservations ?? [];
  const equipmentCount =
    reservation.TotalEquipments != null && reservation.TotalEquipments >= 0
      ? reservation.TotalEquipments
      : equipmentList.length;

  const reservationStatusLabel = reservation.IsTemporarilyCancelled ? 'Tạm hủy' : 'Đang hoạt động';

  const avatarSrc = createdBy?.AvatarUrl?.trim() || '/img/ava.png';

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 h-full bg-black/35"
          onClick={onClose}
          aria-hidden
        />
      )}

      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-[720px] max-w-[96vw]',
          'border-l border-slate-200/80 bg-white shadow-2xl',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full pointer-events-none',
        )}
      >
        <div className="flex h-full min-w-0 flex-col overflow-hidden">
          {/* Header — cùng nhịp với MemberDetailSidebar */}
          <header className="w-full shrink-0 bg-white border-b border-slate-200">
            <div className="px-6 pt-6 pb-4 space-y-4">
              {/* Hàng 1: tiêu đề đặt trước + thời gian — không kéo avatar theo */}
              <div className="flex w-full items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold tracking-tight text-slate-900">
                      Chi tiết đặt trước #{reservation.ReservationId}
                    </h2>
                    {reservation.IsTemporarilyCancelled != null ? (
                      <Badge
                        className={cn(
                          'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium border-0',
                          reservation.IsTemporarilyCancelled
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800',
                        )}
                      >
                        {reservation.IsTemporarilyCancelled ? 'Tạm hủy' : 'Đang hoạt động'}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="flex items-center gap-1.5 text-sm text-slate-600">
                    <CalendarClock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    <span>
                      {formatDateTime(reservation.StartAt)} — {formatDateTime(reservation.EndAt)}
                    </span>
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {showEditButton ? (
                    <button
                      type="button"
                      onClick={onEditReservation}
                      className="inline-flex items-center gap-1.5 border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                      Sửa đặt trước
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Đóng"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Hàng 2: avatar chỉ ngang hàng với khối email + tên/SĐT (giống cột người tạo ở bảng) */}
              {createdBy ? (
                <div className="flex items-center gap-3 pt-0.5">
                  <img
                    src={avatarSrc}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-md object-cover ring-2 ring-white shadow-sm"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="flex items-center gap-2 text-sm font-medium text-slate-800 truncate">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-sky-600" aria-hidden />
                      <span className="truncate">{createdBy.Email?.trim() || '—'}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-slate-900">
                      <span className="inline-flex items-center gap-1.5 min-w-0">
                        <User className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                        <span className="font-medium truncate">{createdBy.FullName?.trim() || '—'}</span>
                      </span>
                      <span className="text-slate-300 hidden sm:inline" aria-hidden>
                        |
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-slate-700">
                        <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                        {createdBy.Phone?.trim() || '—'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Chưa có thông tin người tạo.</p>
              )}
            </div>

            <div className="grid w-full grid-cols-1 divide-y divide-slate-200 bg-slate-50 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="px-5 py-3">
                <HeaderStat label="Trạng thái đặt trước" value={reservationStatusLabel} />
              </div>
              <div className="px-5 py-3">
                <HeaderStat label="Số thiết bị" value={equipmentCount} />
              </div>
              <div className="px-5 py-3">
                <HeaderStat label="Ngày tạo" value={formatDateTime(reservation.CreatedAt)} />
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto bg-[#fafafa] px-6 py-5 space-y-5">
            {/* Thông tin chung + buổi đơn */}
            <div className={sectionShellClassName()}>
              <div className={sectionHeaderClassName()}>
                <h3 className="flex items-center gap-2 font-semibold text-[#2197C0] text-sm">
                  <Hash className="h-4 w-4 text-[#2197C0]" aria-hidden />
                  Thông tin đặt trước
                </h3>
              </div>
              <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow label="Mã đặt trước" value={<span className="font-semibold">#{reservation.ReservationId}</span>} />
                <InfoRow label="Bắt đầu" value={formatDateTime(reservation.StartAt)} />
                <InfoRow label="Kết thúc" value={formatDateTime(reservation.EndAt)} />
                <InfoRow label="Số thiết bị" value={<span className="font-medium">{equipmentCount}</span>} />

                {singleSession ? (
                  <div className="col-span-full mt-1 border-t border-slate-100 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoRow label="Buổi" value={`Buổi ${singleSession.SessionNo}`} />
                    <InfoRow
                      label="Trạng thái buổi"
                      value={(() => {
                        const info = getSessionStatusInfo(singleSession.Status);
                        return (
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                              info.className,
                            )}
                          >
                            {info.label}
                          </span>
                        );
                      })()}
                    />
                    <InfoRow
                      label="Thời gian buổi"
                      value={`${formatDateTime(singleSession.StartAt)} — ${formatDateTime(singleSession.EndAt)}`}
                    />
                    <InfoRow
                      label="Địa điểm"
                      value={
                        <span className="inline-flex items-start gap-1.5">
                          <span>
                            {singleSession.Location || '—'}
                            {singleSession.IsOnline != null
                              ? singleSession.IsOnline
                                ? ' · Online'
                                : ' · Offline'
                              : ''}
                          </span>
                        </span>
                      }
                    />
                    {singleSession.Notes ? (
                      <div className="col-span-full">
                        <InfoRow label="Ghi chú buổi" value={singleSession.Notes} />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {showSeparateSessionSection ? (
              <div className={sectionShellClassName()}>
                <div className={sectionHeaderClassName()}>
                  <h3 className="flex items-center gap-2 font-semibold text-[#2197C0] text-sm">
                    <ListChecks className="h-4 w-4 text-[#2197C0]" aria-hidden />
                    Buổi liên quan
                  </h3>
                </div>
                <div className="px-4 py-3">
                  {sessions.length === 0 ? (
                    <p className="text-xs text-slate-500">Không có buổi.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {sessions.map((s) => {
                        const statusInfo = getSessionStatusInfo(s.Status);
                        return (
                          <div key={s.SessionId} className="space-y-2 py-3 first:pt-0 last:pb-0">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-sm font-semibold text-slate-900">Buổi {s.SessionNo}</div>
                              <span
                                className={cn(
                                  'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                                  statusInfo.className,
                                )}
                              >
                                {statusInfo.label}
                              </span>
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
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className={sectionShellClassName()}>
              <div className={sectionHeaderClassName()}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[#2197C0] text-sm">Thiết bị trong lịch sử đặt trước</h3>
                  {isEquipmentManager && equipmentList.length > 0 && (
                    <Checkbox
                      checked={selectedEquipmentIds.length === equipmentList.length}
                      indeterminate={selectedEquipmentIds.length > 0 && selectedEquipmentIds.length < equipmentList.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEquipmentIds(equipmentList.map(er => er.EquipmentId));
                        } else {
                          setSelectedEquipmentIds([]);
                        }
                      }}
                    >
                      <span className="text-xs text-slate-600">Chọn tất cả</span>
                    </Checkbox>
                  )}
                </div>
              </div>
              <div className="px-4 py-3">
                {equipmentList.length === 0 ? (
                  <p className="text-xs text-slate-500">Không có thiết bị.</p>
                ) : (
                  <>
                    <ul className="divide-y divide-slate-100">
                      {equipmentList.map((er, idx) => {
                        const eq = er.Equipment;
                        const displayName = eq?.EquipmentName?.trim() || 'Thiết bị';
                        const code = eq?.EquipmentCode?.trim();
                        const isSelected = selectedEquipmentIds.includes(er.EquipmentId);
                        return (
                          <li
                            key={`${code ?? 'eq'}-${idx}`}
                            className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                          >
                            {isEquipmentManager && (
                              <Checkbox
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedEquipmentIds(prev => [...prev, er.EquipmentId]);
                                  } else {
                                    setSelectedEquipmentIds(prev => prev.filter(id => id !== er.EquipmentId));
                                  }
                                }}
                              />
                            )}
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                              {eq?.ImgLink ? (
                                <Image
                                  src={eq.ImgLink}
                                  alt={displayName}
                                  width={56}
                                  height={56}
                                  className="object-cover"
                                  preview={{ mask: 'Xem ảnh' }}
                                />
                              ) : (
                                <ImageOff className="h-6 w-6 text-slate-400" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-[#2197C0]">{displayName}</div>
                                  <div className="mt-0.5 text-xs text-slate-600">
                                    Mã:{' '}
                                    <span className="font-semibold text-slate-900">{code || '—'}</span>
                                  </div>
                                  <div className="mt-1 truncate text-xs text-slate-600">
                                    Danh mục: <span className="font-medium text-slate-800">{eq?.CategoryName || '—'}</span>
                                  </div>
                                </div>
                                {er.IsTemporarilyCancelled ? (
                                  <Badge className="shrink-0 border border-red-100 bg-red-50 text-[11px] text-red-700">
                                    Tạm hủy
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    {isEquipmentManager && selectedEquipmentIds.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-600">
                          Đã chọn <span className="font-semibold text-[#2197C0]">{selectedEquipmentIds.length}</span> thiết bị
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={approving}
                            onClick={async () => {
                              try {
                                setApproving(true);
                                await reservationApi.approveEquipments(
                                  reservation.ReservationId,
                                  selectedEquipmentIds,
                                  false
                                );
                                message.success('Đã từ chối thiết bị');
                                setSelectedEquipmentIds([]);
                                onEquipmentsApproved?.();
                                onClose();
                              } catch (err: any) {
                                const msg = err?.response?.data?.message || err?.message || 'Từ chối thất bại';
                                message.error(msg);
                              } finally {
                                setApproving(false);
                              }
                            }}
                            className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4" />
                            Từ chối
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={approving}
                            onClick={async () => {
                              try {
                                setApproving(true);
                                await reservationApi.approveEquipments(
                                  reservation.ReservationId,
                                  selectedEquipmentIds,
                                  true
                                );
                                message.success('Đã duyệt thiết bị');
                                setSelectedEquipmentIds([]);
                                onEquipmentsApproved?.();
                                onClose();
                              } catch (err: any) {
                                const msg = err?.response?.data?.message || err?.message || 'Duyệt thất bại';
                                message.error(msg);
                              } finally {
                                setApproving(false);
                              }
                            }}
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle className="h-4 w-4" />
                            {approving ? 'Đang xử lý...' : 'Duyệt'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
