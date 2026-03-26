import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Clock, Calendar, MapPin, Hash, GraduationCap, Users } from 'lucide-react';
import reservationService from '../../reservation/api/reservationApi';
import type { ReservedEquipmentItem } from '../type';
import { ImageOff } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import type { RequestSessionSummary } from '../request';
import sessionService from '../api/sessionApi';
import type { PagedResponse, SessionResponse } from '../session.types';

export type SessionDetailProps = {
  session: RequestSessionSummary & {
    reservationId?: number | null;
    teamAssigned?: boolean;
  };
  requestId: number;
  requestCode: string;
  showReservedEquipment?: boolean;
  sectionMode?: 'all' | 'info' | 'equipment';
};

export default function RequestSessionDetailPanel({
  session,
  requestId,
  requestCode,
  showReservedEquipment = true,
  sectionMode = 'all',
}: SessionDetailProps) {
  const renderInfoCard = sectionMode === 'all' || sectionMode === 'info';
  const renderEquipmentCard = (sectionMode === 'all' || sectionMode === 'equipment') && showReservedEquipment;
  const shouldFetchSessionDetail = renderInfoCard;

  const [previewImage, setPreviewImage] = useState<{ src: string; name: string } | null>(null);
  const [sessionDetail, setSessionDetail] = useState<SessionResponse | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [reservedEquipments, setReservedEquipments] = useState<ReservedEquipmentItem[]>([]);
  const [reservedLoading, setReservedLoading] = useState(false);
  const [reservedError, setReservedError] = useState<string | null>(null);

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
        const items = (res as PagedResponse<SessionResponse>).Items ?? (res as any).items ?? [];
        const found =
          (items as any[]).find(
            (s) => Number(s?.SessionId ?? s?.sessionId ?? 0) === Number(session.sessionId),
          ) ?? null;
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
        const detail = await reservationService.getById(resolvedReservationId);
        const items: ReservedEquipmentItem[] = (detail.equipmentReservations ?? []).map((er: any) => {
          const eq = er?.equipment ?? {};
          return {
            equipmentId: Number(eq.equipmentId ?? er.equipmentId ?? 0),
            equipmentName: eq.equipmentName,
            equipmentCode: eq.equipmentCode,
            categoryId: eq.categoryId,
            categoryName: eq.categoryName,
            status: eq.status,
            imgLink: eq.imgLink ?? null,
            isTemporarilyCancelled: Boolean(er?.isTemporarilyCancelled ?? false),
          };
        });
        setReservedEquipments(items);
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
  }, [resolvedReservationId, showReservedEquipment]);

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
            <Clock className="w-4 h-4 text-gray-400 shrink-0" />
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
            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-gray-500">Ngày:</span>
            <span className="font-medium text-black">
              {sessionLoading ? 'Đang tải...' : startAt ? dayjs(startAt).format('DD/MM/YYYY') : '—'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-gray-500">Địa điểm:</span>
            <span className="font-medium text-black">
              {sessionLoading
                ? 'Đang tải...'
                : (location || '—')}
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <Hash className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-gray-500">Mã yêu cầu:</span>
            <span className="font-semibold text-sky-600">{requestCode}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <GraduationCap className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-gray-500">Số lượng giảng viên:</span>
            <span className="font-medium text-black">
              {sessionLoading ? 'Đang tải...' : (teachersRequired ?? '—')}
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <Users className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-gray-500">Số lượng trợ giảng:</span>
            <span className="font-medium text-black">
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
            <div className="px-4 py-2.5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Danh sách thiết bị mượn trước</h3>
            </div>
            <div className="px-4 py-3 space-y-2">
              {session.reservationId == null ? (
                <p className="text-xs text-gray-500">Chưa có thiết bị mượn trước cho phiên này.</p>
              ) : reservedLoading ? (
                <p className="text-xs text-gray-500">Đang tải danh sách thiết bị...</p>
              ) : reservedError ? (
                <p className="text-xs text-red-600">{reservedError}</p>
              ) : reservedEquipments.length === 0 ? (
                <p className="text-xs text-gray-500">Không có thiết bị nào trong danh sách mượn trước.</p>
              ) : (
                <ul className="space-y-2">
                  {reservedEquipments.map((eq) => (
                    <li
                      key={eq.equipmentId}
                      className="rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-50 flex-shrink-0 flex items-center justify-center">
                        {eq.imgLink ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewImage({
                                src: eq.imgLink as string,
                                name: eq.equipmentName || `Thiết bị #${eq.equipmentId}`,
                              })
                            }
                            className="block w-full h-full cursor-zoom-in p-0 border-0 bg-transparent"
                            aria-label={`Xem ảnh lớn của ${eq.equipmentName || `thiết bị ${eq.equipmentId}`}`}
                            title="Bấm để xem ảnh lớn"
                          >
                            <img
                              src={eq.imgLink}
                              alt={eq.equipmentName}
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
                        <div>
                          <div>
                            <div className="font-medium text-sm text-gray-900 truncate">
                              {eq.equipmentName || `Thiết bị #${eq.equipmentId}`}
                            </div>
                            <div className="text-xs text-gray-500">
                              Mã: {eq.equipmentCode || eq.equipmentId}
                            </div>
                          </div>
                        </div>

                        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-gray-500">
                          <span className="truncate">Danh mục: {eq.categoryName || '—'}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh thiết bị"
        >
          <div
            className="relative max-w-4xl w-full flex flex-col items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewImage.src}
              alt={previewImage.name}
              className="max-h-[80vh] w-auto max-w-full rounded-lg shadow-2xl object-contain bg-white"
            />
            <p className="text-white text-sm">{previewImage.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}

