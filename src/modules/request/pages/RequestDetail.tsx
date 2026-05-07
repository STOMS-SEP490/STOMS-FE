import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { Plus, X, CheckCircle2, MapPin, AlertCircle, AlertTriangle, Paperclip, ArrowLeft, TriangleAlert } from 'lucide-react';
import { message, Modal, Spin, Tooltip } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';
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
import { getErrorMessage } from '@/shared/lib/errorMessage';
import requestService from '../api/requestApi';
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
    availableTeacherCount?: number | null;
    availableTaCount?: number | null;
    teams: { teamId: number; teamName: string }[];
    equipments: {
      equipmentId: number;
      equipmentName: string;
      equipmentCode?: string | null;
      categoryName?: string | null;
      imgLink?: string | null;
    }[];
    warningMessage?: string;
    canFulfillRequirement?: boolean;
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
    handleConfirmRejectAssignment,
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
    target.focus({ preventScroll: true });
  }, []);

  const [attachmentPreviewOpen, setAttachmentPreviewOpen] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<{ fileName: string; fileUrl: string } | null>(
    null
  );
  const [openingApproveModal, setOpeningApproveModal] = useState(false);
  const [cancelSessionOpen, setCancelSessionOpen] = useState(false);
  const [cancelSessionReason, setCancelSessionReason] = useState('');
  const [cancelSessionLoading, setCancelSessionLoading] = useState(false);
  const [cancelTargetSessionId, setCancelTargetSessionId] = useState<number | null>(null);
  const [sessionDetailReloadKey, setSessionDetailReloadKey] = useState(0);

  const loadApprovePreview = useCallback(async (): Promise<ApproveSessionPreview[]> => {
    if (!sessions.length) {
      return [];
    }
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
      const sorted = detailRows.sort((a, b) => a.sessionNo - b.sessionNo);
      return sorted;
    } catch (error) {
      console.error('Error loading approve preview:', error);
      return [];
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
    return (
      <div className="fixed inset-0 bg-white/60 z-20 flex items-center justify-center">
        <Spin tip="Đang tải dữ liệu yêu cầu..." />
      </div>
    );
  }

  if (!request) {
    return <div className="text-sm text-black p-4">Không tìm thấy yêu cầu.</div>;
  }

  const statusInfo = getRequestStatusInfo(request.status);
  const isRequestCancelled = requestStatusCode === REQUEST_STATUS.CANCELLED;
  const sessionCount = sessions.length || request.sessionsRequired || 0;
  const requestTypeLabel = request.courseId
    ? 'Chương trình học'
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
    ? 'Tên chương trình học'
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
  const hasStartAt = Boolean(requestDateRange.startAt);
  const hasEndAt = Boolean(requestDateRange.endAt);

  const openApproveModal = async () => {
    setOpeningApproveModal(true);
    let previews: ApproveSessionPreview[] = [];
    let canFulfillRequirement = true;
    let warningMessage = '';
    
    try {
      previews = await loadApprovePreview();
      const previewResponse = await requestService.approve(Number(id), { isConfirmed: false });
      canFulfillRequirement = previewResponse.canFulfillRequirement ?? true;
      warningMessage = previewResponse.warningMessage ?? '';
      
      const sessionWarnings = (previewResponse as any).sessionWarnings || [];
      if (sessionWarnings.length > 0) {
        previews = previews.map(preview => {
          const sessionWarning = sessionWarnings.find((sw: any) => sw.sessionId === preview.sessionId);
          return {
            ...preview,
            warningMessage: sessionWarning?.warningMessage || '',
            canFulfillRequirement: sessionWarning?.canFulfillRequirement ?? true,
            availableTeacherCount: sessionWarning?.availableTeacherCount ?? null,
            availableTaCount: sessionWarning?.availableTaCount ?? null,
            teachersRequired: sessionWarning?.teachersRequired ?? preview.teachersRequired,
            tasRequired: sessionWarning?.tasRequired ?? preview.tasRequired,
          };
        });
      }
    } catch (err) {
      console.error('Error checking request:', err);
      message.error('Không thể kiểm tra yêu cầu: ' + getErrorMessage(err));
      return;
    } finally {
      setOpeningApproveModal(false);
    }

    const approveAccentColor = request.courseId ? '#8B5CF6' : request.eventId ? '#F59E0B' : '#2197C0';
    const approveSourceType = request.courseId ? 'course' : request.eventId ? 'event' : 'subject';
    const approveNote = String((request as Record<string, unknown>).note ?? '').trim();

    Modal.confirm({
      title: 'Xác nhận duyệt yêu cầu',
      icon: <ExclamationCircleFilled className="text-[#F59E0B]" />,
      width: 920,
      centered: true,
      maskClosable: true,
      bodyStyle: {
        maxHeight: 'calc(100vh - 220px)',
        overflowY: 'auto',
        scrollbarWidth: 'thin' as const,
        scrollbarColor: '#CBD5E1 transparent',
      },
      style: { top: 0 },
      wrapClassName: '[&_.ant-modal-body::-webkit-scrollbar]:w-1.5 [&_.ant-modal-body::-webkit-scrollbar-track]:bg-transparent [&_.ant-modal-body::-webkit-scrollbar-thumb]:bg-slate-300 [&_.ant-modal-body::-webkit-scrollbar-thumb]:rounded-full',
      cancelText: 'Hủy',
      okText: 'Duyệt yêu cầu',
      okButtonProps: {
        className: 'bg-emerald-600 hover:bg-emerald-700 border-0 text-white font-medium rounded-lg px-4 shadow-sm',
        style: { backgroundColor: '#059669', borderColor: '#059669', color: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 3px 10px rgba(5,150,105,0.18)' },
      },
      cancelButtonProps: {
        className: 'border border-gray-300 bg-white text-black hover:bg-gray-100 font-medium',
        style: { borderColor: '#D1D5DB', color: '#111827', backgroundColor: '#FFFFFF' },
      },
      content: (
        <div className="w-full">
          <div className="bg-white">
            <div className="p-4 pt-2">
              {warningMessage && (
                <div className={`mb-4 rounded-lg border px-4 py-3 ${canFulfillRequirement ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-start gap-2">
                    {canFulfillRequirement ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${canFulfillRequirement ? 'text-emerald-900' : 'text-amber-900'}`}>
                        {canFulfillRequirement ? 'Đủ điều kiện' : 'Cảnh báo'}
                      </p>
                      <p className={`text-xs mt-0.5 ${canFulfillRequirement ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {warningMessage}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-[1fr,1.2fr] gap-4">
                <div className="space-y-3">
                  <div className="bg-white p-2">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="text-sm text-gray-900 font-medium">Thông tin yêu cầu</div>
                    </div>
                    <div className="space-y-2 text-[13px]">
                      <div>
                        <span className="text-gray-500">Tên yêu cầu:</span>{' '}
                        <span className="text-gray-900 font-medium">{request.requestName ?? request.requestCode}</span>
                      </div>
                      {request.customerName ? (
                        <div>
                          <span className="text-gray-500">Khách hàng:</span>{' '}
                          <span className="text-gray-900 font-medium">{request.customerName}</span>
                        </div>
                      ) : null}
                      <div>
                        <span className="text-gray-500">Loại:</span>{' '}
                        <span
                          className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium"
                          style={{ borderColor: `${approveAccentColor}33`, backgroundColor: `${approveAccentColor}10`, color: approveAccentColor }}
                        >
                          {approveSourceType === 'subject' ? 'Môn học' : approveSourceType === 'course' ? 'Chương trình học' : 'Sự kiện'}
                        </span>
                        {sourceName ? (
                          <span className="ml-1 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                            {sourceNameLabel}: {sourceName}
                          </span>
                        ) : null}
                      </div>
                      {requestDateRange.startAt ? (
                        <div>
                          <span className="text-gray-500">Ngày bắt đầu:</span>{' '}
                          <span className="text-gray-900 font-medium">{dayjs(requestDateRange.startAt).format('DD/MM/YYYY HH:mm')}</span>
                        </div>
                      ) : null}
                    </div>
                    {approveNote ? (
                      <div className="mt-3 text-[13px]">
                        <span className="text-gray-500">Ghi chú:</span>{' '}
                        <span className="text-gray-900">{approveNote}</span>
                      </div>
                    ) : null}
                    
                    {/* Cảnh báo nếu có session diễn ra trong vòng 7 ngày */}
                    {previews.some(p => {
                      if (!p.startAt) return false;
                      const daysUntilSession = dayjs(p.startAt).diff(dayjs(), 'day');
                      return daysUntilSession < 7;
                    }) && (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <TriangleAlert className="w-4 h-4 text-amber-600 shrink-0" />
                          <p className="text-xs text-amber-800 font-medium">
Các buổi diễn ra trong vòng 7 ngày có thể không đảm bảo thời gian xét duyệt, số lượng nhân sự và thiết bị.

                          </p>
                        </div>
                      </div>
                    )}
                    
                    {previews.some(p => 
                      ((p.teachersRequired ?? 0) + 3 > (p.availableTeacherCount ?? 0) && (p.teachersRequired ?? 0) > 0) ||
                      ((p.tasRequired ?? 0) + 3 > (p.availableTaCount ?? 0) && (p.tasRequired ?? 0) > 0)
                    ) && (
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                          <p className="text-xs text-amber-800 font-medium">
                            Số nhân sự phù hợp có thể không đáp ứng đủ cho yêu cầu này
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900">Lịch các buổi</div>
                    {previews.length > 0 ? (
                      <div className="text-[11px] text-gray-600 rounded-full border border-gray-200 px-2 py-0.5 bg-white">
                        {previews.length} buổi
                      </div>
                    ) : null}
                  </div>

                  <div className="divide-y divide-gray-200/60">
                    {previews.map((preview) => {
                      const rawSession = sessions.find((s) => s.sessionId === preview.sessionId);
                      const sessionTitle = rawSession ? getSessionDisplayTitle(rawSession) : `Buổi ${preview.sessionNo}`;
                      const sessionStatusInfo = rawSession ? getSessionStatusInfo(rawSession.status) : null;
                      const duplicatedTitle = sessionTitle.toLowerCase() === `buổi ${preview.sessionNo}`.toLowerCase();
                      const isOnline = (rawSession as Record<string, unknown> | null)?.isOnline as boolean | null | undefined;
                      return (
                        <div key={preview.sessionId} className="relative bg-white px-3 py-3.5">
                          <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ backgroundColor: `${approveAccentColor}55` }} />

                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-[#1a7a99] truncate">
                                {duplicatedTitle ? `Buổi ${preview.sessionNo}` : `Buổi ${preview.sessionNo}: ${sessionTitle}`}
                              </div>
                              {sessionStatusInfo ? (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-[10px] text-gray-500">Trạng thái:</span>
                                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sessionStatusInfo.className}`}>
                                    {sessionStatusInfo.label}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                            {isOnline != null ? (
                              isOnline ? (
                                <div className="shrink-0 text-[11px] border px-2 py-0.5 rounded-full" style={{ backgroundColor: `${approveAccentColor}10`, color: approveAccentColor, borderColor: `${approveAccentColor}33` }}>
                                  Trực tuyến
                                </div>
                              ) : (
                                <div className="shrink-0 text-[11px] text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                                  Trực tiếp
                                </div>
                              )
                            ) : null}
                          </div>

                          <div className="mt-2 space-y-1 text-[13px] text-gray-700">
                            <div className="text-[13px] text-gray-900 font-medium">
                              {dayjs(preview.startAt).format('DD/MM/YYYY HH:mm')} - {dayjs(preview.endAt).format('HH:mm')}
                            </div>
                            <div>
                              <span className="text-gray-500">Địa điểm:</span>{' '}
                              <span>{preview.location || '—'}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                              <span>
                                <span className="text-gray-500">Giảng viên: </span>
                                {preview.availableTeacherCount != null ? (
                                  <>
                                    <span className={`font-semibold ${
                                      (preview.teachersRequired ?? 0) + 3 > (preview.availableTeacherCount ?? 0)
                                        ? 'text-amber-600'
                                        : (preview.availableTeacherCount ?? 0) >= (preview.teachersRequired ?? 0)
                                        ? 'text-emerald-600'
                                        : 'text-amber-600'
                                    }`}>
                                      {preview.availableTeacherCount} phù hợp
                                    </span>
                                    <span className="text-gray-400"> / </span>
                                    <span className="font-medium text-gray-700">{preview.teachersRequired ?? 0} yêu cầu</span>
                                  </>
                                ) : (
                                  <span className="font-medium">{preview.teachersRequired ?? 0} yêu cầu</span>
                                )}
                              </span>
                              <span>
                                <span className="text-gray-500">Sinh viên: </span>
                                {preview.availableTaCount != null ? (
                                  <>
                                    <span className={`font-semibold ${
                                      (preview.tasRequired ?? 0) + 3 > (preview.availableTaCount ?? 0)
                                        ? 'text-amber-600'
                                        : (preview.availableTaCount ?? 0) >= (preview.tasRequired ?? 0)
                                        ? 'text-emerald-600'
                                        : 'text-amber-600'
                                    }`}>
                                      {preview.availableTaCount} phù hợp
                                    </span>
                                    <span className="text-gray-400"> / </span>
                                    <span className="font-medium text-gray-700">{preview.tasRequired ?? 0} yêu cầu</span>
                                  </>
                                ) : (
                                  <span className="font-medium">{preview.tasRequired ?? 0} yêu cầu</span>
                                )}
                              </span>
                            </div>
                            {preview.warningMessage && (
                              <div className={`mt-2 rounded border px-2 py-1.5 text-[11px] ${preview.canFulfillRequirement ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                                {preview.warningMessage}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      ),
      onOk: async () => {
        try {
          await requestService.approve(Number(id), { isConfirmed: true });
          message.success('Đã duyệt yêu cầu');
          await refreshDetail();
          refreshRequestSidebar?.();
        } catch (err) {
          message.error(getErrorMessage(err) || 'Duyệt yêu cầu thất bại');
        }
      },
    });
  };
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
    if (
      requestStatusCode !== REQUEST_STATUS.APPROVED &&
      requestStatusCode !== REQUEST_STATUS.ASSIGNING &&
      requestStatusCode !== REQUEST_STATUS.PUBLISHED
    ) return false;
    const sc = getSessionStatusCode((resolvedDetailSession as any).status);
    return (
      sc === SESSION_STATUS.APPROVED ||
      sc === SESSION_STATUS.ASSIGNING ||
      sc === SESSION_STATUS.ASSIGNMENT_REJECTED ||
      sc === SESSION_STATUS.ASSIGNED
    );
  })();
  const canCancelPanelSession = (() => {
    if (!resolvedPanelSession) return false;
    if (
      requestStatusCode !== REQUEST_STATUS.APPROVED &&
      requestStatusCode !== REQUEST_STATUS.ASSIGNING &&
      requestStatusCode !== REQUEST_STATUS.PUBLISHED
    ) return false;
    const sc = getSessionStatusCode((resolvedPanelSession as any).status);
    return (
      sc === SESSION_STATUS.APPROVED ||
      sc === SESSION_STATUS.ASSIGNING ||
      sc === SESSION_STATUS.ASSIGNMENT_REJECTED ||
      sc === SESSION_STATUS.ASSIGNED
    );
  })();

  const openCancelSessionDialog = (sessionId?: number) => {
    const sess = sessionId ? { sessionId } : (resolvedDetailSession ?? resolvedPanelSession);
    if (!sess) return;
    setCancelTargetSessionId(sess.sessionId);
    setCancelSessionReason('');
    setCancelSessionOpen(true);
  };

  const handleConfirmCancelSession = async () => {
    const sessionId = cancelTargetSessionId ?? resolvedDetailSession?.sessionId ?? resolvedPanelSession?.sessionId;
    if (!sessionId) return;
    const trimmed = cancelSessionReason.trim();
    if (!trimmed) {
      message.warning('Vui lòng nhập lý do hủy buổi.');
      return;
    }
    try {
      setCancelSessionLoading(true);
      await sessionService.cancel({ sessionId, reason: trimmed });
      message.success('Đã hủy buổi.');
      setCancelSessionOpen(false);
      setCancelSessionReason('');
      setCancelTargetSessionId(null);
      await refreshDetail();
      refreshRequestSidebar?.();
    } catch (err) {
      message.error(getErrorMessage(err) || 'Hủy buổi thất bại.');
    } finally {
      setCancelSessionLoading(false);
    }
  };

  return (
    <>
      <div className="text-black">
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
          <div className="flex items-start justify-between gap-4 px-5 pt-3">
            <div className="flex flex-col gap-1 min-w-0 flex-1">
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
            {(hasStartAt || hasEndAt) ? (
              <div className="flex items-center gap-6 shrink-0">
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-[#2197C0] font-semibold">
                    Ngày bắt đầu
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {requestDateRange.startAt ? dayjs(requestDateRange.startAt).format('DD/MM/YYYY HH:mm') : '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-[#2197C0] font-semibold">
                    Ngày kết thúc
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {requestDateRange.endAt ? dayjs(requestDateRange.endAt).format('DD/MM/YYYY HH:mm') : '—'}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-slate-100 px-5 py-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="min-w-0">
              <p className={metaLabelClass}>
                <span className={dotClass} aria-hidden />
                Người tạo
              </p>
              <div className="mt-1 flex items-center gap-2">
                {request.programCoordinator?.avatarUrl ? (
                  <img
                    src={request.programCoordinator.avatarUrl}
                    alt={request.programCoordinator.fullName || ''}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center">
                    <span className="text-[10px] font-medium text-slate-600">
                      {request.programCoordinator?.fullName?.charAt(0) || '?'}
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {request.programCoordinator?.fullName || '—'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {request.programCoordinator?.email || ''}
                  </p>
                </div>
              </div>
            </div>
            <div className="min-w-0">
              <p className={metaLabelClass}>
                <span className={dotClass} aria-hidden />
                Khách hàng
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">{request.customerName || '—'}</p>
            </div>
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
            <div className="min-w-0">
              <p className={metaLabelClass}>
                <span className={dotClass} aria-hidden />
                Thời lượng
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">{sourceDuration || '—'}</p>
            </div>
          </div>
        </div>

      {viewMode === 'assignment' ? (
        <div className="space-y-4 text-black">
          <div className="mb-2 flex flex-wrap justify-between items-center gap-4 bg-white/95 backdrop-blur p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-slate-800 min-w-0">
              <Badge className="shrink-0 bg-violet-100 text-violet-800 border-0 text-[11px]">
                Duyệt phân công
              </Badge>
              <span className="text-gray-800">
                Xem các buổi thuộc yêu cầu này và duyệt phân công cho từng buổi sau khi Team
                Leader đã gán đủ nhân sự.
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="mb-3 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Danh sách các buổi</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{sessions.length} buổi trong yêu cầu này</p>
              </div>
              <div className="text-xs text-slate-600">
                <span className="font-medium">Hình thức tham gia:</span>{' '}
                <span className="text-slate-900">
                  {(request as any).isContinuous ? 'Liên tục' : 'Từng buổi'}
                </span>
              </div>
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
                          <span className="text-xs text-slate-500">Địa điểm:</span>
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
                      disabled={openingApproveModal}
                      onClick={() => void openApproveModal()}
                    >
                      {openingApproveModal
                        ? <span className="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
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

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex justify-between items-center mb-3 shrink-0">
              <h3 className="text-sm font-semibold text-slate-900">Danh sách các buổi</h3>
              <div className="flex items-center gap-3">
                <div className="text-xs text-slate-600">
                  <span className="font-medium">Hình thức tham gia:</span>{' '}
                  <span className="text-slate-900">
                    {(request as any).isContinuous ? 'Liên tục' : 'Từng buổi'}
                  </span>
                </div>
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
            </div>
            {sessions.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">Yêu cầu này chưa có danh sách buổi chi tiết.</p>
            ) : (
              <div className="space-y-1">
                {sessions.map((session) => {
                  const teamIds = uiAssignedTeamIdsBySessionId[session.sessionId] ?? [];
                  const teamCount = teamIds.length;
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
                      onClick={() => setRightPanel({ mode: isTeamAssignView && !isPendingRequest ? 'team' : 'detail', session })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setRightPanel({ mode: isTeamAssignView && !isPendingRequest ? 'team' : 'detail', session });
                        }
                      }}
                      className={`w-full border-b border-slate-200 bg-white px-4 py-3 hover:bg-slate-50 transition cursor-pointer focus:outline-none ${
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
                          <span className="text-xs text-slate-500">Địa điểm: </span>
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
                          {teamCount > 0 && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-700 font-medium">{teamCount} nhóm</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {(() => {
                            if (!session.startAt || !request.createdAt) return null;
                            const daysFromCreate = dayjs(session.startAt).startOf('day').diff(dayjs(request.createdAt).startOf('day'), 'day');
                            if (daysFromCreate >= 7) return null;
                            return (
                              <Tooltip
                                title={
                                  <div className="space-y-0.5">
                                    <p className="font-semibold" style={{ color: '#d97706' }}>
                                      {daysFromCreate <= 0 ? 'Buổi này diễn ra ngay khi tạo yêu cầu' : `Chỉ còn ${daysFromCreate} ngày từ lúc tạo đến buổi này`}
                                    </p>
                                    <p style={{ color: '#00000099' }}>Yêu cầu tạo dưới 7 ngày trước buổi có thể không đảm bảo thiết bị, giảng viên và thời gian xét duyệt.</p>
                                  </div>
                                }
                                placement="top"
                                color="#fffbe6"
                                overlayInnerStyle={{ fontSize: 10, padding: '5px 9px', lineHeight: '1.5', border: '1px solid #ffe58f' }}
                              >
                                <TriangleAlert className="w-3.5 h-3.5 text-amber-500 cursor-default" />
                              </Tooltip>
                            );
                          })()}
                        </div>
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
                disabled={String(request.status ?? '').toLowerCase() !== 'pending' || openingApproveModal}
                onClick={() => void openApproveModal()}
              >
                {openingApproveModal
                  ? <span className="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
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

      {rightPanel && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div
            className="flex-1 bg-black/30"
            onClick={() => setRightPanel(null)}
          />

          <div className="w-full max-w-2xl flex-1 bg-white text-black shadow-2xl flex flex-col border-l">
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
                    <h2 className="text-base font-semibold text-[#1a7a99]">Chọn buổi & thiết bị</h2>
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
                    <h2 className="text-base font-semibold text-[#1a7a99]">
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
                  <RequestSessionDetailPanel
                    session={
                      sessions.find((s) => s.sessionId === rightPanel.session.sessionId) ?? rightPanel.session
                    }
                    requestId={Number(request.requestId)}
                    requestCode={request.requestCode ?? ''}
                    showReservedEquipment={false}
                    sectionMode="info"
                    canEditReservation={!isPendingRequest}
                    onReservationUpdated={isPendingRequest ? undefined : handleEquipmentSuccess}
                  />
                  
                  <div className="mt-6">
                    {!isApprovalView && !isPendingRequest ? (
                      <RequestDetailTeamPanel
                        session={rightPanel.session}
                        canEdit={
                          requestStatusCode === REQUEST_STATUS.APPROVED &&
                          (getSessionStatusCode(rightPanel.session.status) === SESSION_STATUS.APPROVED ||
                           getSessionStatusCode(rightPanel.session.status) === SESSION_STATUS.ASSIGNMENT_REJECTED)
                        }
                        canEditTeacher={(() => {
                          if (!requestStatusCode || requestStatusCode < REQUEST_STATUS.APPROVED) return false;
                          const sc = getSessionStatusCode(rightPanel.session.status);
                          return (
                            sc === SESSION_STATUS.APPROVED ||
                            sc === SESSION_STATUS.ASSIGNING ||
                            sc === SESSION_STATUS.ASSIGNMENT_REJECTED ||
                            sc === SESSION_STATUS.ASSIGNED
                          );
                        })()}
                        currentTeamQuantities={uiTeamQuantitiesBySessionId[rightPanel.session.sessionId]}
                        currentAssignedTeamIds={uiAssignedTeamIdsBySessionId[rightPanel.session.sessionId] ?? []}
                        separateTeacherSelection={requestStatusCode != null && requestStatusCode >= REQUEST_STATUS.APPROVED}
                        requestStatus={request.status}
                        onAssignSession={handleAssignSession}
                        onTeacherAssignmentUpdated={async () => {
                          await reloadAssignmentsForSession(rightPanel.session.sessionId);
                          await refreshDetail();
                          setSessionDetailReloadKey((k) => k + 1);
                          refreshRequestSidebar?.();
                        }}
                      />
                    ) : null}
                  </div>

                  {!isApprovalView && !isPendingRequest && (
                    <div className="mt-6">
                      <RequestSessionDetailPanel
                        session={
                          sessions.find((s) => s.sessionId === rightPanel.session.sessionId) ?? rightPanel.session
                        }
                        requestId={Number(request.requestId)}
                        requestCode={request.requestCode ?? ''}
                        showReservedEquipment={true}
                        sectionMode="equipment"
                        canEditReservation={!isPendingRequest}
                        onReservationUpdated={handleEquipmentSuccess}
                      />
                    </div>
                  )}

                  {resolvedDetailSession ? (
                    <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                      {canCancelDetailSession ? (
                        <button
                          type="button"
                          onClick={() => openCancelSessionDialog()}
                          className="inline-flex items-center gap-1 text-[11px] font-medium rounded-sm py-0.5 text-[#7f1d1d] hover:text-[#991b1b] hover:underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300/60 focus-visible:ring-offset-1"
                        >
                          <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden />
                          Hủy buổi
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
              {rightPanel.mode === 'team' && !isPendingRequest && (
                <RequestDetailTeamPanel
                  session={rightPanel.session}
                  canEdit={
                    requestStatusCode === REQUEST_STATUS.APPROVED &&
                    (getSessionStatusCode(rightPanel.session.status) === SESSION_STATUS.APPROVED ||
                     getSessionStatusCode(rightPanel.session.status) === SESSION_STATUS.ASSIGNMENT_REJECTED)
                  }
                  canEditTeacher={(() => {
                    if (!requestStatusCode || requestStatusCode < REQUEST_STATUS.APPROVED) return false;
                    const sc = getSessionStatusCode(rightPanel.session.status);
                    return (
                      sc === SESSION_STATUS.APPROVED ||
                      sc === SESSION_STATUS.ASSIGNING ||
                      sc === SESSION_STATUS.ASSIGNMENT_REJECTED ||
                      sc === SESSION_STATUS.ASSIGNED
                    );
                  })()}
                  currentTeamQuantities={uiTeamQuantitiesBySessionId[rightPanel.session.sessionId]}
                  currentAssignedTeamIds={uiAssignedTeamIdsBySessionId[rightPanel.session.sessionId] ?? []}
                  separateTeacherSelection={requestStatusCode != null && requestStatusCode >= REQUEST_STATUS.APPROVED}
                  requestStatus={request.status}
                  onAssignSession={handleAssignSession}
                  onTeacherAssignmentUpdated={async () => {
                    await reloadAssignmentsForSession(rightPanel.session.sessionId);
                    await refreshDetail();
                    setSessionDetailReloadKey((k) => k + 1);
                    refreshRequestSidebar?.();
                  }}
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
                      showReservedEquipment={false}
                      sectionMode="info"
                    />
                  ) : null}

                  

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
                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      {canCancelPanelSession ? (
                        <button
                          type="button"
                          onClick={() => openCancelSessionDialog()}
                          className="inline-flex items-center gap-1 text-[11px] font-medium rounded-sm py-0.5 text-[#7f1d1d] hover:text-[#991b1b] hover:underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300/60 focus-visible:ring-offset-1"
                        >
                          <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden />
                          Hủy buổi
                        </button>
                      ) : null}
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
                  Trình duyệt không hỗ trợ trực tiếp cho loại tệp này.
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

