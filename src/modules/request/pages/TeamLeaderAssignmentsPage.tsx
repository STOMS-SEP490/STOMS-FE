import { useCallback, useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';
import { Spin, message } from 'antd';
import {
  X,
  ArrowLeft,
  MapPin,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import RequestCard from '@/shared/components/request/RequestCard';
import { Badge } from '@/shared/components/ui/badge';
import { Dialog } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import {
  ASSIGNMENT_STATUS,
  SESSION_STATUS,
  getAssignmentStatusInfo,
  getSessionStatusCode,
  getSessionStatusInfo,
  getTeamLeaderRequestStatusInfo,
  isSessionAssignmentRejectedStatus,
} from '@/constants/status';
import type { RequestSessionSummary } from '@/modules/request/request';
import {
  getSessionDisplayTitleWithDetail,
} from '@/modules/request/utils/getSessionDisplayTitle';
import RequestSessionDetailPanel from '@/modules/request/pages/RequestSessionDetailPanel';
import TeamLeaderStaffAssignmentPanel from '../../attendance/components/TeamLeaderStaffAssignmentPanel';
import TeamLeaderSessionDetailGate from '@/modules/request/pages/TeamLeaderSessionDetailGate';
import { postSessionCannotBeAssigned } from '@/modules/notification/api/notificationApi';
import type { SessionDetail, SuggestedStaff } from '@/modules/request/type';
import type { TeamLeaderAssignmentsTab } from '@/modules/contract/hooks/type';
import {
  partitionTeamLeaderAssignmentSlots,
  useTeamLeaderAssignmentsPage,
} from '@/modules/contract/hooks/useTeamLeaderAssignmentsPage';

const DEFAULT_AVATAR_SRC = '/img/ava.png';

function getAvatarSrc(src?: string | null) {
  return src && String(src).trim() ? String(src) : DEFAULT_AVATAR_SRC;
}

/** Assignment status Rejected = 3 (manager từ chối phân công). Không dùng .includes để tránh nhầm với session AssignmentRejected. */
function isAssignmentRejectedStatus(status: string | number | null | undefined): boolean {
  return getAssignmentStatusInfo(status).code === ASSIGNMENT_STATUS.REJECTED;
}

function collectSessionSkillsFromDetail(detail: SessionDetail | undefined): string[] {
  if (!detail) return [];
  const fromSubject = (detail.SubjectSkill ?? [])
    .filter((s) => s.IsActive !== false)
    .map((s) => String(s.SkillName ?? '').trim())
    .filter(Boolean);
  const fromEvent = (detail.EventSessionSkill ?? [])
    .filter((s) => s.IsActive !== false)
    .map((s) => String(s.SkillName ?? '').trim())
    .filter(Boolean);
  return Array.from(new Set([...fromSubject, ...fromEvent]));
}

function countTeamsOnSession(detail: SessionDetail | undefined): number {
  const raw = detail?.TeamSessions ?? [];
  const ids = raw
    .map((ts) => ts.TeamId)
    .filter((id): id is number => typeof id === 'number' && id > 0);
  return new Set(ids).size;
}

type TeamLeaderAssignmentsPageProps = {
  tab: TeamLeaderAssignmentsTab;
};

export default function TeamLeaderAssignmentsPage({ tab }: TeamLeaderAssignmentsPageProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const detailRequestId = Number(id ?? 0);
  const hasDetailRequestId = Number.isFinite(detailRequestId) && detailRequestId > 0;
  const showRequestListSidebar = !hasDetailRequestId;
  const {
    loading,
    requestSessionsLoading,
    // sendingAssignments, // Unused variable
    requests,
    filteredRequests,
    selectedRequestId,
    setSelectedRequestId,
    currentTeamId,
    selectedRequest,
    selectedRequestTypeInfo,
    activeSession,
    setActiveSession,
    sessionDetailsById,
    ensureSuggestedStaffForAssignments,
    getSessionStats,
    refetchRequestById,
    refreshSessionDetailById,
  } = useTeamLeaderAssignmentsPage(tab);

  useEffect(() => {
    if (!hasDetailRequestId) return;
    const existedInRequests = requests.some((r) => r.requestId === detailRequestId);
    if (!existedInRequests) return;
    setSelectedRequestId(detailRequestId);
  }, [detailRequestId, hasDetailRequestId, requests, setSelectedRequestId]);

  const [reportSessionOpen, setReportSessionOpen] = useState(false);
  const [reportSessionReason, setReportSessionReason] = useState('');
  const [reportSessionLoading, setReportSessionLoading] = useState(false);

  const [hoveredStaff, setHoveredStaff] = useState<{
    staff: SuggestedStaff;
    rect: DOMRect;
  } | null>(null);
  const [staffPickerAssignmentId, setStaffPickerAssignmentId] = useState<number | null>(null);
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setStaffPickerAssignmentId(null);
    setHoveredStaff(null);
  }, [activeSession?.sessionId]);

  useEffect(() => {
    setHoveredStaff(null);
  }, [selectedRequestId]);

  useEffect(() => {
    setReportSessionOpen(false);
    setReportSessionReason('');
  }, [activeSession?.sessionId]);

  useEffect(() => {
    if (staffPickerAssignmentId != null) return;
    setHoveredStaff(null);
  }, [staffPickerAssignmentId]);

  useEffect(() => {
    if (staffPickerAssignmentId == null) return;
    // Luôn tải lại suggest khi mở ô (tránh cache []/cũ sau khi vừa assign — trước đây Array.isArray([]) vẫn coi là đã có cache).
    void ensureSuggestedStaffForAssignments([staffPickerAssignmentId], { forceRefetch: true });
  }, [staffPickerAssignmentId, ensureSuggestedStaffForAssignments]);

  useEffect(() => {
    const closeHover = () => setHoveredStaff(null);
    window.addEventListener('scroll', closeHover, true);
    window.addEventListener('resize', closeHover);
    return () => {
      window.removeEventListener('scroll', closeHover, true);
      window.removeEventListener('resize', closeHover);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
    };
  }, []);

  const openReportCannotAssignSession = useCallback(() => {
    setReportSessionReason('');
    setReportSessionOpen(true);
  }, []);

  const handleConfirmReportCannotAssignSession = useCallback(async () => {
    if (!activeSession) return;
    const trimmed = reportSessionReason.trim();
    if (!trimmed) {
      message.warning('Vui lòng nhập lý do.');
      return;
    }
    try {
      setReportSessionLoading(true);
      await postSessionCannotBeAssigned({
        sessionId: activeSession.sessionId,
        reason: trimmed,
      });
      message.success('Đã gửi thông báo.');
      setReportSessionOpen(false);
      setReportSessionReason('');
      await refetchRequestById(activeSession.requestId);
      await refreshSessionDetailById(activeSession.sessionId);
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Gửi thông báo thất bại.';
      message.error(msg);
    } finally {
      setReportSessionLoading(false);
    }
  }, [activeSession, reportSessionReason, refetchRequestById, refreshSessionDetailById]);

  return (
    <div
      className="flex h-full min-h-0 flex-col app-page-bg overflow-hidden py-0 px-0"
    >
      {loading && (
        <div className="fixed inset-0 bg-white/60 z-20 flex items-center justify-center">
          <Spin tip="Đang tải dữ liệu phân công cho nhóm..." />
        </div>
      )}

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Sidebar */}
        {showRequestListSidebar ? (
          <div className="w-[360px] bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col min-h-0">
            <div className="flex justify-between items-center p-4 border-b border-slate-200">
              <div className="min-w-0">
                <h2 className="font-medium text-base text-black truncate">Danh sách yêu cầu</h2>
                <p className="text-[11px] text-slate-500">
                  {filteredRequests.length} yêu cầu thuộc nhóm của bạn
                </p>
              </div>
              <span className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2 py-1 shrink-0">
                {filteredRequests.length}
              </span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 space-y-2 app-page-bg">
              {filteredRequests.length === 0 && (
                <div className="p-4 text-sm text-gray-500">
                  Chưa có yêu cầu nào có buổi của nhóm này.
                </div>
              )}
              {filteredRequests.map((r) => (
                <RequestCard
                  key={r.requestId}
                  requestName={r.requestName ?? '—'}
                  requestCode={r.requestCode}
                  customerName={r.customerName}
                  subjectId={r.subjectId}
                  courseId={r.courseId}
                  eventId={r.eventId}
                  status={r.status}
                  statusInfoOverride={getTeamLeaderRequestStatusInfo(r.status)}
                  showNeedsAction
                  isActive={r.requestId === selectedRequestId}
                  onClick={() => {
                    navigate(`/tl/assignments/${tab}/${r.requestId}`);
                    setSelectedRequestId(r.requestId);
                    setActiveSession(null);
                  }}
                  hintText="Bấm để xem danh sách buổi"
                />
              ))}
            </div>
          </div>
        ) : null}

        {/* Content — scroll một vùng giống tab Tổng quan manager (RequestDetail) */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-1">
          {!selectedRequest ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-sm text-gray-500">
              Chọn một yêu cầu để xem chi tiết và phân công.
            </div>
          ) : (
            <div className="space-y-4 flex flex-col min-h-0 flex-1">
              {(() => {
                const sessions = [...selectedRequest.sessions]
                  .filter((s) => s.sessionId > 0 && s.startAt && s.endAt)
                  .sort((a, b) => dayjs(a.startAt).valueOf() - dayjs(b.startAt).valueOf());
                const firstStart = sessions.length > 0 ? sessions[0].startAt : null;
                const lastEnd = sessions.length > 0 ? sessions[sessions.length - 1].endAt : null;
                const totalMinutes = sessions.reduce((sum, s) => {
                  const minutes = dayjs(s.endAt).diff(dayjs(s.startAt), 'minute');
                  return sum + Math.max(0, minutes);
                }, 0);
                const durationText = (() => {
                  if (totalMinutes <= 0) return '—';
                  const hours = Math.floor(totalMinutes / 60);
                  const minutes = totalMinutes % 60;
                  const hh = String(hours).padStart(2, '0');
                  const mm = String(minutes).padStart(2, '0');
                  return `${hh}:${mm}:00`;
                })();
                const sourceName =
                  sessions.find((s) => (s.eventSession?.title ?? '').trim())?.eventSession?.title?.trim() ??
                  sessions.find((s) => (s.subjectSession?.title ?? '').trim())?.subjectSession?.title?.trim() ??
                  null;
                const sourceDescription =
                  sessions.find((s) => (s.eventSession?.description ?? '').trim())?.eventSession?.description?.trim() ??
                  sessions.find((s) => (s.subjectSession?.description ?? '').trim())?.subjectSession?.description?.trim() ??
                  null;
                const sourceNameLabel = selectedRequest.courseId
                  ? 'Tên khóa học'
                  : selectedRequest.eventId
                    ? 'Tên sự kiện'
                    : selectedRequest.subjectId
                      ? 'Tên môn học'
                      : 'Tên';

                const metaLabelClass =
                  'text-[11px] uppercase tracking-wide text-[#2197C0] font-semibold';
                const dotClass = 'mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#2197C0] align-middle';
                const statusInfo = getTeamLeaderRequestStatusInfo(selectedRequest.status);

                return (
                  <div className="bg-white rounded-xl px-6 py-5 shadow-sm border border-slate-200 mb-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => navigate('/tl/assignments')}
                        className="!p-0 w-8 h-8 rounded-lg border border-gray-300 flex items-center justify-center text-black bg-white hover:bg-gray-100 transition-colors"
                        aria-label="Quay lại danh sách yêu cầu"
                        title="Quay lại"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <h2 className="truncate text-xl font-bold text-slate-900">
                            Chi tiết {selectedRequest.requestName || selectedRequest.requestCode}
                          </h2>
                          <p className="text-xs text-slate-700">
                            <span className="text-slate-500">Mã yêu cầu: </span>
                            <span className="font-semibold text-slate-900">{selectedRequest.requestCode}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex min-w-[220px] shrink-0 flex-col items-end gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-500">Trạng thái:</span>
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium border ${statusInfo.className}`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {(sourceName || sourceDescription) ? (
                      <div className="flex flex-col gap-1 px-5 pt-3">
                        {sourceName ? (
                          <p className="mt-1 text-sm font-semibold">
                            <span className="text-[#2197C0]">
                              <span className={dotClass} aria-hidden />
                              {sourceNameLabel}:{' '}
                            </span>
                            <span className="text-slate-900">{sourceName || '—'}</span>
                          </p>
                        ) : null}
                        {sourceDescription ? (
                          <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                            {sourceDescription}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-slate-100 px-5 py-4 sm:grid-cols-2 lg:grid-cols-6">
                      <div className="min-w-0">
                        <p className={metaLabelClass}>
                          <span className={dotClass} aria-hidden />
                          Loại yêu cầu
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-900">{selectedRequestTypeInfo?.label ?? '—'}</p>
                      </div>
                      <div className="min-w-0">
                        <p className={metaLabelClass}>
                          <span className={dotClass} aria-hidden />
                          Ngày gửi
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-900">
                          {selectedRequest.startDate ? dayjs(selectedRequest.startDate).format('DD/MM/YYYY') : '—'}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className={metaLabelClass}>
                          <span className={dotClass} aria-hidden />
                          Số lượng buổi
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-900">
                          {requestSessionsLoading ? '—' : `${selectedRequest.sessions.length} buổi`}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className={metaLabelClass}>
                          <span className={dotClass} aria-hidden />
                          Thời lượng
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-900">{durationText}</p>
                      </div>
                      <div className="min-w-0">
                        <p className={metaLabelClass}>
                          <span className={dotClass} aria-hidden />
                          Ngày bắt đầu
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-900">
                          {firstStart ? dayjs(firstStart).format('DD/MM/YYYY HH:mm') : '—'}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className={metaLabelClass}>
                          <span className={dotClass} aria-hidden />
                          Ngày kết thúc
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-900">
                          {lastEnd ? dayjs(lastEnd).format('DD/MM/YYYY HH:mm') : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {requestSessionsLoading ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[280px] py-12">
                  <Spin tip="Đang tải danh sách buổi theo nhóm..." />
                </div>
              ) : (
                <>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="mb-3 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-medium text-slate-900">Danh sách buổi</h3>
                  </div>
                  <div className="text-xs text-slate-600">
                    <span className="font-medium">Hình thức tham gia:</span>{' '}
                    <span className="text-slate-900">
                      {(selectedRequest as any).isContinuous ? 'Liên tục' : 'Từng buổi'}
                    </span>
                  </div>
                </div>
                {selectedRequest.sessions.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    Yêu cầu này chưa có buổi nào gán cho nhóm.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedRequest.sessions.map((session) => {
                      const detailLoaded = Boolean(sessionDetailsById[session.sessionId]);
                      const stats = getSessionStats(session);
                      const sessionStatusInfo = getSessionStatusInfo(session.status);
                      const detail = sessionDetailsById[session.sessionId];
                      const topic = session.subjectSession ?? session.eventSession;
                      const sessionTitle = getSessionDisplayTitleWithDetail(
                        session as RequestSessionSummary & { notes?: string | null },
                        undefined,
                      );
                      const sessionSkills = collectSessionSkillsFromDetail(detail);
                      const location =
                        (detail?.Location != null && String(detail.Location).trim()
                          ? String(detail.Location)
                          : session.location) || '—';
                      const teamCount = countTeamsOnSession(detail);
                      const fullyAssigned =
                        detailLoaded && stats.total > 0 && stats.filled === stats.total;
                      const sessionDate = dayjs(session.startAt).format('DD/MM/YYYY');
                      const isHighlightDate = sessionDate === '16/04/2026';
                      return (
                        <div
                          key={session.sessionId}
                          role="button"
                          tabIndex={0}
                          onClick={() => setActiveSession(session)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setActiveSession(session);
                            }
                          }}
                          className="w-full border-t border-b border-slate-200 bg-white px-4 py-3 hover:bg-slate-50 transition cursor-pointer focus:outline-none"
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
                              <span className="text-xs text-slate-500">Địa điểm:</span>
                              <span className="truncate text-xs text-slate-600">{location}</span>
                            </div>
                            <span
                              className="inline-flex items-center gap-0.5 text-xs font-semibold text-sky-700 select-none"
                              aria-hidden
                            >
                              Chi tiết
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-semibold text-slate-900 leading-snug line-clamp-2">
                            {sessionTitle}
                          </p>
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
                          <div className="mt-1 flex items-center justify-between gap-1.5 text-xs text-slate-600 flex-wrap">
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
                            {detailLoaded && stats.total > 0 && !fullyAssigned ? (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                Chưa chọn đủ sinh viên
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
                </>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* ─── RIGHT: Session detail + assignment panel (slide-over overlay) ─── */}
      {activeSession && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="flex-1 bg-black/30" onClick={() => setActiveSession(null)} />
          <div className="w-full max-w-2xl h-full bg-white text-black shadow-2xl flex flex-col overflow-hidden border-l">
            {/* Panel header */}
            <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-snug">
                  {getSessionDisplayTitleWithDetail(
                    activeSession as RequestSessionSummary & { notes?: string | null },
                    sessionDetailsById[activeSession.sessionId],
                  )}
                </h2>
                <p className="text-xs text-slate-500 mt-1 tabular-nums">
                  <span>Buổi {activeSession.sessionNo}</span>
                  <span className="text-slate-300">{' · '}</span>
                  <span className="font-semibold text-[#2197C0]">
                    {dayjs(activeSession.startAt).format('HH:mm')} – {dayjs(activeSession.endAt).format('HH:mm')}
                  </span>
                  <span className="text-slate-300">{' · '}</span>
                  <span className="font-semibold text-[#2197C0]">{dayjs(activeSession.startAt).format('DD/MM/YYYY')}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {(() => {
                    const d = sessionDetailsById[activeSession.sessionId];
                    const eff = String(d?.Status ?? activeSession.status ?? '').trim();
                    const sessionInfo = getSessionStatusInfo(eff);
                    const sessionRejected = isSessionAssignmentRejectedStatus(eff);
                    return (
                      <>
                        <span className="text-[11px] font-medium text-slate-500">Trạng thái:</span>
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${sessionInfo.className}`}>
                          {sessionInfo.label}
                        </span>
                        {tab === 'rejected' && !sessionRejected ? (
                          <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-800">
                            Yêu cầu có buổi bị từ chối
                          </span>
                        ) : null}
                      </>
                    );
                  })()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSession(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition bg-transparent border-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Panel body: thông tin buổi trước, sau đó phân công */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-4 space-y-5">
              {(() => {
                const detail = sessionDetailsById[activeSession.sessionId];
                if (!detail) {
                  return (
                    <div className="flex items-center justify-center py-8">
                      <Spin tip="Đang tải chi tiết buổi..." />
                    </div>
                  );
                }

                const assignments = detail.Assignments ?? [];
                const {
                  editableTeacherSlots,
                  editableTaSlots,
                } = partitionTeamLeaderAssignmentSlots(detail, currentTeamId);

                const sessionInfoCard = (
                  <RequestSessionDetailPanel
                    session={{
                      sessionId: activeSession.sessionId,
                      sessionNo: activeSession.sessionNo,
                      startAt: activeSession.startAt,
                      endAt: activeSession.endAt,
                      status: activeSession.status,
                      location: activeSession.location,
                      subjectSession: activeSession.subjectSession ?? undefined,
                      eventSession: activeSession.eventSession ?? undefined,
                      reservationId: null,
                    }}
                    requestId={activeSession.requestId}
                    requestCode={selectedRequest?.requestCode ?? ''}
                    sectionMode="info"
                    showTeamSummary={false}
                    showReservedEquipment={false}
                  />
                );

                const teamQuotaSlots = [...editableTeacherSlots, ...editableTaSlots];
                const teamRejectedAssignments =
                  tab === 'rejected'
                    ? assignments.filter((a) => isAssignmentRejectedStatus(a.Status))
                    : teamQuotaSlots.filter((a) => isAssignmentRejectedStatus(a.Status));

                const requestReasonRaw = selectedRequest?.reason?.trim() ?? '';
                const requestReasonLines =
                  requestReasonRaw.length > 0
                    ? requestReasonRaw.split('\n').filter((line) => line.trim().length > 0)
                    : [];
                const sessionRejectedUi = isSessionAssignmentRejectedStatus(detail.Status);

                const sessionStatusForReport = String(detail?.Status ?? activeSession.status ?? '').trim();
                const sessionStatusCodeForReport = getSessionStatusCode(sessionStatusForReport);
                const blockedReportStatuses = new Set<number>([
                  SESSION_STATUS.ONGOING,
                  SESSION_STATUS.COMPLETED,
                  SESSION_STATUS.CANCELLED,
                ]);
                const canReportCannotAssign =
                  sessionStatusCodeForReport == null ||
                  !blockedReportStatuses.has(sessionStatusCodeForReport);

                return (
                  <TeamLeaderSessionDetailGate
                    key={activeSession.sessionId}
                    sessionId={activeSession.sessionId}
                    currentTeamId={currentTeamId}
                    reservationId={
                      detail.ReservationId != null && Number(detail.ReservationId) > 0
                        ? Number(detail.ReservationId)
                        : null
                    }
                  >
                    {sessionInfoCard}

                    {tab === 'rejected' &&
                      (requestReasonLines.length > 0 ||
                        teamRejectedAssignments.length > 0 ||
                        sessionRejectedUi) && (
                      <div className="rounded-xl border border-orange-200 bg-orange-50/90 shadow-sm overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-orange-100 bg-orange-50">
                          <h3 className="font-medium text-orange-900 text-sm">
                            {teamRejectedAssignments.length > 0
                              ? 'Phân công bị từ chối'
                              : 'Thông tin từ chối phân công'}
                          </h3>
                          <p className="text-[11px] text-orange-800/90 mt-0.5">
                            {teamRejectedAssignments.length > 0
                              ? 'Các phân công dưới đây bị quản lý từ chối; vui lòng phân công lại.'
                              : 'Xem lý do từ quản lý và kiểm tra phân công bên dưới.'}
                          </p>
                        </div>
                        {teamRejectedAssignments.length === 0 && sessionRejectedUi && (
                          <p className="px-4 py-3 text-xs text-orange-800">
                            Buổi đang ở trạng thái từ chối phân công. Nếu không thấy dòng vị trí cụ thể,
                            hãy làm mới hoặc kiểm tra phân công từng giảng viên / sinh viên phía dưới.
                          </p>
                        )}
                      </div>
                    )}

                    {assignments.length === 0 ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                        <AlertCircle className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                        <p className="text-xs text-amber-700 font-medium">
                          Buổi này chưa có vị trí phân công.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <TeamLeaderStaffAssignmentPanel
                          sessionId={activeSession.sessionId}
                          canEdit
                          onAssignmentUpdated={async () => {
                            // Refresh session detail và request để lấy status mới
                            await refreshSessionDetailById(activeSession.sessionId);
                            await refetchRequestById(activeSession.requestId);
                          }}
                        />
                      </div>
                    )}

                    <div className="mt-6">
                      <RequestSessionDetailPanel
                        session={{
                          sessionId: activeSession.sessionId,
                          sessionNo: activeSession.sessionNo,
                          startAt: activeSession.startAt,
                          endAt: activeSession.endAt,
                          status: activeSession.status,
                          location: activeSession.location,
                          subjectSession: activeSession.subjectSession ?? undefined,
                          eventSession: activeSession.eventSession ?? undefined,
                          reservationId:
                            detail.ReservationId != null && Number(detail.ReservationId) > 0
                              ? Number(detail.ReservationId)
                              : null,
                        }}
                        requestId={activeSession.requestId}
                        requestCode={selectedRequest?.requestCode ?? ''}
                        sectionMode="equipment"
                        showTeamSummary={false}
                        canEditReservation={false}
                        onReservationUpdated={() =>
                          void refreshSessionDetailById(activeSession.sessionId)
                        }
                      />
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                      <div className="relative inline-flex group">
                        <button
                          type="button"
                          onClick={() => {
                            if (!canReportCannotAssign) {
                              message.info('Không đủ điều kiện gửi báo cáo buổi này.');
                              return;
                            }
                            openReportCannotAssignSession();
                          }}
                          className={`inline-flex items-center gap-1 text-[11px] font-medium rounded-sm py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300/60 focus-visible:ring-offset-1 ${
                            canReportCannotAssign
                              ? 'text-[#7f1d1d] hover:text-[#991b1b] hover:underline underline-offset-2'
                              : 'text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden />
                          Báo quản lý hủy buổi
                        </button>
                        {!canReportCannotAssign ? (
                          <span className="pointer-events-none absolute left-0 bottom-full z-50 mb-1 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white shadow-md group-hover:block">
                            Không đủ điều kiện hủy
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </TeamLeaderSessionDetailGate>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={reportSessionOpen}
        onClose={() => !reportSessionLoading && setReportSessionOpen(false)}
        title="Báo quản lý hủy buổi"
        description="Nhập lý do để báo buổi cần bị hủy. Thao tác không thể hoàn tác."
        className="max-w-md border-0 shadow-2xl"
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="tl-report-session-reason" className="text-black">
              Lý do <span className="text-red-500">*</span>
            </Label>
            <textarea
              id="tl-report-session-reason"
              rows={4}
              value={reportSessionReason}
              onChange={(e) => setReportSessionReason(e.target.value)}
              placeholder="Ví dụ: Không đủ nhân sự đáp ứng kỹ năng, trùng lịch..."
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg border-gray-200"
              disabled={reportSessionLoading}
              onClick={() => setReportSessionOpen(false)}
            >
              Đóng
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-lg border-red-200 text-red-600 hover:bg-red-50"
              disabled={reportSessionLoading}
              onClick={() => void handleConfirmReportCannotAssignSession()}
            >
              {reportSessionLoading ? 'Đang gửi...' : 'Gửi thông báo'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Floating staff detail tooltip */}
      {hoveredStaff && (() => {
        const { staff, rect } = hoveredStaff;
        const isSuggested = 'skillMatchCount' in staff && 'assignmentCountIn30Days' in staff;
        if (!isSuggested) return null;
        const s = staff as SuggestedStaff;
        const skills = (s.skills ?? []).map((sk) => sk.skillName).filter(Boolean);
        const maxSkillChips = 3;
        const shownSkills = skills.slice(0, maxSkillChips);
        const moreSkillCount = Math.max(0, skills.length - shownSkills.length);
        const top = rect.top;

        const isTA = String(s.roleName ?? '').toUpperCase().includes('TA') || String(s.roleName ?? '').toUpperCase().includes('ASSIST');
        const roleChip = isTA
          ? { label: 'Sinh viên', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
          : { label: 'Giảng viên', cls: 'bg-sky-100 text-sky-800 border-sky-200' };
        const frame = isTA
          ? { border: 'border-emerald-200/70', ring: 'ring-emerald-100', grad: 'from-emerald-50/70' }
          : { border: 'border-sky-200/70', ring: 'ring-sky-100', grad: 'from-sky-50/70' };

        const workload = Math.max(0, Number(s.assignmentCountIn30Days ?? 0));
        const workloadMax = 12; // UI scale only
        const workloadPct = Math.max(0, Math.min(100, (workload / workloadMax) * 100));

        const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
        const tooltipW = 304;
        const leftPreferred = rect.left - (tooltipW + 16);
        const left =
          leftPreferred >= 8 ? leftPreferred : Math.min(vw - tooltipW - 8, rect.right + 12);
        return (
          <div
            className={`fixed z-[100] w-[304px] bg-white border ${frame.border} rounded-2xl shadow-2xl pointer-events-none ring-1 ${frame.ring} overflow-hidden`}
            style={{ top: Math.max(8, top), left: Math.max(8, left) }}
          >
            <div className={`px-4 pt-3 pb-3 bg-gradient-to-br ${frame.grad} to-white`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 border border-white shadow-sm">
                    <img
                      src={getAvatarSrc(s.avatarUrl)}
                      alt={s.fullName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR_SRC;
                      }}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-medium text-slate-900 truncate">{s.fullName}</div>
                    <div className="text-[12px] text-slate-500 truncate">{s.email || '—'}</div>
                  </div>
                </div>
                <span className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${roleChip.cls}`}>
                  {roleChip.label}
                </span>
              </div>
            </div>

            <div className="px-4 py-3.5 space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <Sparkles className="h-4 w-4 text-slate-400" />
                  Kỹ năng
                </div>
                <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-[11px] font-medium">
                  Khớp: {s.skillMatchCount}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {shownSkills.length ? (
                  <>
                    {shownSkills.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700"
                      >
                        {name}
                      </span>
                    ))}
                    {moreSkillCount > 0 && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        +{moreSkillCount}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-slate-500">—</span>
                )}
              </div>

              <div className="pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <Briefcase className="h-4 w-4 text-slate-400" />
                    Khối lượng công việc (30 ngày)
                  </div>
                  <span className="text-xs font-medium text-slate-800 tabular-nums">
                    {workload}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isTA ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-sky-500 to-sky-400'}`}
                    style={{ width: `${workloadPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
