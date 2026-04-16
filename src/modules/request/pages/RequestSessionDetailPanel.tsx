import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { message } from 'antd';
import reservationService from '../../reservation/api/reservationApi';
import type { EquipmentReservationItemResponse, ReservationDetail } from '@/modules/reservation/reservation.types';
import { normalizeReservationResponse } from '@/modules/reservation/utils/normalizeReservationResponse';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import EditReservationModal from '@/modules/reservation/pages/EditReservationModal';
import type { RequestSessionSummary } from '../request';
import sessionService from '../api/sessionApi';
import type { AssignmentResponse, SessionResponse } from '../session.types';
import RequestDetailTeamSummary from './RequestDetailTeamSummary';

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
  reviewMode = false,
  onApproveAssignment,
  onRejectAssignment,
  isApprovingAssignment,
}: SessionDetailProps) {
  const renderInfoCard = sectionMode === 'all' || sectionMode === 'info';
  const renderEquipmentCard = (sectionMode === 'all' || sectionMode === 'equipment') && showReservedEquipment;
  const shouldFetchSessionDetail = renderInfoCard;
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
    const detail = mergedSession as SessionResponse | null;
    const detailAny = detail as any;
    const fromEvent = [
      ...((Array.isArray(detailAny?.EventSession?.Topics) ? detailAny.EventSession.Topics : []) as any[]),
      ...((Array.isArray(detailAny?.eventSession?.topics) ? detailAny.eventSession.topics : []) as any[]),
    ];
    const fromSubject = [
      ...((Array.isArray(detailAny?.SubjectSession?.Topics) ? detailAny.SubjectSession.Topics : []) as any[]),
      ...((Array.isArray(detailAny?.subjectSession?.topics) ? detailAny.subjectSession.topics : []) as any[]),
    ];
    const names = [...fromEvent, ...fromSubject]
      .filter((t: any) => (t?.IsActive ?? t?.isActive ?? true) !== false)
      .map((t: any) => String(t?.TopicName ?? t?.topicName ?? '').trim())
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
        <div className="bg-white">
          <div  />

          <div className="pt-3 space-y-4 text-sm">
            {sessionError && <p className="text-xs text-red-600">{sessionError}</p>}

            <div className="grid grid-cols-1 gap-1">
              <p className="text-xs text-slate-500">
                {sessionLoading
                  ? 'Đang tải...'
                  : startAt && endAt
                    ? `${dayjs(startAt).format('DD/MM/YYYY HH:mm')} - ${dayjs(endAt).format('HH:mm')}`
                    : '—'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Mã buổi</p>
                <p className="mt-1 font-medium text-slate-900">{sessionLoading ? 'Đang tải...' : (session.sessionId ?? '—')}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Mã yêu cầu</p>
                <p className="mt-1 font-semibold ">{requestCode}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Buổi số</p>
                <p className="mt-1 font-medium text-slate-900">{session.sessionNo ?? '—'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Thời lượng</p>
                <p className="mt-1 font-semibold text-[#2197C0]">{sessionLoading ? 'Đang tải...' : (sessionDuration || '—')}</p>
              </div>
              
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Địa điểm</p>
                <p className="mt-1 font-semibold text-[#2197C0]">{sessionLoading ? 'Đang tải...' : (location || '—')}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Hình thức</p>
                <p className="mt-1 font-medium text-slate-900">
                  {sessionLoading ? 'Đang tải...' : isOnlineRaw == null ? '—' : isOnlineRaw ? 'Trực tuyến' : 'Trực tiếp'}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Giảng viên yêu cầu</p>
                <p className="mt-1 font-semibold text-[#2197C0]">{sessionLoading ? 'Đang tải...' : (teachersRequired ?? '—')}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Sinh viên yêu cầu</p>
                <p className="mt-1 font-semibold text-[#2197C0]">{sessionLoading ? 'Đang tải...' : (tasRequired ?? '—')}</p>
              </div>
            </div>

            {(sessionDescription || notes) && <div className="border-t border-slate-100" />}

            {sessionDescription ? (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Mô tả nội dung</p>
                <p className="mt-1 text-slate-700 leading-6">{sessionLoading ? 'Đang tải...' : sessionDescription}</p>
              </div>
            ) : null}

            {notes ? (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Ghi chú</p>
                <p className="mt-1 text-slate-700 leading-6">{sessionLoading ? 'Đang tải...' : notes}</p>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-x-6 gap-y-2 md:grid-cols-2">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Chủ đề</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {sessionLoading ? (
                    <span className="text-slate-700">Đang tải...</span>
                  ) : topics.length === 0 ? (
                    <span className="text-slate-700">—</span>
                  ) : (
                    topics.map((name) => (
                      <Badge key={name} className="bg-slate-100 text-slate-700 border-0 text-[11px] font-medium">
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
                {sessionLoading ? (
                  <span className="text-slate-700">Đang tải...</span>
                ) : skills.length === 0 ? (
                  <span className="text-slate-700">—</span>
                ) : (
                  skills.map((name) => (
                    <Badge key={name} className="bg-[#2197C0]/10 text-[#2197C0] border-0 text-[11px] font-medium">
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
                <span className="text-slate-600">
                  {sessionLoading ? 'Đang tải...' : (createdAt ? dayjs(createdAt).format('DD/MM/YYYY HH:mm:ss') : '—')}
                </span>
              </div>
              <div>
                <span className="uppercase tracking-wide">Cập nhật: </span>
                <span className="text-slate-600">
                  {sessionLoading ? 'Đang tải...' : (updatedAt ? dayjs(updatedAt).format('DD/MM/YYYY HH:mm:ss') : '—')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTeamBlock && (
        <div className="mt-6">
          <RequestDetailTeamSummary
            session={session}
            assignedTeamIds={assignedTeamIds}
            sessionDetailLoading={sessionLoading}
            sessionTeamsEmbedded={
              sessionDetail != null ? (sessionDetail.TeamSessions ?? []) : undefined
            }
            sessionAssignments={
              sessionDetail != null
                ? (sessionDetail.Assignments ?? []).filter((a) => a.AssignmentId > 0)
                : undefined
            }
            reviewMode={reviewMode}
            onApproveAssignment={onApproveAssignment}
            onRejectAssignment={onRejectAssignment}
            isApprovingAssignment={isApprovingAssignment}
          />
        </div>
      )}

      {renderEquipmentCard && (
        <>
          <div className="bg-white">
            <div className="px-0 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200">
              <h3 className="font-semibold text-gray-900 text-sm">Danh sách thiết bị yêu cầu trước</h3>
              {resolvedReservationId && canEditReservation ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs border-sky-200 text-sky-700 hover:bg-sky-50"
                  disabled={editReservationLoading}
                  onClick={() => void handleOpenEditReservation()}
                >
                  Sửa đặt trước
                </Button>
              ) : null}
            </div>
            <div className="px-0 py-3 space-y-2">
              {!resolvedReservationId ? (
                <p className="text-xs text-gray-500">Chưa có thiết bị mượn trước cho buổi này.</p>
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
                      className="px-0 py-2.5 flex items-center gap-3 border-b border-slate-100 last:border-b-0"
                    >
                      <div className="w-10 h-10 overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center">
                        {eq?.ImgLink ? (
                          <img
                            src={eq.ImgLink}
                            alt={eq.EquipmentName || `Thiết bị #${er.EquipmentId}`}
                            width={40}
                            height={40}
                            loading="lazy"
                            decoding="async"
                            className="h-10 w-10 object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-gray-400">Không có ảnh</span>
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

