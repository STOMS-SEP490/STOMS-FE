import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { Plus, X, CheckCircle2, List, MapPin, AlertCircle, AlertTriangle, Paperclip, ArrowLeft } from 'lucide-react';
import { message } from 'antd';
import { Dialog } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import {
  getRequestStatusCode,
  getRequestStatusInfo,
  getSessionStatusCode,
  getSessionStatusInfo,
  REQUEST_STATUS,
  SESSION_STATUS,
} from '@/constants/status';
import {
  canManagerReviewAssignmentRow,
} from '../utils/assignmentSlotUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import type { RequestSessionSummary } from '../request';
import RequestDetailTeamPanel from './RequestDetailTeamPanel';
import RequestDetailEquipmentPanel from './RequestDetailEquipmentPanel';
import RequestSessionDetailPanel from './RequestSessionDetailPanel';
import { useRequestDetailManager } from '../hooks/useRequestDetailManager';
import type { RequestLayoutOutletContext } from '../requestDetail.types';
import { getSessionDisplayTitle } from '../utils/getSessionDisplayTitle';
import sessionService from '../api/sessionApi';
import assignmentService from '@/modules/assignment/api/assignmentApi';
import reservationService from '@/modules/reservation/api/reservationApi';
import { normalizeReservationResponse } from '@/modules/reservation/utils/normalizeReservationResponse';
import { teamApi } from '@/modules/team/api/teamApi';

const RESERVE_EQUIPMENT_ALLOWED_REQUEST_STATUS = new Set<number>([
  REQUEST_STATUS.PENDING,
  REQUEST_STATUS.APPROVED,
  REQUEST_STATUS.ASSIGNING,
  REQUEST_STATUS.PUBLISHED,
]);

const RESERVE_EQUIPMENT_SESSION_STATUS = new Set<number>([
  SESSION_STATUS.PENDING,
  SESSION_STATUS.APPROVED,
  SESSION_STATUS.ASSIGNING,
  SESSION_STATUS.ASSIGNMENT_REJECTED,
  SESSION_STATUS.ASSIGNED,
]);

export default function RequestDetail() {
  type ApproveSessionPreview = {
    sessionId: number;
    sessionNo: number;
    startAt: string;
    endAt: string;
    location?: string | null;
    teachersRequired?: number | null;
    tasRequired?: number | null;
    teams: { teamId: number; teamName: string }[];
    equipments: {
      equipmentId: number;
      equipmentName: string;
      equipmentCode?: string | null;
      categoryName?: string | null;
      imgLink?: string | null;
    }[];
  };
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refreshRequestSidebar, viewMode } = useOutletContext<RequestLayoutOutletContext>();
  const isApprovalView = viewMode === 'approval';
  const isTeamAssignView = viewMode === 'team_assign';
  const isDefaultRequestView = viewMode === 'request' || viewMode == null;
  const {
    request,
    sessions,
    rightPanel,
    setRightPanel,
    loading,
    uiAssignedTeamIdsBySessionId,
    uiTeamQuantitiesBySessionId,
    assignmentsBySessionId,
    approveOpen,
    setApproveOpen,
    rejectOpen,
    setRejectOpen,
    rejectDialogAction,
    rejectReason,
    setRejectReason,
    actionLoading,
    rejectAssignmentState,
    setRejectAssignmentState,
    rejectAssignmentReason,
    setRejectAssignmentReason,
    createdByMemberId,
    assignedCount,
    refreshDetail,
    reloadAssignmentsForSession,
    handleAssignSession,
    handleApproveClick,
    handleOpenRejectAssignment,
    handleConfirmRejectAssignment,
    handleConfirmApprove,
    handleSaveTeamAssignments,
    handleRejectClick,
    handleCancelRequestClick,
    handleConfirmReject,
    handleEquipmentSuccess,
  } = useRequestDetailManager({
    id,
    viewMode,
    refreshRequestSidebar,
  });

  const canReserveEquipment = useMemo(() => {
    if (!request?.status) return false;
    const code = getRequestStatusCode(request.status);
    return code != null && RESERVE_EQUIPMENT_ALLOWED_REQUEST_STATUS.has(code);
  }, [request?.status]);

  const requestDateRange = useMemo(() => {
    const list = sessions ?? [];
    if (!list.length) return { startAt: null as string | null, endAt: null as string | null };

    const s1 = list.find((s) => s.sessionNo === 1) ?? null;
    const maxNo = list.reduce((m, s) => (s.sessionNo > m ? s.sessionNo : m), 1);
    const sLast = list.find((s) => s.sessionNo === maxNo) ?? null;

    const startAt =
      s1?.startAt ??
      list.reduce<string | null>((min, s) => {
        if (!s.startAt) return min;
        if (!min) return s.startAt;
        return dayjs(s.startAt).isBefore(min) ? s.startAt : min;
      }, null);
    const endAt =
      sLast?.endAt ??
      list.reduce<string | null>((max, s) => {
        if (!s.endAt) return max;
        if (!max) return s.endAt;
        return dayjs(s.endAt).isAfter(max) ? s.endAt : max;
      }, null);

    return { startAt, endAt };
  }, [sessions]);

  useEffect(() => {
    if (rightPanel?.mode !== 'equipment') return;
    if (!canReserveEquipment) setRightPanel(null);
  }, [rightPanel?.mode, canReserveEquipment, setRightPanel]);

  const sessionsEligibleForEquipmentReserve = useMemo(() => {
    return sessions.filter((s) => {
      const code = getSessionStatusCode(s.status);
      return code != null && RESERVE_EQUIPMENT_SESSION_STATUS.has(code);
    });
  }, [sessions]);

  const hasUnreservedEquipmentSlot = sessionsEligibleForEquipmentReserve.some((s) => !s.equipmentReserved);

  const remainingUnassignedSessions = Math.max(0, sessions.length - assignedCount);
  const [highlightSessionId, setHighlightSessionId] = useState<number | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);

  const scrollToNearestUnassignedSession = useCallback(() => {
    const target = document.querySelector<HTMLElement>('[data-request-session-unassigned="true"]');
    if (!target) return;

    const sidAttr = target.getAttribute('data-request-session-id');
    const sid = sidAttr ? Number(sidAttr) : null;
    if (sid != null && !Number.isNaN(sid)) {
      setHighlightSessionId(sid);
      if (highlightTimeoutRef.current != null) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
      highlightTimeoutRef.current = window.setTimeout(() => {
        setHighlightSessionId(null);
        highlightTimeoutRef.current = null;
      }, 2200);
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Focus to help the user see it and enable keyboard navigation
    target.focus({ preventScroll: true });
  }, []);

  type SessionArg = RequestSessionSummary & { sessionId: number; teachersRequired?: number | null; tasRequired?: number | null };

  const isSessionTaFullyAssigned = useCallback(
    (session: SessionArg) => {
      const teamIds = uiAssignedTeamIdsBySessionId[session.sessionId] ?? [];
      if (teamIds.length === 0) return false;
      const reqTas = Math.max(0, Number(session.tasRequired ?? 1) || 1);
      const teamQuantityMap = uiTeamQuantitiesBySessionId[session.sessionId] ?? {};
      const assignedTas = teamIds.reduce(
        (sum, teamId) => sum + Math.max(0, Number(teamQuantityMap[teamId]?.tasRequired ?? 0) || 0),
        0
      );
      return assignedTas >= reqTas;
    },
    [uiAssignedTeamIdsBySessionId, uiTeamQuantitiesBySessionId]
  );

  const isSessionTeacherFullyAssigned = useCallback(
    (session: SessionArg) => {
      const reqTeachers = Math.max(0, Number(session.teachersRequired ?? 0) || 0);
      if (reqTeachers === 0) return true;
      const rows = assignmentsBySessionId[session.sessionId] ?? [];
      const filledTeachers = rows.filter((r) => {
        const role = String(r.staffRole ?? '').toUpperCase();
        const isTeacher = role.includes('TEACH') || role === 'TE' || role.includes('GV');
        return isTeacher && Number(r.staffMemberId ?? 0) > 0;
      }).length;
      return filledTeachers >= reqTeachers;
    },
    [assignmentsBySessionId]
  );

  const isSessionFullyAssigned = useCallback(
    (session: SessionArg) => isSessionTaFullyAssigned(session) && isSessionTeacherFullyAssigned(session),
    [isSessionTaFullyAssigned, isSessionTeacherFullyAssigned]
  );

  const [attachmentPreviewOpen, setAttachmentPreviewOpen] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<{ fileName: string; fileUrl: string } | null>(
    null
  );
  const [approvePreviewLoading, setApprovePreviewLoading] = useState(false);
  const [approveSessionPreviews, setApproveSessionPreviews] = useState<ApproveSessionPreview[]>([]);
  const [cancelSessionOpen, setCancelSessionOpen] = useState(false);
  const [cancelSessionReason, setCancelSessionReason] = useState('');
  const [cancelSessionLoading, setCancelSessionLoading] = useState(false);
  const [approvingAssignmentIds, setApprovingAssignmentIds] = useState<Record<number, boolean>>({});
  const [sessionDetailReloadKey, setSessionDetailReloadKey] = useState(0);

  const handleApproveSingleAssignment = useCallback(
    async (assignmentId: number, sessionId: number) => {
      if (!assignmentId || assignmentId <= 0) return;
      try {
        setApprovingAssignmentIds((prev) => ({ ...prev, [assignmentId]: true }));
        await assignmentService.approve([assignmentId]);
        message.success('Đã duyệt phân công.');
        await reloadAssignmentsForSession(sessionId);
        await refreshDetail();
        setSessionDetailReloadKey((k) => k + 1);
        refreshRequestSidebar?.();
      } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = (err as any)?.message || 'Duyệt phân công thất bại.';
        message.error(msg);
      } finally {
        setApprovingAssignmentIds((prev) => {
          const next = { ...prev };
          delete next[assignmentId];
          return next;
        });
      }
    },
    [refreshDetail, refreshRequestSidebar, reloadAssignmentsForSession]
  );

  const loadApprovePreview = useCallback(async () => {
    if (!sessions.length) {
      setApproveSessionPreviews([]);
      return;
    }
    setApprovePreviewLoading(true);
    try {
      const detailRows = await Promise.all(
        sessions.map(async (s) => {
          try {
            const detail = await sessionService.getById(s.sessionId);
            const teamSessions = detail.TeamSessions ?? [];
            const teams = teamSessions
              .map((ts) => ({
                teamId: Number(ts.TeamId ?? 0),
                teamName: String(ts.TeamName ?? '').trim() || `Nhóm #${ts.TeamId ?? '—'}`,
              }))
              .filter((t) => t.teamId > 0);
            const selectedTeamIds = uiAssignedTeamIdsBySessionId[s.sessionId] ?? [];
            const missingTeamIds = selectedTeamIds.filter((teamId) => !teams.some((t) => t.teamId === teamId));
            if (missingTeamIds.length) {
              const fetchedTeams = await Promise.all(
                missingTeamIds.map(async (teamId) => {
                  try {
                    const t = await teamApi.getById(teamId);
                    return { teamId, teamName: String(t.teamName ?? '').trim() || `Nhóm phụ trách ${teamId}` };
                  } catch {
                    return { teamId, teamName: `Nhóm phụ trách ${teamId}` };
                  }
                })
              );
              teams.push(...fetchedTeams);
            }

            const reservationId = Number(detail.ReservationId ?? s.reservationId ?? 0);
            let equipments: ApproveSessionPreview['equipments'] = [];
            if (reservationId > 0) {
              const reservation = normalizeReservationResponse(await reservationService.getById(reservationId));
              equipments = (reservation.EquipmentReservations ?? [])
                .map((er) => ({
                  equipmentId: Number(er.EquipmentId ?? 0),
                  equipmentName: String(er.Equipment?.EquipmentName ?? '').trim() || `Thiết bị #${er.EquipmentId ?? '—'}`,
                  equipmentCode: er.Equipment?.EquipmentCode ?? null,
                  categoryName: er.Equipment?.CategoryName ?? null,
                  imgLink: er.Equipment?.ImgLink ?? null,
                }))
                .filter((eq) => eq.equipmentId > 0);
            }

            return {
              sessionId: s.sessionId,
              sessionNo: Number(detail.SessionNo ?? s.sessionNo ?? 0),
              startAt: String(detail.StartAt ?? s.startAt ?? ''),
              endAt: String(detail.EndAt ?? s.endAt ?? ''),
              location: detail.Location ?? s.location ?? null,
              teachersRequired: detail.TeachersRequired ?? s.teachersRequired ?? null,
              tasRequired: detail.TasRequired ?? s.tasRequired ?? null,
              teams,
              equipments,
            } satisfies ApproveSessionPreview;
          } catch {
            return {
              sessionId: s.sessionId,
              sessionNo: s.sessionNo,
              startAt: s.startAt,
              endAt: s.endAt,
              location: s.location ?? null,
              teachersRequired: s.teachersRequired ?? null,
              tasRequired: s.tasRequired ?? null,
              teams: [],
              equipments: [],
            } satisfies ApproveSessionPreview;
          }
        })
      );
      setApproveSessionPreviews(detailRows.sort((a, b) => a.sessionNo - b.sessionNo));
    } finally {
      setApprovePreviewLoading(false);
    }
  }, [sessions, uiAssignedTeamIdsBySessionId]);

  useEffect(() => {
    if (!approveOpen) return;
    void loadApprovePreview();
  }, [approveOpen, loadApprovePreview]);

  const openAttachmentPreview = (fileName: string | null | undefined, fileUrl: string | null | undefined) => {
    if (!fileUrl) return;
    setAttachmentPreview({
      fileName: fileName || 'Tệp đính kèm',
      fileUrl,
    });
    setAttachmentPreviewOpen(true);
  };

  const getAttachmentMeta = (fileName: string | null | undefined, fileUrl: string | null | undefined) => {
    const urlOrName = (fileUrl ?? fileName ?? '').toLowerCase();
    const extMatch = urlOrName.match(/\.([a-z0-9]{1,10})(?:\?|#|$)/);
    const ext = extMatch && extMatch.length > 1 ? String(extMatch[1]).toUpperCase() : undefined;

    if (/\.(png|jpg|jpeg|gif|webp)(?:\?|#|$)/.test(urlOrName)) {
      return { kind: 'image' as const, label: 'Hình ảnh', ext, badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', iconClass: 'text-emerald-600' };
    }
    if (/\.pdf(?:\?|#|$)/.test(urlOrName)) {
      return { kind: 'pdf' as const, label: 'PDF', ext, badgeClass: 'bg-rose-50 text-rose-700 border-rose-200', iconClass: 'text-rose-600' };
    }

    return {
      kind: 'file' as const,
      label: ext ? `.${ext}` : 'Tệp',
      ext,
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
      iconClass: 'text-sky-600',
    };
  };

  const requestStatusCode = getRequestStatusCode(request?.status);
  const isPendingRequest = requestStatusCode === REQUEST_STATUS.PENDING;
  const isApprovedRequest = requestStatusCode === REQUEST_STATUS.APPROVED;

  useEffect(() => {
    if (!isPendingRequest) return;
    if (rightPanel?.mode === 'team' || rightPanel?.mode === 'assignment') {
      setRightPanel(null);
    }
  }, [isPendingRequest, rightPanel?.mode, setRightPanel]);

  if (!id) {
    return <div className="text-sm text-black">Không tìm thấy mã yêu cầu.</div>;
  }

  if (loading && !request) {
    return <div className="text-sm text-black p-4">Đang tải dữ liệu yêu cầu...</div>;
  }

  if (!request) {
    return <div className="text-sm text-black p-4">Không tìm thấy yêu cầu.</div>;
  }

  const statusInfo = getRequestStatusInfo(request.status);
  const isRequestCancelled = requestStatusCode === REQUEST_STATUS.CANCELLED;
  const sessionCount = sessions.length || request.sessionsRequired || 0;
  const requestTypeLabel = request.courseId
    ? 'Khóa học'
    : request.eventId
      ? 'Sự kiện'
      : request.subjectId
        ? 'Môn học'
        : 'Khác';
  const dotClass = 'mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#2197C0] align-middle';
  const metaLabelClass = 'text-[11px] uppercase tracking-wide text-[#2197C0] font-semibold';
  const backPath =
    viewMode === 'assignment'
      ? '/manager/requests/assignments'
      : viewMode === 'approval'
        ? '/manager/requests/approval'
        : viewMode === 'team_assign'
          ? '/manager/requests/team-assign'
          : '/manager/requests';
  const requestRaw = request as Record<string, unknown>;
  const courseRaw =
    (requestRaw.course as Record<string, unknown> | undefined) ??
    (requestRaw.Course as Record<string, unknown> | undefined) ??
    undefined;
  const subjectRaw =
    (requestRaw.subject as Record<string, unknown> | undefined) ??
    (requestRaw.Subject as Record<string, unknown> | undefined) ??
    undefined;
  const eventRaw =
    (requestRaw.event as Record<string, unknown> | undefined) ??
    (requestRaw.Event as Record<string, unknown> | undefined) ??
    undefined;

  const sourceRaw = eventRaw ?? courseRaw ?? subjectRaw;
  const sourceName = request.courseId
    ? String(courseRaw?.courseName ?? courseRaw?.CourseName ?? '').trim()
    : request.eventId
      ? String(eventRaw?.eventName ?? eventRaw?.EventName ?? '').trim()
      : request.subjectId
        ? String(subjectRaw?.subjectName ?? subjectRaw?.SubjectName ?? '').trim()
        : '';
  const sourceNameLabel = request.courseId
    ? 'Tên khóa học'
    : request.eventId
      ? 'Tên sự kiện'
      : request.subjectId
        ? 'Tên môn học'
        : 'Tên';
  const sourceDescription = String(
    sourceRaw?.description ??
      sourceRaw?.Description ??
      ''
  ).trim();
  const sourceDuration = String(
    sourceRaw?.duration ??
      sourceRaw?.Duration ??
      ''
  ).trim();
  const hasSourceName = Boolean(sourceName);
  const hasSourceDescription = Boolean(sourceDescription);
  const hasSourceDuration = Boolean(sourceDuration);
  const hasStartAt = Boolean(requestDateRange.startAt);
  const hasEndAt = Boolean(requestDateRange.endAt);
  const resolvedDetailSession =
    rightPanel?.mode === 'detail'
      ? (sessions.find((s) => s.sessionId === rightPanel.session.sessionId) ?? rightPanel.session)
      : null;
  const resolvedPanelSession =
    rightPanel && 'session' in rightPanel
      ? (sessions.find((s) => s.sessionId === rightPanel.session.sessionId) ?? rightPanel.session)
      : null;
  const canCancelDetailSession = (() => {
    if (!resolvedDetailSession) return false;
    const code = getSessionStatusCode((resolvedDetailSession as any).status);
    if (code == null) return true;
    const blocked = new Set<number>([SESSION_STATUS.ONGOING, SESSION_STATUS.COMPLETED, SESSION_STATUS.CANCELLED]);
    return !blocked.has(code);
  })();
  const canCancelPanelSession = (() => {
    if (!resolvedPanelSession) return false;
    const code = getSessionStatusCode((resolvedPanelSession as any).status);
    if (code == null) return true;
    const blocked = new Set<number>([SESSION_STATUS.ONGOING, SESSION_STATUS.COMPLETED, SESSION_STATUS.CANCELLED]);
    return !blocked.has(code);
  })();

  const openCancelSessionDialog = () => {
    const sess = resolvedDetailSession ?? resolvedPanelSession;
    if (!sess) return;
    setCancelSessionReason('');
    setCancelSessionOpen(true);
  };

  const handleConfirmCancelSession = async () => {
    const sess = resolvedDetailSession ?? resolvedPanelSession;
    if (!sess) return;
    const trimmed = cancelSessionReason.trim();
    if (!trimmed) {
      message.warning('Vui lòng nhập lý do hủy buổi.');
      return;
    }
    try {
      setCancelSessionLoading(true);
      await sessionService.cancel({ sessionId: sess.sessionId, reason: trimmed });
      message.success('Đã hủy buổi.');
      setCancelSessionOpen(false);
      setCancelSessionReason('');
      await refreshDetail();
      refreshRequestSidebar?.();
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.message || 'Hủy buổi thất bại.';
      message.error(msg);
    } finally {
      setCancelSessionLoading(false);
    }
  };

  return (
    <>
      <div className="flex h-full min-h-0 flex-col  overflow-hidden text-black">
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar overscroll-contain pr-1">
          <div className="w-full min-w-0 space-y-4">
        <div className="bg-white rounded-xl px-6 py-5 shadow-sm border border-slate-200 mb-2">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(backPath)}
              className="!p-0 w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-black bg-white hover:bg-gray-100 transition-colors"
              aria-label="Quay lại danh sách yêu cầu"
              title="Quay lại"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <h5 className="truncate text-xl font-bold text-slate-900">
                  Chi tiết {request.requestName || request.requestCode}
                </h5>
                <p className="text-xs text-slate-700">
                  <span className="text-slate-500">Mã yêu cầu: </span>
                  <span className="font-semibold text-slate-900">{request.requestCode}</span>
                </p>
              </div>
            </div>

            <div className="flex min-w-[220px] shrink-0 flex-col items-end gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">Trạng thái:</span>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium border ${statusInfo.className}`}>
                  {statusInfo.label}
                </span>
                {!isRequestCancelled && !isApprovalView && !isDefaultRequestView ? (
                  <button
                    type="button"
                    onClick={handleCancelRequestClick}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#7f1d1d] hover:text-[#991b1b] hover:underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300/60 focus-visible:ring-offset-1 rounded-sm py-0.5"
                  >
                    <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden />
                    Hủy yêu cầu
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1 px-5 pt-3">
            {hasSourceName ? (
              <p className="mt-1 text-sm font-semibold">
                <span className="text-[#2197C0]">
                  <span className={dotClass} aria-hidden />
                  {sourceNameLabel}:{' '}
                </span>
                <span className="text-slate-900">{sourceName || '—'}</span>
              </p>
            ) : null}
            {hasSourceDescription ? (
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                {sourceDescription}
              </p>
            ) : null}
          </div>
          <div
            className={`mt-4 grid gap-x-6 gap-y-3 border-t border-slate-100 px-5 py-4 ${
              hasSourceDuration || hasStartAt || hasEndAt
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-6'
                : 'grid-cols-1 sm:grid-cols-3'
            }`}
          >
            <div className="min-w-0">
              <p className={metaLabelClass}>
                <span className={dotClass} aria-hidden />
                Loại yêu cầu
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">{requestTypeLabel}</p>
            </div>
            <div className="min-w-0">
              <p className={metaLabelClass}>
                <span className={dotClass} aria-hidden />
                Ngày gửi
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">
                {request.createdAt
                  ? dayjs(request.createdAt).format('DD/MM/YYYY')
                  : dayjs(request.startDate).format('DD/MM/YYYY')}
              </p>
            </div>
            <div className="min-w-0">
              <p className={metaLabelClass}>
                <span className={dotClass} aria-hidden />
                Số lượng buổi
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">{sessionCount} buổi</p>
            </div>
            {hasSourceDuration || hasStartAt || hasEndAt ? (
              <>
                <div className="min-w-0">
                  <p className={metaLabelClass}>
                    <span className={dotClass} aria-hidden />
                    Thời lượng
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">{sourceDuration || '—'}</p>
                </div>
                <div className="min-w-0">
                  <p className={metaLabelClass}>
                    <span className={dotClass} aria-hidden />
                    Ngày bắt đầu
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {requestDateRange.startAt ? dayjs(requestDateRange.startAt).format('DD/MM/YYYY HH:mm') : '—'}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className={metaLabelClass}>
                    <span className={dotClass} aria-hidden />
                    Ngày kết thúc
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {requestDateRange.endAt ? dayjs(requestDateRange.endAt).format('DD/MM/YYYY HH:mm') : '—'}
                  </p>
                </div>
              </>
            ) : null}
          </div>
        </div>

      {/* MAIN CONTENT */}
      {viewMode === 'assignment' ? (
        <div className="space-y-4 text-black">
          <div className="mb-2 sticky top-4 z-10 flex flex-wrap justify-between items-center gap-4 bg-white/95 backdrop-blur p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-slate-800 min-w-0">
              <Badge className="shrink-0 bg-sky-100 text-sky-800 border-0 text-[11px]">
                Duyệt phân công
              </Badge>
              <span className="text-gray-800">
                Xem các buổi thuộc yêu cầu này và duyệt phân công cho từng buổi sau khi Team
                Leader đã gán đủ nhân sự.
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Danh sách các buổi</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{sessions.length} buổi trong yêu cầu này</p>
            </div>
            {sessions.length === 0 ? (
              <p className="text-xs text-gray-500">
                Yêu cầu này chưa có buổi để phân công. Vui lòng kiểm tra lại danh sách buổi.
              </p>
            ) : (
              <div className="space-y-1">
                {sessions.map((session) => {
                  const rows = assignmentsBySessionId[session.sessionId] ?? [];
                  const pendingCount = rows.filter((r) => canManagerReviewAssignmentRow(r)).length;
                  const fullyAssigned = isSessionFullyAssigned(session);
                  const sessionPending = getSessionStatusCode(session.status) === SESSION_STATUS.PENDING;
                  const sessionTitle = getSessionDisplayTitle(session);
                  const location = (session as RequestSessionSummary & { location?: string }).location || '—';
                  const sessionStatusInfo = getSessionStatusInfo(session.status);
                  const sessionDate = dayjs(session.startAt).format('DD/MM/YYYY');
                  const isHighlightDate = sessionDate === '16/04/2026';
                  return (
                    <div
                      key={session.sessionId}
                      role="button"
                      tabIndex={0}
                      onClick={() => setRightPanel({ mode: isPendingRequest ? 'detail' : 'assignment', session })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setRightPanel({ mode: isPendingRequest ? 'detail' : 'assignment', session });
                        }
                      }}
                      className={`w-full border-t border-b px-4 py-3 transition cursor-pointer text-left focus:outline-none ${
                        pendingCount > 0
                          ? 'border-orange-200 bg-orange-50/30 hover:bg-orange-50/50'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span
                            className={`text-xs font-semibold tabular-nums ${
                              pendingCount > 0 ? 'text-orange-900' : 'text-[#2197C0]'
                            }`}
                          >
                            <span className={isHighlightDate ? 'text-emerald-600 font-semibold' : 'text-slate-600 font-medium'}>
                              {sessionDate}
                            </span>
                            <span className="text-slate-300 font-normal mx-1">·</span>
                            {dayjs(session.startAt).format('HH:mm')} - {dayjs(session.endAt).format('HH:mm')}
                          </span>
                          <span className="text-slate-300">·</span>
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-xs text-slate-500">Địa chỉ:</span>
                          <span className="truncate text-xs text-slate-600">{location}</span>
                        </div>
                        <span
                          className={`inline-flex items-center gap-0.5 text-xs font-semibold select-none ${
                            pendingCount > 0 ? 'text-orange-900' : 'text-sky-700'
                          }`}
                          aria-hidden
                        >
                          Chi tiết
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
                        {sessionTitle}
                      </p>
                      <div className="mt-1 flex items-center justify-between gap-1.5 text-xs flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="text-[10px] font-medium text-slate-500">Trạng thái:</span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${sessionStatusInfo.className}`}>
                            {sessionStatusInfo.label}
                          </span>
                          {pendingCount > 0 ? (
                            <Badge className="bg-orange-100 text-orange-950 border-orange-300 text-[10px] font-semibold">
                              {pendingCount} phân công chờ duyệt
                            </Badge>
                          ) : null}
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-600">{session.teachersRequired ?? 1} GV · {session.tasRequired ?? 1} Sinh viên</span>
                        </div>
                        {sessionPending && !isApprovalView && requestStatusCode !== REQUEST_STATUS.PENDING && !fullyAssigned ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border bg-amber-50 text-amber-800 border-amber-200 shrink-0">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            Chưa chọn đủ giảng viên hoặc sinh viên
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4 text-black">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 pl-2">
            <TabsList className="bg-transparent border-0 shadow-none p-0 mb-0 min-w-0">
              <TabsTrigger value="overview">Tổng quan</TabsTrigger>
              <TabsTrigger value="attachments">Tệp đính kèm</TabsTrigger>
            </TabsList>
            {isTeamAssignView || isApprovalView ? null : (
              <div className="flex flex-wrap items-center justify-end gap-3">
                {isPendingRequest ? (
                  <>
                    <Button
                      type="button"
                      className="h-8 rounded-md px-3 bg-red-600 hover:bg-rose-700 text-white text-xs"
                      onClick={handleRejectClick}
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Từ chối yêu cầu
                    </Button>
                    <Button
                      type="button"
                      className="h-8 rounded-md px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                      onClick={handleApproveClick}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Duyệt yêu cầu
                    </Button>
                  </>
                ) : null}
                {isApprovedRequest ? (
                  <button
                    type="button"
                    onClick={handleCancelRequestClick}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#7f1d1d] hover:text-[#991b1b] hover:underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300/60 focus-visible:ring-offset-1 rounded-sm py-0.5"
                  >
                    <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden />
                    Hủy yêu cầu
                  </button>
                ) : null}
              </div>
            )}
          </div>

          <TabsContent value="overview" className="space-y-4 mb-0">
          {/* WARNING BOX + PROGRESS + ACTIONS
              - Ẩn hoàn toàn ở /manager/requests/:id (chỉ xem thông tin)
              - Approval: render action ở cuối (bên dưới) */}
          {!isDefaultRequestView || isPendingRequest ? (
            <div className="space-y-3">
              {!isApprovalView && !isPendingRequest && remainingUnassignedSessions > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="text-amber-600 shrink-0 mt-0.5">⚠</span>
                    <div>
                      <p className="text-sm text-amber-800">
                        Vui lòng gắn nhóm cho tất cả các buổi để có thể duyệt yêu cầu. Hiện tại còn{' '}
                        {remainingUnassignedSessions} buổi chưa được gắn nhóm phụ trách.
                      </p>
                      <button
                        type="button"
                        onClick={scrollToNearestUnassignedSession}
                        className="text-xs font-medium text-amber-700 mt-1 underline underline-offset-2 hover:text-amber-800"
                      >
                        Xem buổi chưa gắn
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {!isApprovalView && !isTeamAssignView && !isPendingRequest ? (
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700">Tiến độ phân nhóm</span>
                    <span className="text-sm font-semibold text-slate-800 tabular-nums">
                      {assignedCount}/{sessions.length || 0} buổi
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-sky-500 transition-all duration-300"
                      style={{
                        width: sessions.length === 0 ? '0%' : `${(assignedCount / sessions.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {/* DANH SÁCH BUỔI HỌC — kích thước gọn, cân với header request */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Danh sách các buổi</h3>
              {!isApprovalView && !isPendingRequest && canReserveEquipment ? (
                <Button
                  onClick={() => hasUnreservedEquipmentSlot && setRightPanel({ mode: 'equipment' })}
                  disabled={!hasUnreservedEquipmentSlot}
                  className="gap-1.5 bg-[#2197C0] hover:bg-[#208AAE] text-white disabled:opacity-50 text-[11px] h-8 rounded-lg px-3"
                >
                  <Plus size={14} />
                  Đơn yêu cầu thiết bị
                </Button>
              ) : null}
            </div>
            {sessions.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">Yêu cầu này chưa có danh sách buổi chi tiết.</p>
            ) : (
              <div className="space-y-1">
                {sessions.map((session) => {
                  const teamIds = uiAssignedTeamIdsBySessionId[session.sessionId] ?? [];
                  const teamCount = teamIds.length;
                  const fullyAssigned = isSessionFullyAssigned(session);
                  const sessionPending = getSessionStatusCode(session.status) === SESSION_STATUS.PENDING;
                  const topic = session.subjectSession ?? session.eventSession;
                  const sessionTitle = getSessionDisplayTitle(session);
                  const sessionSkills = session.sessionSkills ?? [];
                  const location = (session as RequestSessionSummary & { location?: string }).location || '—';
                  const sessionStatusInfo = getSessionStatusInfo(session.status);
                  const sessionDate = dayjs(session.startAt).format('DD/MM/YYYY');
                  const isHighlightDate = sessionDate === '16/04/2026';
                  return (
                    <div
                      key={session.sessionId}
                      role="button"
                      tabIndex={0}
                      data-request-session-id={session.sessionId}
                      data-request-session-unassigned={String(sessionPending && !fullyAssigned)}
                      onClick={() => setRightPanel({ mode: isTeamAssignView && !isPendingRequest ? 'team' : 'detail', session })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setRightPanel({ mode: isTeamAssignView && !isPendingRequest ? 'team' : 'detail', session });
                        }
                      }}
                      className={`w-full border-t border-b border-slate-200 bg-white px-4 py-3 hover:bg-slate-50 transition cursor-pointer focus:outline-none ${
                        highlightSessionId === session.sessionId ? 'border-amber-200 bg-amber-50/30' : ''
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="text-xs text-[#2197C0] font-semibold tabular-nums">
                            <span className={isHighlightDate ? 'text-emerald-600 font-semibold' : 'text-slate-600 font-medium'}>
                              {sessionDate}
                            </span>
                            <span className="text-slate-300 font-normal mx-1">·</span>
                            {dayjs(session.startAt).format('HH:mm')} - {dayjs(session.endAt).format('HH:mm')}
                          </span>
                          <span className="text-slate-300">·</span>
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-xs text-slate-500">Địa chỉ:</span>
                          <span className="truncate text-xs text-slate-600">{location}</span>
                        </div>
                        <span
                          className="inline-flex items-center gap-0.5 text-xs font-semibold text-sky-700 select-none"
                          aria-hidden
                        >
                          Chi tiết
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-900 leading-snug line-clamp-2">{sessionTitle}</p>
                      {topic?.description?.trim() ? (
                        <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{topic.description.trim()}</p>
                      ) : null}
                      {sessionSkills.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {sessionSkills.slice(0, 3).map((name) => (
                            <Badge
                              key={`${session.sessionId}-${name}`}
                              className="border-0 bg-slate-100 text-[10px] font-medium text-slate-700"
                            >
                              {name}
                            </Badge>
                          ))}
                          {sessionSkills.length > 3 ? (
                            <Badge className="border-0 bg-slate-100 text-[10px] font-medium text-slate-700">
                              +{sessionSkills.length - 3}
                            </Badge>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="mt-1 flex items-center justify-between gap-1.5 text-xs flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="text-[10px] font-medium text-slate-500">Trạng thái:</span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${sessionStatusInfo.className}`}>
                            {sessionStatusInfo.label}
                          </span>
                          {fullyAssigned && teamCount > 0 && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-700 font-medium">{teamCount} nhóm</span>
                            </>
                          )}
                        </div>
                        {sessionPending && !isApprovalView && requestStatusCode !== REQUEST_STATUS.PENDING && !fullyAssigned ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border bg-amber-50 text-amber-800 border-amber-200 shrink-0">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            Chưa chọn đủ giảng viên hoặc sinh viên
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {isTeamAssignView && !isPendingRequest ? (
            <div className="flex justify-end gap-3 pt-1">
              <Button
                type="button"
                className="rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={sessions.length === 0}
                onClick={handleSaveTeamAssignments}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Lưu gán nhóm
              </Button>
            </div>
          ) : null}

          {isApprovalView ? (
            <div className="flex justify-end gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                className="h-8 rounded-md px-3 border-rose-200 text-rose-700 hover:bg-rose-50 bg-white text-xs"
                disabled={String(request.status ?? '').toLowerCase() !== 'pending'}
                onClick={handleRejectClick}
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Từ chối yêu cầu
              </Button>
              <Button
                type="button"
                className="h-8 rounded-md px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={String(request.status ?? '').toLowerCase() !== 'pending'}
                onClick={handleApproveClick}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Duyệt yêu cầu
              </Button>
            </div>
          ) : null}
          </TabsContent>

         

          <TabsContent value="attachments">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-xs">
              {request.attachments?.length ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Tệp đính kèm yêu cầu</p>
                  <div className="space-y-1">
                    {request.attachments.map((att, idx) => (
                      <button
                        key={att.attachmentId ?? att.fileUrl ?? idx}
                        type="button"
                        className="group w-full text-left rounded-xl border border-slate-200 bg-slate-50/40 px-3 py-2.5 hover:bg-slate-50/70 transition flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-sky-200/70 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        onClick={() => openAttachmentPreview(att.fileName, att.fileUrl)}
                        disabled={!att.fileUrl}
                        aria-label={`Mở tệp đính kèm ${att.fileName || `#${idx + 1}`}`}
                      >
                        {(() => {
                          const meta = getAttachmentMeta(att.fileName, att.fileUrl);
                          const fileLabel = att.fileName || `Tệp đính kèm #${idx + 1}`;
                          return (
                            <>
                              <div
                                className={`shrink-0 w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center ${meta.iconClass}`}
                                aria-hidden
                              >
                                <Paperclip className={`w-4 h-4 ${meta.iconClass}`} />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-slate-900 truncate" title={fileLabel}>
                                    {fileLabel}
                                  </span>
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${meta.badgeClass}`}>
                                    {meta.kind === 'file' ? meta.ext ?? 'Tệp' : meta.label}
                                  </span>
                                </div>

                              </div>

                            </>
                          );
                        })()}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500">Chưa có tệp đính kèm cho yêu cầu này.</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR SLIDE-OVER FOR TEAM / EQUIPMENT */}
      {rightPanel && (
        <div className="fixed inset-0 z-40 flex justify-end">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/30"
            onClick={() => setRightPanel(null)}
          />

          {/* Panel: max-w-2xl — đồng bộ TeamLeaderAssignmentsPage */}
          <div className="w-full max-w-2xl h-full bg-white text-black shadow-2xl flex flex-col overflow-hidden border-l">
            {/* Header */}
            <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
              <div>
                {rightPanel.mode !== 'detail' && (
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                    {rightPanel.mode === 'team'
                      ? 'Đang gán nhóm'
                      : rightPanel.mode === 'assignment'
                        ? 'Duyệt phân công'
                        : 'Đơn yêu cầu thiết bị'}
                  </p>
                )}
                {rightPanel.mode === 'equipment' ? (
                  <>
                    <h2 className="text-base font-semibold text-black">Chọn buổi & thiết bị</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Yêu cầu thiết bị cho một hoặc nhiều buổi
                    </p>
                  </>
                ) : rightPanel.mode === 'detail' && resolvedDetailSession ? (
                  <>
                    <h2 className="text-lg font-bold text-slate-900 leading-snug">
                      {getSessionDisplayTitle(resolvedDetailSession)}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 tabular-nums">
                      <span>Buổi {resolvedDetailSession.sessionNo}</span>
                      <span className="text-slate-300">{' · '}</span>
                      <span className="font-semibold text-[#2197C0]">
                        {dayjs(resolvedDetailSession.startAt).format('HH:mm')} – {dayjs(resolvedDetailSession.endAt).format('HH:mm')}
                      </span>
                      <span className="text-slate-300">{' · '}</span>
                      <span className="font-semibold text-[#2197C0]">{dayjs(resolvedDetailSession.startAt).format('DD/MM/YYYY')}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {(() => {
                        const info = getSessionStatusInfo((resolvedDetailSession as any).status);
                        return (
                          <>
                            <span className="text-[11px] font-medium text-slate-500">Trạng thái:</span>
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${info.className}`}>
                              {info.label}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </>
                ) : rightPanel.mode === 'assignment' && resolvedPanelSession ? (
                  <>
                    <h2 className="text-lg font-bold text-slate-900 leading-snug">
                      {getSessionDisplayTitle(resolvedPanelSession)}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 tabular-nums">
                      <span>Buổi {resolvedPanelSession.sessionNo}</span>
                      <span className="text-slate-300">{' · '}</span>
                      <span className="font-semibold text-[#2197C0]">
                        {dayjs(resolvedPanelSession.startAt).format('HH:mm')} – {dayjs(resolvedPanelSession.endAt).format('HH:mm')}
                      </span>
                      <span className="text-slate-300">{' · '}</span>
                      <span className="font-semibold text-[#2197C0]">{dayjs(resolvedPanelSession.startAt).format('DD/MM/YYYY')}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {(() => {
                        const info = getSessionStatusInfo((resolvedPanelSession as any).status);
                        return (
                          <>
                            <span className="text-[11px] font-medium text-slate-500">Trạng thái:</span>
                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${info.className}`}>
                              {info.label}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-base font-semibold text-black">
                      Buổi {rightPanel.session.sessionNo}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      {dayjs(rightPanel.session.startAt).format('DD/MM/YYYY HH:mm')} -{' '}
                      {dayjs(rightPanel.session.endAt).format('DD/MM/YYYY HH:mm')}
                    </p>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setRightPanel(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-0">
              {rightPanel.mode === 'detail' && request && (
                <>
                  {/* Thông tin buổi luôn ở trên cùng */}
                  <RequestSessionDetailPanel
                    // Tránh trường hợp rightPanel.session bị "chụp" lúc chưa có reservationId.
                    // Luôn ưu tiên session mới nhất từ state `sessions`.
                    session={
                      sessions.find((s) => s.sessionId === rightPanel.session.sessionId) ?? rightPanel.session
                    }
                    requestId={Number(request.requestId)}
                    requestCode={request.requestCode ?? ''}
                    assignedTeamIds={uiAssignedTeamIdsBySessionId[rightPanel.session.sessionId] ?? []}
                    showReservedEquipment={false}
                    sectionMode="info"
                    showTeamSummary={isApprovalView || isPendingRequest}
                  />
                  <div className="mt-6">
                    {!isApprovalView && !isPendingRequest ? (
                      <RequestDetailTeamPanel
                        session={rightPanel.session}
                        currentTeamQuantities={uiTeamQuantitiesBySessionId[rightPanel.session.sessionId]}
                        currentAssignedTeamIds={uiAssignedTeamIdsBySessionId[rightPanel.session.sessionId] ?? []}
                        separateTeacherSelection={isApprovedRequest}
                        onAssignSession={handleAssignSession}
                      />
                    ) : null}
                  </div>
                  {!isApprovalView && !isPendingRequest ? (
                    <div className="mt-6">
                      <RequestSessionDetailPanel
                        session={
                          sessions.find((s) => s.sessionId === rightPanel.session.sessionId) ?? rightPanel.session
                        }
                        requestId={Number(request.requestId)}
                        requestCode={request.requestCode ?? ''}
                        sectionMode="equipment"
                        canEditReservation={!isPendingRequest}
                        onReservationUpdated={isPendingRequest ? undefined : handleEquipmentSuccess}
                      />
                    </div>
                  ) : null}
                  {resolvedDetailSession && !isApprovalView && !isDefaultRequestView ? (
                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <div className="relative inline-flex group">
                        <button
                          type="button"
                          onClick={() => {
                            if (!canCancelDetailSession) {
                              message.info('Không đủ điều kiện hủy buổi.');
                              return;
                            }
                            openCancelSessionDialog();
                          }}
                          className={`inline-flex items-center gap-1 text-[11px] font-medium rounded-sm py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300/60 focus-visible:ring-offset-1 ${
                            canCancelDetailSession
                              ? 'text-[#7f1d1d] hover:text-[#991b1b] hover:underline underline-offset-2'
                              : 'text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden />
                          Hủy buổi
                        </button>
                        {!canCancelDetailSession ? (
                          <span className="pointer-events-none absolute left-0 bottom-full z-50 mb-1 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white shadow-md group-hover:block">
                            Không đủ điều kiện hủy
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
              {rightPanel.mode === 'team' && !isPendingRequest && (
                <RequestDetailTeamPanel
                  session={rightPanel.session}
                  currentTeamQuantities={uiTeamQuantitiesBySessionId[rightPanel.session.sessionId]}
                  currentAssignedTeamIds={uiAssignedTeamIdsBySessionId[rightPanel.session.sessionId] ?? []}
                  separateTeacherSelection={isApprovedRequest}
                  onAssignSession={handleAssignSession}
                />
              )}
              {rightPanel.mode === 'assignment' && !isPendingRequest && (
                <div className="space-y-4">
                  {request ? (
                    <RequestSessionDetailPanel
                      session={sessions.find((s) => s.sessionId === rightPanel.session.sessionId) ?? rightPanel.session}
                      reloadKey={sessionDetailReloadKey}
                      requestId={Number(request.requestId)}
                      requestCode={request.requestCode ?? ''}
                      assignedTeamIds={uiAssignedTeamIdsBySessionId[rightPanel.session.sessionId] ?? []}
                      showReservedEquipment={false}
                      showTeamSummary
                      reviewMode
                      onApproveAssignment={async (assignment) => {
                        await handleApproveSingleAssignment(
                          Number(assignment.AssignmentId ?? 0),
                          rightPanel.session.sessionId
                        );
                      }}
                      onRejectAssignment={(assignment) =>
                        handleOpenRejectAssignment(rightPanel.session.sessionId, {
                          assignmentId: Number(assignment.AssignmentId ?? 0),
                          staffMemberId: Number(assignment.StaffMemberId ?? 0),
                          staffRole: String(assignment.StaffRole ?? '').toUpperCase(),
                          status: String(assignment.Status ?? ''),
                          reason: String(assignment.Reason ?? '').trim() || undefined,
                          fullName: String(assignment.StaffMember?.FullName ?? '').trim() || '—',
                          email: String(assignment.StaffMember?.Email ?? assignment.StaffMember?.User?.Email ?? '').trim(),
                          avatarUrl: String(assignment.StaffMember?.AvatarUrl ?? '').trim(),
                        })
                      }
                      isApprovingAssignment={(assignmentId) => Boolean(approvingAssignmentIds[assignmentId])}
                      sectionMode="info"
                    />
                  ) : null}

                  {/* Legacy assignment list (hidden to avoid duplicate UI)
                    const rows = assignmentsBySessionId[rightPanel.session.sessionId] ?? [];
                    const hasUnfilledSlot = rows.some((r) => !isAssignmentSlotFilled(r));
                    const hasReviewableFilled = rows.some((r) => canManagerReviewAssignmentRow(r));
                    const selectedForSession =
                      selectedAssignmentIdsBySessionId[rightPanel.session.sessionId] ?? [];
                    const hasSelectedReviewable = selectedForSession.some((id) => {
                      const row = rows.find((r) => r.assignmentId === id);
                      return row != null && canManagerReviewAssignmentRow(row);
                    });
                    const approveAllDisabled =
                      approvingSessionId === rightPanel.session.sessionId ||
                      !rows.length ||
                      !hasReviewableFilled ||
                      !hasSelectedReviewable;

                    return (
                  <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-4 py-2.5 bg-slate-50/70 flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm">Danh sách phân công</h3>
                        {hasUnfilledSlot && rows.length > 0 ? (
                          <p className="text-[11px] text-red-600 mt-0.5">
                            Chưa được phân công đủ
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                        {hasReviewableFilled ? (
                          <>
                            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-600">
                              <input
                                type="checkbox"
                                ref={(el) => {
                                  if (!el) return;
                                  const reviewableIds = rows
                                    .filter((r) => canManagerReviewAssignmentRow(r))
                                    .map((r) => r.assignmentId)
                                    .filter((id) => id > 0);
                                  const selected =
                                    selectedAssignmentIdsBySessionId[rightPanel.session.sessionId] ?? [];
                                  const allOn =
                                    reviewableIds.length > 0 &&
                                    reviewableIds.every((id) => selected.includes(id));
                                  const someOn = reviewableIds.some((id) => selected.includes(id));
                                  el.indeterminate = someOn && !allOn;
                                }}
                                checked={(() => {
                                  const reviewableIds = rows
                                    .filter((r) => canManagerReviewAssignmentRow(r))
                                    .map((r) => r.assignmentId)
                                    .filter((id) => id > 0);
                                  const selected =
                                    selectedAssignmentIdsBySessionId[rightPanel.session.sessionId] ?? [];
                                  return (
                                    reviewableIds.length > 0 &&
                                    reviewableIds.every((id) => selected.includes(id))
                                  );
                                })()}
                                disabled={approvingSessionId === rightPanel.session.sessionId}
                                onChange={() =>
                                  handleToggleSelectAllReviewableAssignments(rightPanel.session.sessionId)
                                }
                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                              />
                              <span>Chọn tất cả chờ duyệt</span>
                            </label>
                            <Button
                              type="button"
                              size="sm"
                              title={
                                !hasSelectedReviewable
                                  ? 'Vui lòng chọn ít nhất một phân công đang chờ duyệt'
                                  : hasUnfilledSlot
                                    ? 'Chỉ gửi duyệt các phân công đã chọn (đã có nhân sự, chờ duyệt)'
                                    : undefined
                              }
                              className="rounded-full gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-3 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                              disabled={approveAllDisabled}
                              onClick={() => void handleApproveSelectedAssignments(rightPanel.session.sessionId)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {approvingSessionId === rightPanel.session.sessionId
                                ? 'Đang duyệt...'
                                : 'Duyệt phân công'}
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="px-4 py-3 space-y-4 text-sm">
                      {!rows.length ? (
                            <p className="text-xs text-gray-500">
                              Chưa có phân công cho buổi
                            </p>
                      ) : (() => {
                        const selectedIds =
                          selectedAssignmentIdsBySessionId[rightPanel.session.sessionId] ?? [];
                        const teacherRows = rows.filter(
                          (row) => row.staffRole === 'TE' || row.staffRole === 'TEACHER'
                        );
                        const taRows = rows.filter((row) => row.staffRole === 'TA');

                        const renderAssignmentRow = (row: (typeof rows)[number]) => {
                          const checked = selectedIds.includes(row.assignmentId);
                          const filled = isAssignmentSlotFilled(row);
                          const isApproved = isAssignmentApproved(row);
                          const isRejected = isAssignmentRejected(row);
                          const isCancelled = isAssignmentCancelled(row);
                          const cancelReason = (row.reason ?? '').trim();
                          const canReview = canManagerReviewAssignmentRow(row);
                          const isTeacherRole =
                            row.staffRole === 'TE' || row.staffRole === 'TEACHER';
                          const assignmentStatusUi = getAssignmentStatusInfo(row.status);
                          const rejectedReasonRaw = (row.reason ?? '').trim();
                          const rejectedReasonLines =
                            rejectedReasonRaw.length > 0
                              ? rejectedReasonRaw.split('\n').filter((line) => line.trim().length > 0)
                              : [];
                          if (isCancelled) {
                            return (
                              <div
                                key={row.assignmentId}
                                className="flex flex-col gap-2.5 border-l-[3px] border-l-red-500 bg-red-50/90 px-3 py-3"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex min-w-0 items-center gap-3 opacity-90 pointer-events-none">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-red-100 text-xs font-semibold text-red-800">
                                      {row.avatarUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={row.avatarUrl}
                                          alt={row.fullName}
                                          className="h-full w-full object-cover"
                                          onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).src = '/img/ava.png';
                                          }}
                                        />
                                      ) : (
                                        (filled ? row.fullName : '?')[0]
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-semibold text-slate-900">
                                        {filled ? row.fullName || '—' : 'Chưa có nhân sự'}
                                      </p>
                                      <p className="truncate text-xs text-slate-500">
                                        {filled ? row.email || '—' : 'Phân công trống — chờ Trưởng nhóm xử lý'}
                                      </p>
                                    </div>
                                  </div>
                                  <span
                                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold shrink-0 ${assignmentStatusUi.className}`}
                                  >
                                    {assignmentStatusUi.label}
                                  </span>
                                </div>
                                <div className="rounded-lg border border-red-200/90 bg-white/70 px-3 py-2">
                                  <p className="text-xs font-medium text-red-900 mb-1">Lý do:</p>
                                  {cancelReason ? (
                                    <p className="text-xs text-red-950 leading-relaxed whitespace-pre-wrap">
                                      {cancelReason}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-red-700/80 italic">Chưa có lý do ghi nhận.</p>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          const accent = getAssignmentStaffRoleAccent(isTeacherRole);
                          const rowStripeClass = (() => {
                            if (!filled) {
                              return isTeacherRole
                                ? 'border-l-[3px] border-l-violet-400 bg-violet-50/65'
                                : 'border-l-[3px] border-l-yellow-400 bg-yellow-50/65';
                            }
                            if (isRejected) return 'border-l-[3px] border-l-rose-500 bg-rose-50/30';
                            if (canReview) {
                              if (isTeacherRole) {
                                return checked
                                  ? 'border-l-[3px] border-l-violet-600 bg-violet-100/95'
                                  : 'border-l-[3px] border-l-violet-400 bg-violet-50/70';
                              }
                              return checked
                                ? 'border-l-[3px] border-l-amber-500 bg-amber-50/90'
                                : 'border-l-[3px] border-l-yellow-400 bg-yellow-50/60';
                            }
                            return accent.stripe;
                          })();
                          const filledAvatarClass = (() => {
                            if (!filled) return '';
                            if (canReview) {
                              if (isTeacherRole) {
                                return checked
                                  ? 'bg-violet-200/90 text-violet-950'
                                  : 'bg-violet-100 text-violet-800';
                              }
                              return checked
                                ? 'bg-amber-100 text-amber-950'
                                : 'bg-yellow-100 text-yellow-900';
                            }
                            return accent.avatar;
                          })();
                          return (
                            <div key={row.assignmentId}>
                              <div
                                className={`flex min-h-[4.25rem] items-center justify-between gap-3 px-3 py-2.5 transition-[background-color,border-color] ${rowStripeClass}`}
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                  <div
                                    className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold ${
                                      filled
                                        ? filledAvatarClass
                                        : isTeacherRole
                                          ? 'bg-violet-100 text-violet-700'
                                          : 'bg-yellow-100 text-yellow-800'
                                    }`}
                                  >
                                    {filled ? (
                                      row.avatarUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={row.avatarUrl}
                                          alt={row.fullName}
                                          className="h-full w-full object-cover"
                                          onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).src = '/img/ava.png';
                                          }}
                                        />
                                      ) : (
                                        (row.fullName || '—')[0]
                                      )
                                    ) : (
                                      <span className="text-base font-semibold leading-none">?</span>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-slate-900">
                                      {filled ? row.fullName || '—' : 'Chưa có nhân sự'}
                                    </p>
                                    <p className="truncate text-xs text-slate-500">
                                      {filled ? row.email || '—' : 'Phân công trống — chờ Trưởng nhóm xử lý'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                                  {isApproved && (
                                    <span
                                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${assignmentStatusUi.className}`}
                                    >
                                      {assignmentStatusUi.label}
                                    </span>
                                  )}
                                  {isRejected && (
                                    <span
                                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${assignmentStatusUi.className}`}
                                    >
                                      {assignmentStatusUi.label}
                                    </span>
                                  )}
                                  {canReview && (
                                    <>
                                      <button
                                        type="button"
                                        className="text-xs font-medium text-red-600 hover:text-red-700 underline-offset-2 hover:underline bg-transparent border-0 p-0 shadow-none cursor-pointer"
                                        onClick={() =>
                                          handleOpenRejectAssignment(rightPanel.session.sessionId, row)
                                        }
                                      >
                                        Từ chối
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleToggleAssignmentSelection(
                                            rightPanel.session.sessionId,
                                            row.assignmentId
                                          )
                                        }
                                        className={`text-xs font-medium bg-transparent border-0 p-0 shadow-none cursor-pointer underline-offset-2 ${
                                          checked
                                            ? 'text-emerald-600 hover:text-emerald-700'
                                            : 'text-slate-600 hover:text-slate-900 hover:underline'
                                        }`}
                                      >
                                        {checked ? 'Đã chọn' : 'Chọn duyệt'}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                              {isRejected ? (
                                <div className="border-t border-slate-200/45 bg-rose-50/25 px-3 py-2.5">
                                  <div className="rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2.5">
                                    <p className="text-xs font-medium text-rose-900 mb-1.5">Lý do từ chối</p>
                                    {rejectedReasonLines.length > 0 ? (
                                      <ul className="space-y-1 text-xs text-rose-950 leading-relaxed list-none pl-0">
                                        {rejectedReasonLines.map((line, idx) => (
                                          <li key={idx} className="pl-3 border-l-2 border-rose-300">
                                            {line}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-xs text-rose-700/85 italic">
                                        Chưa có lý do ghi nhận từ quản lý.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        };

                        return (
                          <div className="space-y-4">
                            <div>
                              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Giảng viên
                              </p>
                              <div className="divide-y divide-slate-200/45 overflow-hidden rounded-xl bg-violet-50/40">
                                {teacherRows.length ? (
                                  teacherRows.map(renderAssignmentRow)
                                ) : (
                                  <p className="px-3 py-2 text-xs text-gray-500">—</p>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Sinh viên
                              </p>
                              <div className="divide-y divide-slate-200/45 overflow-hidden rounded-xl bg-yellow-50/45">
                                {taRows.length ? (
                                  taRows.map(renderAssignmentRow)
                                ) : (
                                  <p className="px-3 py-2 text-xs text-gray-500">—</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                    );
                  */}

                  {request && !isPendingRequest && (
                    <RequestSessionDetailPanel
                      session={
                        sessions.find((s) => s.sessionId === rightPanel.session.sessionId) ?? rightPanel.session
                      }
                      requestId={Number(request.requestId)}
                      requestCode={request.requestCode ?? ''}
                      sectionMode="equipment"
                      canEditReservation={!isPendingRequest}
                      onReservationUpdated={isPendingRequest ? undefined : handleEquipmentSuccess}
                    />
                  )}

                  {resolvedPanelSession ? (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="relative inline-flex group">
                        <button
                          type="button"
                          onClick={() => {
                            if (!canCancelPanelSession) {
                              message.info('Không đủ điều kiện hủy buổi.');
                              return;
                            }
                            openCancelSessionDialog();
                          }}
                          className={`inline-flex items-center gap-1 text-[11px] font-medium rounded-sm py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300/60 focus-visible:ring-offset-1 ${
                            canCancelPanelSession
                              ? 'text-[#7f1d1d] hover:text-[#991b1b] hover:underline underline-offset-2'
                              : 'text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden />
                          Hủy buổi
                        </button>
                        {!canCancelPanelSession ? (
                          <span className="pointer-events-none absolute left-0 bottom-full z-50 mb-1 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white shadow-md group-hover:block">
                            Không đủ điều kiện hủy
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
              {rightPanel.mode === 'equipment' && (
                <RequestDetailEquipmentPanel
                  sessions={sessionsEligibleForEquipmentReserve
                    .filter((s) => !s.equipmentReserved)
                    .map((s) => ({
                      sessionId: s.sessionId,
                      sessionNo: s.sessionNo,
                      startAt: s.startAt,
                      endAt: s.endAt,
                    }))}
                  createdByMemberId={createdByMemberId}
                  onClose={() => setRightPanel(null)}
                  onSuccess={handleEquipmentSuccess}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Popup preview file đính kèm */}
      <Dialog
        open={attachmentPreviewOpen}
        onClose={() => setAttachmentPreviewOpen(false)}
        title={attachmentPreview?.fileName ?? 'Tệp đính kèm'}
        description="Xem nội dung tệp đính kèm"
        className="max-w-4xl border-0 shadow-2xl"
      >
        {attachmentPreview?.fileUrl ? (
          (() => {
            const url = attachmentPreview.fileUrl;
            const lower = url.toLowerCase();
            const isImage = /\.(png|jpg|jpeg|gif|webp)$/.test(lower);
            const isPdf = /\.pdf(\?|#|$)/.test(lower);

            if (isImage) {
              return (
                <div className="space-y-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={attachmentPreview.fileName}
                    className="w-full max-h-[70vh] object-contain rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              );
            }

            if (isPdf) {
              return (
                <div className="space-y-3">
                  <iframe
                    src={url}
                    title={attachmentPreview.fileName}
                    className="w-full h-[70vh] rounded-xl border border-slate-200 bg-white"
                  />
                </div>
              );
            }

            return (
              <div className="space-y-2">
                <p className="text-xs text-slate-600">
                  Trình duyệt không hỗ trợ preview trực tiếp cho loại tệp này.
                </p>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs inline-flex items-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700 px-3 py-2 hover:bg-sky-100"
                >
                  Mở tệp
                </a>
              </div>
            );
          })()
        ) : (
          <div className="text-xs text-slate-500">Không có nội dung để hiển thị.</div>
        )}
      </Dialog>

      {/* Hủy buổi (PUT /sessions/cancel) — cần lý do */}
      <Dialog
        open={cancelSessionOpen}
        onClose={() => !cancelSessionLoading && setCancelSessionOpen(false)}
        title="Hủy buổi"
        description="Nhập lý do hủy. Thao tác không thể hoàn tác."
        className="max-w-md border-0 shadow-2xl"
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="cancel-session-reason" className="text-black">
              Lý do <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="cancel-session-reason"
              rows={4}
              value={cancelSessionReason}
              onChange={(e) => setCancelSessionReason(e.target.value)}
              placeholder="Ví dụ: Khách hàng đổi lịch, không còn nhu cầu..."
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg border-gray-200"
              disabled={cancelSessionLoading}
              onClick={() => setCancelSessionOpen(false)}
            >
              Đóng
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-lg border-red-200 text-red-600 hover:bg-red-50"
              disabled={cancelSessionLoading}
              onClick={handleConfirmCancelSession}
            >
              {cancelSessionLoading ? 'Đang xử lý...' : 'Xác nhận hủy'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Dialog từ chối assignment */}
      <Dialog
        open={rejectAssignmentState.open}
        onClose={() => {
          setRejectAssignmentState({ open: false, assignmentId: null, sessionId: null, displayName: '' });
          setRejectAssignmentReason('');
        }}
        title="Từ chối phân công"
        description={
          rejectAssignmentState.displayName
            ? `Phân công của: ${rejectAssignmentState.displayName}`
            : undefined
        }
      >
        <div className="space-y-2">
          <Label htmlFor="reject-assignment-reason" className="text-black text-xs">
            Lý do từ chối
          </Label>
          <textarea
            id="reject-assignment-reason"
            className="w-full min-h-[72px] rounded-lg border border-slate-200 px-3 py-2 text-xs text-black outline-none focus:ring-1 focus:ring-rose-400"
            placeholder="Nhập lý do từ chối phân công này..."
            value={rejectAssignmentReason}
            onChange={(e) => setRejectAssignmentReason(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={() => {
              setRejectAssignmentState({ open: false, assignmentId: null, sessionId: null, displayName: '' });
              setRejectAssignmentReason('');
            }}
          >
            Hủy
          </Button>
          <Button
            type="button"
            className="rounded-lg bg-red-600 text-white text-xs px-4 hover:bg-red-700 focus-visible:ring-red-600/40"
            onClick={async () => {
              await handleConfirmRejectAssignment();
              setSessionDetailReloadKey((k) => k + 1);
            }}
          >
            Xác nhận từ chối
          </Button>
        </div>
      </Dialog>

      {/* Duyệt yêu cầu — form gọn, cùng tone với action bar */}
      <Dialog
        open={approveOpen}
        onClose={() => !actionLoading && setApproveOpen(false)}
        title="Xác nhận duyệt yêu cầu"
        description="Yêu cầu sẽ chuyển sang trạng thái đã duyệt."
        titleClassName="text-xl sm:text-2xl"
        descriptionClassName="text-sm sm:text-base text-slate-600"
        className="mx-3 w-full max-w-[min(1200px,calc(100vw-1.5rem))] max-h-[92vh] border-0 shadow-2xl sm:mx-6"
      >
        {request && (
          <div className="space-y-5 text-sm">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
              <h4 className="text-xl font-bold text-slate-900 sm:text-2xl">
                {request.requestName ?? request.requestCode}
              </h4>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-slate-700">
                  <span className="font-medium text-slate-500">{sourceNameLabel}: </span>
                  <span className="font-semibold text-slate-900">{sourceName || '—'}</span>
                </p>
                {hasSourceDescription ? (
                  <p className="text-xs text-slate-500 line-clamp-2">{sourceDescription}</p>
                ) : null}
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-5">
                <div className="flex items-center gap-3">
                  {/* <Hash className="h-5 w-5 shrink-0 text-sky-500" /> */}
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Mã yêu cầu</p>
                    <p className="text-base font-semibold text-slate-900">{request.requestCode}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* <Calendar className="h-5 w-5 shrink-0 text-sky-500" /> */}
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ngày tạo</p>
                    <p className="text-base font-semibold text-slate-900">
                      {request.createdAt
                        ? dayjs(request.createdAt).format('DD/MM/YYYY')
                        : dayjs(request.startDate).format('DD/MM/YYYY')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* <Calendar className="h-5 w-5 shrink-0 text-sky-500" /> */}
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ngày bắt đầu</p>
                    <p className="text-base font-semibold text-slate-900">
                      {requestDateRange.startAt ? dayjs(requestDateRange.startAt).format('DD/MM/YYYY') : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* <Calendar className="h-5 w-5 shrink-0 text-sky-500" /> */}
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Ngày kết thúc</p>
                    <p className="text-base font-semibold text-slate-900">
                      {requestDateRange.endAt ? dayjs(requestDateRange.endAt).format('DD/MM/YYYY') : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* <List className="h-5 w-5 shrink-0 text-sky-500" /> */}
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Số lượng buổi</p>
                    <p className="text-base font-semibold text-slate-900">{sessions.length || 0} buổi</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Loại yêu cầu</p>
                    <p className="text-base font-semibold text-slate-900">{requestTypeLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Thời lượng</p>
                    <p className="text-base font-semibold text-slate-900">{sourceDuration || '—'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-5">
                <span className="text-base font-semibold text-slate-900 sm:text-lg">Thông tin các buổi</span>
                {approvePreviewLoading ? (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                    Đang tải...
                  </span>
                ) : null}
              </div>
              <div className="max-h-[min(65vh,720px)] space-y-3 overflow-y-auto p-3 sm:p-4">
                {approveSessionPreviews.map((preview) => {
                  const rawSession = sessions.find((s) => s.sessionId === preview.sessionId);
                  const sessionTitle = rawSession ? getSessionDisplayTitle(rawSession) : `Buổi ${preview.sessionNo}`;
                  const sessionStatusInfo = rawSession ? getSessionStatusInfo(rawSession.status) : null;
                  return (
                    <div
                      key={preview.sessionId}
                      className="relative rounded-xl border border-gray-200 bg-white p-4 pl-5"
                    >
                      <div className="absolute bottom-0 left-0 top-0 w-1 rounded-l-xl bg-[#2197C0]/45" />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full border border-[#2197C0]/20 bg-[#2197C0]/10 px-3 py-1 text-xs font-semibold text-[#1C7FA1] sm:text-sm">
                            Buổi {preview.sessionNo}
                          </span>
                          {sessionStatusInfo ? (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${sessionStatusInfo.className}`}>
                              {sessionStatusInfo.label}
                            </span>
                          ) : null}
                        </div>
                        <span className="text-xs font-medium text-slate-600 sm:text-sm">
                          {dayjs(preview.startAt).format('DD/MM/YYYY HH:mm')} - {dayjs(preview.endAt).format('HH:mm')}
                        </span>
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-slate-700">
                        <p className="flex items-start gap-2">
                          <span className="font-medium text-slate-600">Tên buổi:</span>
                          <span className="font-semibold text-slate-800">{sessionTitle}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="font-medium text-slate-600">Địa điểm:</span>
                          <span className="font-semibold text-slate-800">{preview.location || '—'}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <List className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="font-medium text-slate-600">Nhu cầu:</span>
                          <span className="font-semibold text-slate-800">
                            {preview.teachersRequired ?? 0} GV / {preview.tasRequired ?? 0} Sinh viên
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })}
                {approvePreviewLoading && approveSessionPreviews.length === 0 ? (
                  <div className="px-1 py-2 text-xs text-slate-500">Đang tải chi tiết các buổi...</div>
                ) : null}
              </div>
            </div>
          </div>
        )}
        <div className="mt-4 flex justify-end gap-3 border-t border-gray-100 pt-5">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-gray-200 px-6 py-2.5 text-base"
            disabled={actionLoading}
            onClick={() => setApproveOpen(false)}
          >
            Hủy
          </Button>
          <Button
            type="button"
            className="rounded-xl gap-2 bg-emerald-600 px-6 py-2.5 text-base text-white shadow-sm hover:bg-emerald-700"
            disabled={actionLoading}
            onClick={handleConfirmApprove}
          >
            {actionLoading ? (
              'Đang xử lý...'
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Duyệt
              </>
            )}
          </Button>
        </div>
      </Dialog>

      {/* Từ chối (PUT /reject) hoặc Hủy yêu cầu (PUT /cancel) — đều cần lý do */}
      <Dialog
        open={rejectOpen}
        onClose={() => !actionLoading && setRejectOpen(false)}
        title={rejectDialogAction === 'cancel' ? 'Hủy yêu cầu' : 'Từ chối yêu cầu'}
        description={
          rejectDialogAction === 'cancel'
            ? 'Nhập lý do hủy. Thao tác không thể hoàn tác.'
            : 'Nhập lý do từ chối. Thao tác không thể hoàn tác.'
        }
        className="max-w-md border-0 shadow-2xl"
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="reject-reason" className="text-black">
              Lý do <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="reject-reason"
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={
                rejectDialogAction === 'cancel'
                  ? 'Ví dụ: Khách hàng không còn nhu cầu...'
                  : 'Ví dụ: Lịch trình trùng với buổi khác...'
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg border-gray-200"
              disabled={actionLoading}
              onClick={() => setRejectOpen(false)}
            >
              Đóng
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-lg border-red-200 text-red-600 hover:bg-red-50"
              disabled={actionLoading}
              onClick={handleConfirmReject}
            >
              {actionLoading
                ? 'Đang xử lý...'
                : rejectDialogAction === 'cancel'
                  ? 'Xác nhận hủy'
                  : 'Từ chối'}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

