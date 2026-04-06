import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Clock, Calendar, MapPin, Hash, GraduationCap, Users, SquarePen } from 'lucide-react';
import { message } from 'antd';
import reservationService from '../../reservation/api/reservationApi';
import type { EquipmentReservationItemResponse, ReservationDetail } from '@/modules/reservation/reservation.types';
import { normalizeReservationResponse } from '@/modules/reservation/utils/normalizeReservationResponse';
import { ImageOff } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import EditReservationModal from '@/modules/reservation/pages/EditReservationModal';
import type { RequestSessionSummary } from '../request';
import sessionService from '../api/sessionApi';
import type { PagedResponse, SessionResponse } from '../session.types';
import { Image } from 'antd';

export type SessionDetailProps = {
  session: RequestSessionSummary & {
    reservationId?: number | null;
    teamAssigned?: boolean;
  };
  requestId: number;
  requestCode: string;
  showReservedEquipment?: boolean;
  sectionMode?: 'all' | 'info' | 'equipment';
  /** Cho phép mở UI sửa đặt trước (mặc định: true). */
  canEditReservation?: boolean;
  /** Gọi sau khi sửa đặt trước thành công (vd. đồng bộ lại session / yêu cầu). */
  onReservationUpdated?: () => void | Promise<void>;
};

export default function RequestSessionDetailPanel({
  session,
  requestId,
  requestCode,
  showReservedEquipment = true,
  sectionMode = 'all',
  canEditReservation = true,
  onReservationUpdated,
}: SessionDetailProps) {
  const renderInfoCard = sectionMode === 'all' || sectionMode === 'info';
  const renderEquipmentCard = (sectionMode === 'all' || sectionMode === 'equipment') && showReservedEquipment;
  const shouldFetchSessionDetail = renderInfoCard;

  const [sessionDetail, setSessionDetail] = useState<SessionResponse | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [reservedEquipments, setReservedEquipments] = useState<EquipmentReservationItemResponse[]>([]);
  const [reservedLoading, setReservedLoading] = useState(false);
  const [reservedError, setReservedError] = useState<string | null>(null);
  const [reservedListVersion, setReservedListVersion] = useState(0);

  const [editReservationOpen, setEditReservationOpen] = useState(false);
  const [editReservationDetail, setEditReservationDetail] = useState<ReservationDetail | null>(null);
  const [editReservationLoading, setEditReservationLoading] = useState(false);

  useEffect(() => {
    if (!shouldFetchSessionDetail) {
      setSessionDetail(null);
      setSessionError(null);
      setSessionLoading(false);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setSessionLoading(true);
      setSessionError(null);
      try {
        const res = await sessionService.getFilter({
          RequestId: requestId,
          PageNumber: 1,
          PageSize: 500,
        });
        const items = (res as PagedResponse<SessionResponse>).Items ?? [];
        const found =
          items.find((s) => Number(s.SessionId) === Number(session.sessionId)) ?? null;
        if (cancelled) return;
        setSessionDetail(found);
        if (!found) {
          setSessionError('Không tìm thấy thông tin phiên từ danh sách sessions/filter.');
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Không tải được thông tin phiên.';
        setSessionError(msg);
        setSessionDetail(null);
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [requestId, session.sessionId, shouldFetchSessionDetail]);

  const mergedSession = useMemo(() => {
    return sessionDetail;
  }, [sessionDetail]);

  const startAt = mergedSession?.StartAt ?? (mergedSession as any)?.startAt ?? null;
  const endAt = mergedSession?.EndAt ?? (mergedSession as any)?.endAt ?? null;
  const location = mergedSession?.Location ?? (mergedSession as any)?.location ?? null;
  const teachersRequired =
    mergedSession?.TeachersRequired ?? (mergedSession as any)?.teachersRequired ?? null;
  const tasRequired = mergedSession?.TasRequired ?? (mergedSession as any)?.tasRequired ?? null;

  const skills = useMemo(() => {
    const detail = mergedSession as SessionResponse | null;
    const list = [
      ...(Array.isArray(detail?.EventSessionSkill) ? detail.EventSessionSkill : []),
      ...(Array.isArray(detail?.SubjectSkill) ? detail.SubjectSkill : []),
      ...(Array.isArray((detail as any)?.eventSessionSkill) ? (detail as any).eventSessionSkill : []),
      ...(Array.isArray((detail as any)?.subjectSkill) ? (detail as any).subjectSkill : []),
    ];
    const names = list
      .filter((s: any) => (s?.IsActive ?? s?.isActive ?? true) !== false)
      .map((s: any) => String(s?.SkillName ?? s?.skillName ?? '').trim())
      .filter(Boolean);
    return Array.from(new Set(names));
  }, [mergedSession]);

  const resolvedReservationId = useMemo(() => {
    const raw =
      (mergedSession as unknown as { ReservationId?: number | string | null })?.ReservationId ??
      session.reservationId ??
      (mergedSession as any)?.reservationId ??
      null;
    if (raw == null) return null;
    const n = Number(raw);
    return !Number.isNaN(n) && n > 0 ? n : null;
  }, [mergedSession, session.reservationId]);

  useEffect(() => {
    if (!showReservedEquipment) {
      setReservedEquipments([]);
      setReservedError(null);
      setReservedLoading(false);
      return;
    }
    if (!resolvedReservationId) {
      setReservedEquipments([]);
      return;
    }
    const fetchReserved = async () => {
      setReservedLoading(true);
      setReservedError(null);
      try {
        const detail = normalizeReservationResponse(
          await reservationService.getById(resolvedReservationId),
        );
        setReservedEquipments(detail.EquipmentReservations ?? []);
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Không tải được thiết bị đã đặt trước.';
        setReservedError(msg);
        setReservedEquipments([]);
      } finally {
        setReservedLoading(false);
      }
    };
    void fetchReserved();
  }, [resolvedReservationId, showReservedEquipment, reservedListVersion]);

  const handleOpenEditReservation = useCallback(async () => {
    if (!resolvedReservationId) return;
    setEditReservationLoading(true);
    try {
      const raw = await reservationService.getById(resolvedReservationId);
      setEditReservationDetail(normalizeReservationResponse(raw));
      setEditReservationOpen(true);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Không tải được thông tin đặt trước.';
      message.error(msg);
    } finally {
      setEditReservationLoading(false);
    }
  }, [resolvedReservationId]);

  const handleEditReservationSaved = useCallback(
    async (_detail: ReservationDetail) => {
      setEditReservationOpen(false);
      setEditReservationDetail(null);
      setReservedListVersion((v) => v + 1);
      try {
        await onReservationUpdated?.();
      } catch {
        /* parent đã toast lỗi nếu cần */
      }
    },
    [onReservationUpdated],
  );

  return (
    <div className="space-y-4 text-sm">
      {renderInfoCard && (
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100">
        <div className="px-4 py-2.5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Thông tin phiên</h3>
        </div>
        <div className="px-4 py-3 space-y-3 text-sm">
          {sessionError && <p className="text-xs text-red-600">{sessionError}</p>}
          <div className="flex items-center gap-3 text-gray-600">
            <Clock className="h-4 w-4 shrink-0 text-[#2197C0]" />
            <span className="text-gray-500">Thời gian:</span>
            <span className="font-medium text-black">
              {sessionLoading
                ? 'Đang tải...'
                : mergedSession
                  ? startAt && endAt
                    ? `${dayjs(startAt).format('HH:mm')} - ${dayjs(endAt).format('HH:mm')}`
                    : '—'
                  : '—'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <Calendar className="h-4 w-4 shrink-0 text-[#2197C0]" />
            <span className="text-gray-500">Ngày:</span>
            <span className="font-medium text-black">
              {sessionLoading ? 'Đang tải...' : startAt ? dayjs(startAt).format('DD/MM/YYYY') : '—'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <MapPin className="h-4 w-4 shrink-0 text-[#2197C0]" />
            <span className="text-gray-500">Địa điểm:</span>
            <span className="font-medium text-black">
              {sessionLoading
                ? 'Đang tải...'
                : (location || '—')}
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <Hash className="h-4 w-4 shrink-0 text-[#2197C0]" />
            <span className="text-gray-500">Mã yêu cầu:</span>
            <span className="font-semibold text-[#2197C0]">{requestCode}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-700">
            <GraduationCap className="h-4 w-4 shrink-0 text-[#2197C0]" />
            <span className="font-semibold text-gray-900">Số lượng giảng viên yêu cầu:</span>
            <span className="text-base font-bold tracking-tight text-[#2197C0]">
              {sessionLoading ? 'Đang tải...' : (teachersRequired ?? '—')}
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-700">
            <Users className="h-4 w-4 shrink-0 text-[#2197C0]" />
            <span className="font-semibold text-gray-900">Số lượng trợ giảng yêu cầu:</span>
            <span className="text-base font-bold text-violet-700 tracking-tight">
              {sessionLoading ? 'Đang tải...' : (tasRequired ?? '—')}
            </span>
          </div>

          <div className="flex items-start gap-3 text-gray-600">
            <span className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
            <span className="text-gray-500 shrink-0">Kỹ năng:</span>
            <div className="flex flex-wrap gap-1.5">
              {sessionLoading ? (
                <span className="font-medium text-black">Đang tải...</span>
              ) : skills.length === 0 ? (
                <span className="font-medium text-black">—</span>
              ) : (
                skills.map((name) => (
                  <Badge
                    key={name}
                    className="bg-[#2197C0]/10 text-[#2197C0] border-0 text-[11px]"
                  >
                    {name}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {renderEquipmentCard && (
        <>
          <div className="rounded-2xl bg-white shadow-sm border border-gray-100">
            <div className="px-4 py-2.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-gray-900 text-sm">Danh sách thiết bị mượn trước</h3>
              {resolvedReservationId && canEditReservation ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs border-sky-200 text-sky-700 hover:bg-sky-50"
                  disabled={editReservationLoading}
                  onClick={() => void handleOpenEditReservation()}
                >
                  <SquarePen className="w-3.5 h-3.5" />
                  Sửa đặt trước
                </Button>
              ) : null}
            </div>
            <div className="px-4 py-3 space-y-2">
              {!resolvedReservationId ? (
                <p className="text-xs text-gray-500">Chưa có thiết bị mượn trước cho phiên này.</p>
              ) : reservedLoading ? (
                <p className="text-xs text-gray-500">Đang tải danh sách thiết bị...</p>
              ) : reservedError ? (
                <p className="text-xs text-red-600">{reservedError}</p>
              ) : reservedEquipments.length === 0 ? (
                <p className="text-xs text-gray-500">Không có thiết bị nào trong danh sách mượn trước.</p>
              ) : (
                <ul className="space-y-2">
                  {reservedEquipments.map((er) => {
                    const eq = er.Equipment;
                    return (
                    <li
                      key={er.EquipmentId}
                      className="rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-50 flex-shrink-0 flex items-center justify-center">
                        {eq?.ImgLink ? (
                          <Image
                            src={eq.ImgLink}
                            alt={eq.EquipmentName || `Thiết bị #${er.EquipmentId}`}
                            width={40}
                            height={40}
                            className="object-cover"
                            preview={{ mask: 'Xem ảnh' }}
                          />
                        ) : (
                          <ImageOff className="w-5 h-5 text-gray-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div>
                          <div>
                            <div className="font-medium text-sm text-gray-900 truncate">
                              {eq?.EquipmentName || `Thiết bị #${er.EquipmentId}`}
                            </div>
                            <div className="text-xs text-gray-500">
                              Mã: {eq?.EquipmentCode || er.EquipmentId}
                            </div>
                          </div>
                        </div>

                        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-gray-500">
                          <span className="truncate">Danh mục: {eq?.CategoryName || '—'}</span>
                        </div>
                      </div>
                    </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {canEditReservation ? (
        <EditReservationModal
          open={editReservationOpen}
          reservation={editReservationDetail}
          onClose={() => {
            setEditReservationOpen(false);
            setEditReservationDetail(null);
          }}
          onSaved={handleEditReservationSaved}
        />
      ) : null}
    </div>
  );
}

