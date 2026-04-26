import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { ImageOff } from 'lucide-react';
import { message, Image } from 'antd';
import reservationService from '../../reservation/api/reservationApi';
import type { EquipmentReservationItemResponse, ReservationDetail } from '@/modules/reservation/reservation.types';
import { normalizeReservationResponse } from '@/modules/reservation/utils/normalizeReservationResponse';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import EditReservationModal from '@/modules/reservation/pages/EditReservationModal';
import type { RequestSessionSummary } from '../request';
import sessionService from '../api/sessionApi';
import type { AssignmentResponse, SessionResponse } from '../session.types';
import RequestDetailTeamPanel from './RequestDetailTeamPanel';
import { SESSION_STATUS, getSessionStatusCode } from '@/constants/status';

export type SessionDetailProps = {
  session: RequestSessionSummary & {
    reservationId?: number | null;
    teamAssigned?: boolean;
  };
  reloadKey?: number;
  requestId: number;
  requestCode: string;
  assignedTeamIds?: number[];
  showTeamSummary?: boolean;
  showReservedEquipment?: boolean;
  sectionMode?: 'all' | 'info' | 'equipment';
  canEditReservation?: boolean;
  onReservationUpdated?: () => void | Promise<void>;
  reviewMode?: boolean;
  requestStatus?: string | number | null;
  onApproveAssignment?: (assignment: AssignmentResponse) => void | Promise<void>;
  onRejectAssignment?: (assignment: AssignmentResponse) => void | Promise<void>;
  isApprovingAssignment?: (assignmentId: number) => boolean;
};

export default function RequestSessionDetailPanel({
  session,
  reloadKey = 0,
  requestCode,
  assignedTeamIds = [],
  showTeamSummary: showTeamSummaryProp = true,
  showReservedEquipment = true,
  sectionMode = 'all',
  canEditReservation = true,
  onReservationUpdated,
  requestStatus,
}: SessionDetailProps) {
  const renderInfoCard = sectionMode === 'all' || sectionMode === 'info';
  const renderEquipmentCard = (sectionMode === 'all' || sectionMode === 'equipment') && showReservedEquipment;
  const shouldFetchSessionDetail = renderInfoCard;

  // Nút "Sửa đặt trước" chỉ hiện khi session status là 2, 4, 5, 6
  const sessionStatusCode = getSessionStatusCode(session.status);
  const canEditReservationByStatus =
    sessionStatusCode === SESSION_STATUS.APPROVED ||        // 2
    sessionStatusCode === SESSION_STATUS.ASSIGNING ||       // 4
    sessionStatusCode === SESSION_STATUS.ASSIGNMENT_REJECTED || // 5
    sessionStatusCode === SESSION_STATUS.ASSIGNED;          // 6
  const effectiveCanEditReservation = canEditReservation && canEditReservationByStatus;
  const showTeamBlock = renderInfoCard && showTeamSummaryProp;

  const [sessionDetail, setSessionDetail] = useState<SessionResponse | null>(null);
  const [sessionLoading, setSessionLoading] = useState(() => shouldFetchSessionDetail);
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
        const detail = await sessionService.getById(Number(session.sessionId));
        if (cancelled) return;
        setSessionDetail(detail);
      } catch (err: unknown) {
        if (cancelled) return;
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Không tải được thông tin buổi.';
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
  }, [session.sessionId, shouldFetchSessionDetail, reloadKey]);

  const mergedSession = useMemo(() => {
    return sessionDetail;
  }, [sessionDetail]);

  const startAt = mergedSession?.StartAt ?? (mergedSession as any)?.startAt ?? null;
  const endAt = mergedSession?.EndAt ?? (mergedSession as any)?.endAt ?? null;
  const location = mergedSession?.Location ?? (mergedSession as any)?.location ?? null;
  const teachersRequired =
    mergedSession?.TeachersRequired ?? (mergedSession as any)?.teachersRequired ?? null;
  const tasRequired = mergedSession?.TasRequired ?? (mergedSession as any)?.tasRequired ?? null;
  const notes = String(
    mergedSession?.Notes ??
      (mergedSession as any)?.notes ??
      '',
  ).trim();
  const isOnlineRaw =
    mergedSession?.IsOnline ??
    (mergedSession as any)?.isOnline ??
    null;
  const createdAt = mergedSession?.CreatedAt ?? (mergedSession as any)?.createdAt ?? null;
  const updatedAt = mergedSession?.UpdatedAt ?? (mergedSession as any)?.updatedAt ?? null;
  const eventSession = mergedSession?.EventSession ?? (mergedSession as any)?.eventSession ?? null;
  const subjectSession = mergedSession?.SubjectSession ?? (mergedSession as any)?.subjectSession ?? null;
  const sessionDescription = String(
    eventSession?.Description ??
      eventSession?.description ??
      subjectSession?.Description ??
      subjectSession?.description ??
      '',
  ).trim();
  const sessionDuration = String(
    eventSession?.Duration ??
      eventSession?.duration ??
      subjectSession?.Duration ??
      subjectSession?.duration ??
      '',
  ).trim();

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

  const topics = useMemo(() => {
    const detailAny = mergedSession as any;
    const fromEvent = (Array.isArray(detailAny?.EventSession?.topics ?? detailAny?.eventSession?.topics)
      ? (detailAny?.EventSession?.topics ?? detailAny?.eventSession?.topics)
      : []) as any[];
    const fromSubject = (Array.isArray(detailAny?.SubjectSession?.topics ?? detailAny?.subjectSession?.topics)
      ? (detailAny?.SubjectSession?.topics ?? detailAny?.subjectSession?.topics)
      : []) as any[];

    // course/subject: topicName là string đơn trực tiếp trên subjectSession
    const subjectTopicName = String(
      detailAny?.SubjectSession?.topicName ?? detailAny?.subjectSession?.topicName ?? ''
    ).trim();

    const names = [...fromEvent, ...fromSubject]
      .filter((t: any) => (t?.IsActive ?? t?.isActive ?? true) !== false)
      .map((t: any) => String(t?.TopicName ?? t?.topicName ?? '').trim())
      .filter(Boolean);

    if (subjectTopicName) names.push(subjectTopicName);
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

  // Chờ tất cả data load xong mới render (giống PC)
  const isAnyLoading = sessionLoading || (renderEquipmentCard && !!resolvedReservationId && reservedLoading);

  return (
    <div className="space-y-4 text-sm">
      {isAnyLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <div className="flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-slate-300 border-t-[#2197C0] rounded-full animate-spin" />
            <p className="text-xs">Đang tải...</p>
          </div>
        </div>
      ) : (
      <>
      {renderInfoCard && (
        <div className="bg-white">
          <div  />

          <div className="pt-3 space-y-4 text-sm">
            {sessionError && <p className="text-xs text-red-600">{sessionError}</p>}

            <div className="grid grid-cols-1 gap-1">
              <p className="text-xs text-slate-500">
                {startAt && endAt
                  ? `${dayjs(startAt).format('DD/MM/YYYY HH:mm')} - ${dayjs(endAt).format('HH:mm')}`
                  : '—'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Mã buổi</p>
                <p className="mt-1 font-medium text-slate-900">{session.sessionId ?? '—'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Mã yêu cầu</p>
                <p className="mt-1 font-medium text-slate-900">{requestCode}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Buổi số</p>
                <p className="mt-1 font-medium text-slate-900">{session.sessionNo ?? '—'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Thời lượng</p>
                <p className="mt-1 font-semibold text-[#2197C0]">{sessionDuration || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Địa điểm</p>
                <p className="mt-1 font-semibold text-[#2197C0]">{location || '—'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Hình thức</p>
                <p className="mt-1 font-medium text-slate-900">
                  {isOnlineRaw == null ? '—' : isOnlineRaw ? 'Trực tuyến' : 'Trực tiếp'}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Giảng viên yêu cầu</p>
                <p className="mt-1 font-medium text-slate-900">{teachersRequired ?? '—'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Sinh viên yêu cầu</p>
                <p className="mt-1 font-medium text-slate-900">{tasRequired ?? '—'}</p>
              </div>
            </div>

            {(sessionDescription || notes) && <div className="border-t border-slate-100" />}

            {sessionDescription ? (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Mô tả nội dung</p>
                <p className="mt-1 text-slate-700 leading-6">{sessionDescription}</p>
              </div>
            ) : null}

            {notes ? (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Ghi chú</p>
                <p className="mt-1 text-slate-700 leading-6">{notes}</p>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Chủ đề</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {topics.length === 0 ? (
                    <span className="text-slate-700">—</span>
                  ) : (
                    topics.map((name) => (
                      <Badge key={name} className="bg-violet-100 text-violet-700 border-0 text-[11px] font-medium">
                        {name}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Kỹ năng</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {skills.length === 0 ? (
                  <span className="text-slate-700">—</span>
                ) : (
                  skills.map((name) => (
                    <Badge key={name} className="bg-orange-100 text-orange-700 border-0 text-[11px] font-medium">
                      {name}
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-slate-100" />

            <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-xs text-slate-500 md:grid-cols-2">
              <div>
                <span className="uppercase tracking-wide">Tạo lúc: </span>
                <span className="text-slate-600">{createdAt ? dayjs(createdAt).format('DD/MM/YYYY HH:mm:ss') : '—'}</span>
              </div>
              <div>
                <span className="uppercase tracking-wide">Cập nhật: </span>
                <span className="text-slate-600">{updatedAt ? dayjs(updatedAt).format('DD/MM/YYYY HH:mm:ss') : '—'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTeamBlock && sessionDetail && (
        <div className="mt-6">
          <RequestDetailTeamPanel
            session={{
              sessionId: session.sessionId,
              sessionNo: session.sessionNo ?? 0,
              startAt: startAt ?? '',
              endAt: endAt ?? '',
              teachersRequired: teachersRequired,
              tasRequired: tasRequired,
            }}
            currentTeamQuantities={
              sessionDetail.TeamSessions
                ? sessionDetail.TeamSessions.reduce<Record<number, { teachersRequired: number; tasRequired: number }>>((acc, ts) => {
                    const teamId = Number(ts.TeamId ?? 0);
                    if (teamId > 0) {
                      acc[teamId] = {
                        teachersRequired: Math.max(0, Number(ts.TeachersRequired ?? 0)),
                        tasRequired: Math.max(0, Number(ts.TasRequired ?? 0)),
                      };
                    }
                    return acc;
                  }, {})
                : undefined
            }
            currentAssignedTeamIds={assignedTeamIds}
            separateTeacherSelection={true}
            canEdit={false}
            requestStatus={requestStatus}
            onAssignSession={() => {
              // Read-only mode, no action needed
            }}
          />
        </div>
      )}

      {renderEquipmentCard && (
        <>
          <div className="bg-white">
            <div className="px-0 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200">
              <h3 className="font-semibold text-gray-900 text-sm">Danh sách thiết bị yêu cầu trước</h3>
              {resolvedReservationId && effectiveCanEditReservation ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs border-sky-200 text-sky-700 hover:bg-sky-50"
                  disabled={editReservationLoading}
                  onClick={() => void handleOpenEditReservation()}
                >
                  Sửa đơn yêu cầu thiết bị
                </Button>
              ) : null}
            </div>
            <div className="px-0 py-3 space-y-2">
              {!resolvedReservationId ? (
                <p className="text-xs text-gray-500">Chưa có thiết bị mượn trước cho buổi này.</p>
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
                      className="px-0 py-2.5 flex items-center gap-3 border-b border-slate-100 last:border-b-0"
                    >
                      <div className="w-10 h-10 rounded-sm overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0 flex items-center justify-center">
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
                          <ImageOff className="w-5 h-5 text-gray-300" />
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

      {effectiveCanEditReservation ? (
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
      </>
      )}
    </div>
  );
}

