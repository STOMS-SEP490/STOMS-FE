import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle, Info, ImageOff, Package, Pencil, X, XCircle } from 'lucide-react';
import type { ReservationDetail } from '@/modules/reservation/reservation.types';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Checkbox, message } from 'antd';
import { getSessionStatusInfo, getReservationStatusInfo, RESERVATION_STATUS } from '@/constants/status';
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

function Section({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-[#2197C0]" strokeWidth={2} aria-hidden />
          <h3 className="text-sm font-semibold text-black">{title}</h3>
        </div>
        {action}
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

export default function ReservationDetailSidebar({
  open,
  onClose,
  reservation,
  onEditReservation,
  onEquipmentsApproved,
}: Props) {
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<number[]>([]);
  const [approving, setApproving] = useState(false);
  const [showApprovalMode, setShowApprovalMode] = useState(false);

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

  if (!open) return null;
  if (!reservation) return null;

  const createdBy = reservation.CreatedByUser;
  const showEditButton = false; // EM không được sửa
  const sessions = reservation.Sessions ?? [];
  const equipmentList = reservation.EquipmentReservations ?? [];
  const equipmentCount =
    reservation.TotalEquipments != null && reservation.TotalEquipments >= 0
      ? reservation.TotalEquipments
      : equipmentList.length;

  // Xác định trạng thái hiển thị - map từ IsTemporarilyCancelled
  const cancelled = reservation.IsTemporarilyCancelled === true;
  const mappedStatus = cancelled ? RESERVATION_STATUS.REJECTED : RESERVATION_STATUS.PENDING;
  const statusInfo = getReservationStatusInfo(mappedStatus);
  const displayStatus = statusInfo.label;
  const statusBadgeClass = `border ${statusInfo.className}`;

  return (
    <>
      <div className="fixed inset-0 z-40 h-full bg-black/35" onClick={onClose} aria-hidden />

      <div className={cn(
        'fixed right-0 top-0 z-50 h-full w-[720px] max-w-[96vw]',
        'border-l border-slate-200 bg-white shadow-2xl',
        'translate-x-0 transition-transform duration-300 ease-out',
      )}>
        <div className="flex h-full min-w-0 flex-col overflow-hidden">

          {/* HEADER */}
          <header className="w-full shrink-0 border-b border-slate-200 bg-white">
            <div className="px-5 pt-5 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-400">CHI TIẾT ĐƠN YÊU CẦU THIẾT BỊ</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-[#1a7a99]">Đơn yêu cầu thiết bị #{reservation.ReservationId}</h2>
                    <Badge className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium border-0', statusBadgeClass)}>
                      {displayStatus}
                    </Badge>
                  </div>
                  {createdBy && (
                    <div className="mt-2 flex items-center gap-2">
                      <img src={createdBy.AvatarUrl?.trim() || '/img/ava.png'} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
                      <span className="text-sm text-slate-600 truncate">{createdBy.FullName?.trim() || '—'}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-500 truncate">{createdBy.Email?.trim() || '—'}</span>
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {showEditButton && (
                    <button type="button" onClick={onEditReservation} className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      <Pencil className="h-4 w-4" aria-hidden />
                      Sửa
                    </button>
                  )}
                  <button type="button" onClick={onClose} className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors" aria-label="Đóng">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Meta bar */}
            <div className="grid w-full grid-cols-3 divide-x divide-slate-200 border-t border-slate-200 bg-slate-50">
              <div className="px-5 py-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Bắt đầu</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">{formatDateTime(reservation.StartAt)}</p>
              </div>
              <div className="px-5 py-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Kết thúc</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">{formatDateTime(reservation.EndAt)}</p>
              </div>
              <div className="px-5 py-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Số thiết bị</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">{equipmentCount}</p>
              </div>
            </div>
          </header>

          {/* BODY */}
          <div className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4 space-y-4">

            {/* Thông tin đặt trước */}
            <Section icon={Info} title="Thông tin đặt trước">
              <div className="pl-4 grid grid-cols-2 gap-x-6">
                <MetaRow label="Mã đặt trước" value={`#${reservation.ReservationId}`} />
                <MetaRow label="Trạng thái" value={
                  <Badge className={cn('border text-xs', statusBadgeClass)}>
                    {displayStatus}
                  </Badge>
                } />
                <MetaRow label="Bắt đầu" value={formatDateTime(reservation.StartAt)} />
                <MetaRow label="Kết thúc" value={formatDateTime(reservation.EndAt)} />
                <MetaRow label="Ngày tạo" value={formatDateTime(reservation.CreatedAt)} />
                <MetaRow label="Số thiết bị" value={equipmentCount} />
                {createdBy && (
                  <>
                    <MetaRow label="Người tạo" value={createdBy.FullName?.trim() || '—'} />
                    <MetaRow label="SĐT" value={createdBy.Phone?.trim() || '—'} />
                  </>
                )}
              </div>
            </Section>

            {/* Buổi liên quan */}
            {sessions.length > 0 && (
              <Section icon={CalendarClock} title={`Buổi liên quan (${sessions.length})`}>
                <div className="pl-4 divide-y divide-slate-200">
                  {sessions.map((s) => {
                    const statusInfo = getSessionStatusInfo(s.Status);
                    return (
                      <div key={s.SessionId} className="py-2.5 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-black">Buổi {s.SessionNo}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-500">Trạng thái:</span>
                            <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', statusInfo.className)}>{statusInfo.label}</span>
                          </div>
                        </div>
                        <div className="space-y-0.5 text-xs text-slate-600">
                          <div><span className="text-slate-400">Thời gian · </span>{formatDateTime(s.StartAt)} — {formatDateTime(s.EndAt)}</div>
                          <div><span className="text-slate-400">Địa điểm · </span>{s.Location || '—'}{s.IsOnline != null ? (s.IsOnline ? ' · Trực tuyến' : ' · Trực tiếp') : ''}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* Thiết bị */}
            <Section
              icon={Package}
              title={`Thiết bị (${equipmentList.length})`}
              action={
                isEquipmentManager && equipmentList.length > 0 ? (
                  showApprovalMode ? (
                    <Checkbox
                      checked={selectedEquipmentIds.length === equipmentList.length}
                      indeterminate={selectedEquipmentIds.length > 0 && selectedEquipmentIds.length < equipmentList.length}
                      onChange={(e) => {
                        setSelectedEquipmentIds(e.target.checked ? equipmentList.map(er => er.EquipmentId) : []);
                      }}
                    >
                      <span className="text-xs text-slate-600">Chọn tất cả</span>
                    </Checkbox>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setShowApprovalMode(true)}
                      className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
                    >
                      Duyệt thiết bị
                    </Button>
                  )
                ) : undefined
              }
            >
              {equipmentList.length === 0 ? (
                <p className="pl-4 py-2 text-sm text-slate-500">Không có thiết bị.</p>
              ) : (
                <>
                  <div className="pl-4 divide-y divide-slate-200">
                    {equipmentList.map((er, idx) => {
                      const eq = er.Equipment;
                      const displayName = eq?.EquipmentName?.trim() || 'Thiết bị';
                      const code = eq?.EquipmentCode?.trim();
                      const isSelected = selectedEquipmentIds.includes(er.EquipmentId);
                      const isCancelled = er.IsTemporarilyCancelled === true;
                      const isConfirmed = er.IsTemporarilyCancelled === false;
                      
                      return (
                        <div key={`${code ?? 'eq'}-${idx}`} className="py-3 flex items-center gap-3">
                          {isEquipmentManager && showApprovalMode && (
                            <Checkbox
                              checked={isSelected}
                              onChange={(e) => {
                                setSelectedEquipmentIds(prev =>
                                  e.target.checked ? [...prev, er.EquipmentId] : prev.filter(id => id !== er.EquipmentId)
                                );
                              }}
                            />
                          )}
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                            {eq?.ImgLink ? (
                              <Image src={eq.ImgLink} alt={displayName} width={48} height={48} style={{ width: 48, height: 48, objectFit: 'cover' }} preview={{ mask: 'Xem ảnh' }} />
                            ) : (
                              <ImageOff className="h-5 w-5 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[#2197C0]">{displayName}</p>
                                <p className="text-xs text-slate-500">Mã: <span className="font-medium text-slate-700">{code || '—'}</span></p>
                                <p className="text-xs text-slate-500">Danh mục: <span className="font-medium text-slate-700">{eq?.CategoryName || '—'}</span></p>
                              </div>
                              {isCancelled && (
                                <Badge className="shrink-0 border-0 bg-red-50 text-xs text-red-700">Từ chối</Badge>
                              )}
                              {isConfirmed && (
                                <Badge className="shrink-0 border-0 bg-green-50 text-xs text-green-700">Đã xác nhận</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {isEquipmentManager && showApprovalMode && selectedEquipmentIds.length > 0 && (
                    <div className="mt-3 pl-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-600">
                        Đã chọn <span className="font-semibold text-[#2197C0]">{selectedEquipmentIds.length}</span> thiết bị
                      </span>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="sm" disabled={approving}
                          onClick={async () => {
                            try {
                              setApproving(true);
                              await reservationApi.approveEquipments(reservation.ReservationId, selectedEquipmentIds, false);
                              message.success('Đã từ chối thiết bị');
                              setSelectedEquipmentIds([]);
                              setShowApprovalMode(false);
                              onEquipmentsApproved?.();
                              onClose();
                            } catch (err: any) {
                              message.error(err?.response?.data?.message || err?.message || 'Từ chối thất bại');
                            } finally { setApproving(false); }
                          }}
                          className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4" />
                          Từ chối
                        </Button>
                        <Button type="button" size="sm" disabled={approving}
                          onClick={async () => {
                            try {
                              setApproving(true);
                              await reservationApi.approveEquipments(reservation.ReservationId, selectedEquipmentIds, true);
                              message.success('Đã duyệt thiết bị');
                              setSelectedEquipmentIds([]);
                              setShowApprovalMode(false);
                              onEquipmentsApproved?.();
                              onClose();
                            } catch (err: any) {
                              message.error(err?.response?.data?.message || err?.message || 'Duyệt thất bại');
                            } finally { setApproving(false); }
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
            </Section>

          </div>
        </div>
      </div>
    </>
  );
}
