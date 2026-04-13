import { useCallback, useEffect, useRef, useState } from 'react';


import dayjs from 'dayjs';
import { Popover, Spin, message } from 'antd';
import {
  X,
  MapPin,
  Clock,
  Calendar,
  Hash,
  List,
  GraduationCap,
  Users,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Plus,
  Sparkles,
  Briefcase,
  Lock,
} from 'lucide-react';
import HoverSearch from '@/shared/components/ui/search';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Switch } from '@/shared/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import RequestCard from '@/shared/components/request/RequestCard';
import { Badge } from '@/shared/components/ui/badge';
import { Dialog } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import {
  ASSIGNMENT_STATUS,
  REQUEST_STATUS,
  REQUEST_STATUS_LABEL,
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
import { postSessionCannotBeAssigned } from '@/modules/notification/api/notificationApi';
import type { AssignmentResponse, SessionDetail, SuggestedStaff } from '@/modules/request/type';
import type { TeamLeaderAssignmentsTab } from '@/modules/contract/hooks/type';
import {
  getEffectiveStaffMemberId,
  isAssignmentCancelledStatus,
  isTeamLeaderAssignmentEditableStatus,
  partitionTeamLeaderAssignmentSlots,
  useTeamLeaderAssignmentsPage,
  type TlRequestStatusFilter,
} from '@/modules/contract/hooks/useTeamLeaderAssignmentsPage';

type AssignmentRow = AssignmentResponse;

const DEFAULT_AVATAR_SRC = '/img/ava.png';

function getAvatarSrc(src?: string | null) {
  return src && String(src).trim() ? String(src) : DEFAULT_AVATAR_SRC;
}

function getStaffDisplayForSlot(
  effectiveMemberId: number,
  assignment: AssignmentRow,
  suggested: SuggestedStaff[],
): { fullName: string; email: string; avatarUrl?: string | null } {
  if (!effectiveMemberId || effectiveMemberId <= 0) {
    return {
      fullName: 'Chưa có nhân sự',
      email: '',
      avatarUrl: null,
    };
  }
  const sm = assignment.StaffMember;
  if (sm && sm.MemberId === effectiveMemberId) {
    return {
      fullName: sm.FullName || '—',
      email: sm.Email || sm.User?.Email || '',
      avatarUrl: sm.AvatarUrl,
    };
  }
  const sug = suggested.find((m) => m.memberId === effectiveMemberId);
  if (sug) {
    return {
      fullName: sug.fullName || '—',
      email: sug.email || sug.roleName || '',
      avatarUrl: sug.avatarUrl,
    };
  }
  return {
    fullName: 'Chưa có nhân sự',
    email: '',
    avatarUrl: null,
  };
}

/** Assignment status Rejected = 3 (manager từ chối phân công). Không dùng .includes để tránh nhầm với session AssignmentRejected. */
function isAssignmentRejectedStatus(status: string | number | null | undefined): boolean {
  return getAssignmentStatusInfo(status).code === ASSIGNMENT_STATUS.REJECTED;
}

/**
 * Badge phụ danh sách phiên (không lặp lại nhãn trạng thái phiên):
 * - Cảnh báo vận hành: cần phân lại, chưa có slot
 * - Chỉ với phiên APPROVED (Đã duyệt): thêm «Chưa gán đủ» khi đã tải chi tiết và slot chưa đủ
 */
function getSessionListSecondaryBadge(
  session: { status: string },
  detailLoaded: boolean,
  stats: { total: number; filled: number },
  hasPendingCancelReassign?: boolean,
): { label: string; className: string; showAlert?: boolean } | null {
  if (detailLoaded && hasPendingCancelReassign) {
    return {
      label: 'Cần phân lại',
      className: 'bg-red-50 text-red-800 border-red-200',
      showAlert: true,
    };
  }

  const sessionCode = getSessionStatusCode(session.status);
  if (sessionCode !== SESSION_STATUS.APPROVED || !detailLoaded) return null;
  if (stats.total === 0) return null;
  if (stats.filled >= stats.total) return null;

  return {
    label: 'Chưa gán đủ',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  };
}

/**
 * Slot Cancelled vẫn nằm trong Assignments sau khi đã phân lại — chỉ coi là “cần phân lại”
 * khi quota team vẫn chưa gán đủ (filled chưa bằng total).
 */
function sessionHasPendingCancelReassign(
  detail: SessionDetail | undefined,
  stats: { total: number; filled: number },
): boolean {
  const hasCancelled = (detail?.Assignments ?? []).some((a) => isAssignmentCancelledStatus(a.Status));
  return hasCancelled && stats.total > 0 && stats.filled < stats.total;
}

function getSessionTopicDescription(
  session: {
    subjectSession?: RequestSessionSummary['subjectSession'];
    eventSession?: RequestSessionSummary['eventSession'];
  },
  detail?: SessionDetail,
): string | null {
  const fromSession = (session.subjectSession ?? session.eventSession)?.description?.trim();
  if (fromSession) return fromSession;
  if (!detail) return null;
  const ref = detail.SubjectSession ?? detail.EventSession;
  const d = ref?.Description?.trim();
  return d || null;
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
  const {
    loading,
    requestSessionsLoading,
    filteredRequests,
    selectedRequestId,
    setSelectedRequestId,
    currentTeamId,
    selectedRequest,
    selectedRequestTypeInfo,
    search,
    setSearch,
    onlyNeedsAction,
    setOnlyNeedsAction,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    activeSession,
    setActiveSession,
    sessionDetailsById,
    suggestedByAssignmentId,
    ensureSuggestedStaffForAssignments,
    assignSelections,
    searchByAssignmentId,
    setSearchByAssignmentId,
    handleSelectStaff,
    getSessionStats,
    handleResetFilters,
    refetchRequestById,
    refreshSessionDetailById,
  } = useTeamLeaderAssignmentsPage(tab);

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


  const renderMemberOption = (m: SuggestedStaff) => {
    const subText = m.email ?? m.roleName ?? '—';
    return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-[10px] font-medium text-slate-600">
        <img
          src={getAvatarSrc(m.avatarUrl)}
          alt={m.fullName}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR_SRC;
          }}
        />
      </div>
        <div className="flex flex-row items-center gap-2 min-w-0 flex-1">
          <span className="text-xs font-medium text-slate-900 truncate shrink-0">
          {m.fullName || '—'}
        </span>
          <span className="text-[11px] text-slate-500 truncate">{subText}</span>
      </div>
    </div>
  );
  };

  const handleStaffHover = useCallback(
    (staff: SuggestedStaff, e: React.MouseEvent) => {
      if (hoverCloseTimerRef.current) {
        clearTimeout(hoverCloseTimerRef.current);
        hoverCloseTimerRef.current = null;
      }
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setHoveredStaff({ staff, rect });
    },
    [],
  );

  const handleStaffHoverLeave = useCallback(() => {
    if (hoverCloseTimerRef.current) clearTimeout(hoverCloseTimerRef.current);
    hoverCloseTimerRef.current = setTimeout(() => setHoveredStaff(null), 80);
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

  const renderSlotPicker = (
    sessionId: number,
    slots: NonNullable<SessionDetail['Assignments']>,
    requiredCount: number,
    colorScheme: 'sky' | 'amber',
    highlightRejectedSlots = false,
    /** Member đã hủy nhận ở slot cùng vai trò — không hiện lại trong dropdown ô phân lại. */
    excludeMemberIdsFromCancelled: number[] = [],
    cancelledSlots: AssignmentRow[] = [],
    lockedCount = 0,
    lockedTeamNames: string[] = [],
  ) => {
    const roleLabel = colorScheme === 'sky' ? 'Giáo viên' : 'Trợ giảng';
    const accent =
      colorScheme === 'sky'
        ? {
            addText: 'text-violet-700',
            addCircle: 'bg-violet-100 text-violet-700',
            addHover: 'hover:border-violet-300 hover:bg-violet-50/50',
            cardBorder: 'border-violet-200',
            cardBg: 'bg-gradient-to-br from-violet-50/80 to-white',
            avatarBg: 'bg-violet-100 text-violet-700',
            menuBtn: 'text-violet-600 hover:bg-violet-50 hover:text-violet-800',
            rowStripe: 'border-l-[3px] border-l-violet-400 bg-violet-50/55',
            rowHover: 'hover:bg-violet-100/45',
            approvedStripe: 'border-l-[3px] border-l-violet-500 bg-violet-50/40',
            approvedLockBox: 'bg-violet-100 text-violet-800',
          }
        : {
            addText: 'text-yellow-800',
            addCircle: 'bg-yellow-100 text-yellow-800',
            addHover: 'hover:border-yellow-300 hover:bg-yellow-50/60',
            cardBorder: 'border-yellow-200',
            cardBg: 'bg-gradient-to-br from-yellow-50/85 to-white',
            avatarBg: 'bg-yellow-100 text-yellow-800',
            menuBtn: 'text-yellow-700 hover:bg-yellow-50/90 hover:text-yellow-900',
            rowStripe: 'border-l-[3px] border-l-yellow-400 bg-yellow-50/60',
            rowHover: 'hover:bg-yellow-100/50',
            approvedStripe: 'border-l-[3px] border-l-yellow-500 bg-yellow-50/45',
            approvedLockBox: 'bg-yellow-100 text-yellow-900',
          };
    const placeholder = colorScheme === 'sky' ? 'Chọn giảng viên' : 'Chọn trợ giảng';
    const searchPlaceholder = colorScheme === 'sky' ? 'Tìm giảng viên...' : 'Tìm trợ giảng...';

    const excludeCancelledSet = new Set(
      excludeMemberIdsFromCancelled.map((id) => Number(id)).filter((id) => id > 0),
    );

    const buildSuggestedList = (a: AssignmentRow, selectedId: number) => {
      const selectedSameRole = slots
        .map((sl) =>
          getEffectiveStaffMemberId(sl.AssignmentId, assignSelections, sl.StaffMemberId),
        )
        .filter((id) => id > 0);
      const selectedOthers = selectedSameRole.filter((id) => id !== selectedId);
      const searchText = searchByAssignmentId[a.AssignmentId]?.toLowerCase() || '';
      return (suggestedByAssignmentId[a.AssignmentId] ?? []).filter(
        (m: SuggestedStaff) =>
          !excludeCancelledSet.has(m.memberId) &&
          (!selectedOthers.includes(m.memberId) || m.memberId === selectedId) &&
          (!searchText ||
            m.fullName?.toLowerCase().includes(searchText) ||
            m.roleName?.toLowerCase().includes(searchText) ||
            m.email?.toLowerCase().includes(searchText)),
      );
    };

    const pickerContent = (a: AssignmentRow) => {
      const selectedId = getEffectiveStaffMemberId(
        a.AssignmentId,
        assignSelections,
        a.StaffMemberId,
      );
      const suggestedList = buildSuggestedList(a, selectedId);
      return (
        <div className="w-[min(calc(100vw-2rem),18rem)] p-0.5">
          <Input
            className="h-8 text-xs border-slate-200"
            placeholder={searchPlaceholder}
            value={searchByAssignmentId[a.AssignmentId] || ''}
            onChange={(e) =>
              setSearchByAssignmentId((prev) => ({
                ...prev,
                [a.AssignmentId]: e.target.value,
              }))
            }
          />
          <div className="mt-2 max-h-52 overflow-y-auto no-scrollbar space-y-0.5">
            {suggestedList.length === 0 ? (
              <p className="text-xs text-slate-500 px-2 py-3 text-center">Không có gợi ý phù hợp.</p>
            ) : (
              suggestedList.map((m: SuggestedStaff) => (
                <button
                  key={m.memberId}
                  type="button"
                  className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-slate-50 transition-colors"
                  onClick={() => {
                    handleSelectStaff(sessionId, a.AssignmentId, m.memberId);
                    setStaffPickerAssignmentId(null);
                    setHoveredStaff(null);
                  }}
                  onMouseEnter={(e) => handleStaffHover(m, e)}
                  onMouseLeave={handleStaffHoverLeave}
                >
                  {renderMemberOption(m)}
                </button>
              ))
            )}
          </div>
        </div>
      );
    };

    const teamTextLocked = lockedTeamNames.length ? lockedTeamNames.join(', ') : 'đội khác';

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {roleLabel}
          </span>
          <span className="text-xs font-medium text-slate-500">Cần: {requiredCount}</span>
        </div>
        <div
          className={`rounded-xl p-[3px] ${
            colorScheme === 'sky' ? 'bg-violet-100/35' : 'bg-yellow-100/40'
          }`}
        >
          <div
            className={`divide-y divide-slate-200/45 overflow-hidden rounded-[10px] ${
              colorScheme === 'sky' ? 'bg-violet-50/40' : 'bg-yellow-50/45'
            }`}
          >
            {slots.length === 0 && cancelledSlots.length === 0 && lockedCount <= 0 ? (
              <p className="px-3 py-2.5 text-xs text-slate-500">Chưa có vị trí phân công.</p>
            ) : (
              <>
                {slots.map((a) => {
                  const selectedId = getEffectiveStaffMemberId(
                    a.AssignmentId,
                    assignSelections,
                    a.StaffMemberId,
                  );
                  const suggested = suggestedByAssignmentId[a.AssignmentId] ?? [];
                  const display = getStaffDisplayForSlot(selectedId, a, suggested);
                  const isOpen = staffPickerAssignmentId === a.AssignmentId;
                  const filled = selectedId > 0;
                  const slotEditable = isTeamLeaderAssignmentEditableStatus(a.Status);
                  const isRejected = highlightRejectedSlots && isAssignmentRejectedStatus(a.Status);
                  const assignmentStatusUi = getAssignmentStatusInfo(a.Status);
                  const showAssignmentStatusBadge =
                    filled || assignmentStatusUi.code !== ASSIGNMENT_STATUS.PENDING;
                  const isPendingReview =
                    filled &&
                    slotEditable &&
                    !isRejected &&
                    assignmentStatusUi.code === ASSIGNMENT_STATUS.PENDING;
                  const reasonRaw = a.Reason?.trim();
                  const reasonLines =
                    reasonRaw && reasonRaw.length > 0
                      ? reasonRaw.split('\n').filter((line) => line.trim().length > 0)
                      : [];
                  const rejectionReasonBlock =
                    isRejected ? (
                      <div className="border-t border-slate-200/45 bg-rose-50/25 px-3 py-2.5">
                        <div className="rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2.5">
                          <p className="text-xs font-medium text-rose-900 mb-1.5">Lý do từ chối</p>
                          {reasonLines.length > 0 ? (
                            <ul className="space-y-1 text-xs text-rose-950 leading-relaxed list-none pl-0">
                              {reasonLines.map((line, idx) => (
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
                    ) : null;
                  const rejectedSlotWrapClass = isRejected
                    ? 'relative before:pointer-events-none before:absolute before:left-0 before:top-2.5 before:bottom-1 before:w-0.5 before:rounded-full before:bg-rose-300/50 before:content-[""]'
                    : undefined;

                  let avatarCircleClass = accent.avatarBg;
                  let rowStripe = accent.rowStripe;
                  if (isRejected) {
                    rowStripe = 'border-l-[3px] border-l-rose-500 bg-rose-50/30';
                    avatarCircleClass = 'bg-rose-100 text-rose-800';
                  } else if (isPendingReview) {
                    rowStripe = 'border-l-[3px] border-l-orange-500 bg-orange-50/40';
                    avatarCircleClass = 'bg-orange-100 text-orange-900';
                  }

                  const filledStaffRow = (
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div
                        className={`h-11 w-11 shrink-0 overflow-hidden rounded-full ${avatarCircleClass} flex items-center justify-center text-xs font-medium`}
                      >
                        <img
                          src={getAvatarSrc(display.avatarUrl)}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR_SRC;
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {display.fullName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{display.email || '—'}</p>
                      </div>
                    </div>
                  );

                  if (!slotEditable) {
                    if (!filled) {
                      return (
                        <div key={a.AssignmentId} className={rejectedSlotWrapClass}>
                          <div className={`px-3 py-2.5 ${accent.approvedStripe}`}>
                            <div className="flex gap-3">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent.approvedLockBox}`}
                              >
                                <Lock className="h-4 w-4 opacity-90" strokeWidth={2} />
                              </div>
                              <div className="min-w-0 pt-0.5">
                                <p className="text-xs font-semibold text-slate-800">
                                  Phân công đã được duyệt
                                </p>
                                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                                  Vị trí này không thể chọn lại nhân sự.
                                </p>
                              </div>
                            </div>
                          </div>
                          {rejectionReasonBlock}
                        </div>
                      );
                    }
                    return (
                      <div key={a.AssignmentId} className={rejectedSlotWrapClass}>
                        <div
                          className={`flex min-h-[4.25rem] items-center justify-between gap-3 px-3 py-2.5 ${accent.approvedStripe}`}
                        >
                          <div className="pointer-events-none min-w-0 flex-1">{filledStaffRow}</div>
                          {showAssignmentStatusBadge ? (
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${assignmentStatusUi.className}`}
                            >
                              {assignmentStatusUi.label}
                            </span>
                          ) : null}
                        </div>
                        {rejectionReasonBlock}
                      </div>
                    );
                  }

                  if (!filled) {
                    return (
                      <div key={a.AssignmentId} className={rejectedSlotWrapClass}>
                        <Popover
                          trigger="click"
                          open={isOpen}
                          onOpenChange={(visible) => {
                            setStaffPickerAssignmentId(visible ? a.AssignmentId : null);
                            if (!visible) setHoveredStaff(null);
                          }}
                          placement="bottomLeft"
                          destroyOnHidden
                          content={pickerContent(a)}
                          styles={{ content: { padding: 12 } }}
                        >
                          <button
                            type="button"
                            className={`flex w-full min-h-[4.25rem] items-center gap-3 border-l-[3px] border-l-red-500 bg-rose-50/45 px-3 py-2.5 text-left transition-colors hover:bg-rose-50/60 ${
                              isRejected ? 'ring-1 ring-inset ring-rose-300' : ''
                            }`}
                          >
                            <span
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${accent.addCircle}`}
                            >
                              <Plus className="h-5 w-5 stroke-[2.5]" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900">Chưa có nhân sự</p>
                              <p className="text-xs text-slate-500">Phân công trống — {placeholder}</p>
                            </div>
                          </button>
                        </Popover>
                        {rejectionReasonBlock}
                      </div>
                    );
                  }

                  return (
                    <div key={a.AssignmentId} className={rejectedSlotWrapClass}>
                      <div
                        className={`flex min-h-[4.25rem] items-center justify-between gap-3 px-3 py-2.5 ${rowStripe}`}
                      >
                        <Popover
                          trigger="click"
                          open={isOpen}
                          onOpenChange={(visible) => {
                            setStaffPickerAssignmentId(visible ? a.AssignmentId : null);
                            if (!visible) setHoveredStaff(null);
                          }}
                          placement="bottomLeft"
                          destroyOnHidden
                          content={pickerContent(a)}
                          styles={{ content: { padding: 12 } }}
                        >
                          <button
                            type="button"
                            className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg py-0.5 text-left transition-colors ${accent.rowHover}`}
                          >
                            {filledStaffRow}
                          </button>
                        </Popover>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                          {showAssignmentStatusBadge ? (
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${assignmentStatusUi.className}`}
                            >
                              {assignmentStatusUi.label}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {rejectionReasonBlock}
                    </div>
                  );
                })}
                {cancelledSlots.map((ca) => {
                  const memberId = Number(ca.StaffMemberId ?? 0);
                  const display = getStaffDisplayForSlot(memberId, ca, []);
                  const cancelReason = ca.Reason?.trim() ?? '';
                  const cancelledStatusUi = getAssignmentStatusInfo(ca.Status);
                  return (
                    <div
                      key={ca.AssignmentId}
                      className="flex flex-col gap-2.5 border-l-[3px] border-l-red-500 bg-red-50/90 px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3 opacity-95 pointer-events-none">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-red-100 text-xs font-medium text-red-800">
                            <img
                              src={getAvatarSrc(display.avatarUrl)}
                              alt=""
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR_SRC;
                              }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {display.fullName}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{display.email || '—'}</p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold shrink-0 ${cancelledStatusUi.className}`}
                        >
                          {cancelledStatusUi.label}
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
                })}
                {lockedCount > 0
                  ? Array.from({ length: lockedCount }).map((_, idx) => (
                      <div
                        key={`${roleLabel}-locked-${idx}`}
                        className="flex min-h-[4.25rem] flex-col justify-center border-l-[3px] border-l-slate-300 bg-slate-50/80 px-3 py-2.5"
                      >
                        <p className="text-xs font-medium text-slate-600">Vị trí thuộc nhóm khác</p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Không khả dụng cho nhóm của bạn
                        </p>
                      </div>
                    ))
                  : null}
              </>
            )}
          </div>
        </div>
        {lockedCount > 0 ? (
          <p className="text-[11px] text-slate-500 px-0.5">
            {lockedCount} vị trí {roleLabel.toLowerCase()} thuộc {teamTextLocked} 
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col bg-slate-50 overflow-hidden py-0 px-0"
    >
      {loading && (
        <div className="fixed inset-0 bg-white/60 z-20 flex items-center justify-center">
                  <Spin tip="Đang tải dữ liệu phân công cho nhóm..." />
        </div>
      )}

      <div className="flex justify-start gap-3 mb-2 flex-wrap">
        <HoverSearch value={search} onChange={setSearch} placeholder="Tìm theo mã hoặc tên yêu cầu..." />
        <div className="flex items-center gap-3 flex-wrap">
          {tab === 'assigning' || tab === 'rejected' ? (
            <>
              <Select
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as 'all' | 'event' | 'subject' | 'course')}
              >
                <SelectTrigger className="h-9 w-[180px] max-w-[180px] shrink-0 text-gray-500 text-sm gap-2 bg-white border-slate-200">
                  <SelectValue placeholder="Loại yêu cầu" />
                </SelectTrigger>
                <SelectContent className="min-w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)]">
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  <SelectItem value="event">Sự kiện</SelectItem>
                  <SelectItem value="subject">Môn học</SelectItem>
                  <SelectItem value="course">Khóa học</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as TlRequestStatusFilter)}
              >
                <SelectTrigger className="h-9 w-[200px] max-w-[200px] shrink-0 text-gray-500 text-sm gap-2 bg-white border-slate-200">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent className="min-w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)]">
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="approved">{REQUEST_STATUS_LABEL[REQUEST_STATUS.APPROVED]}</SelectItem>
                  <SelectItem value="assigning">{REQUEST_STATUS_LABEL[REQUEST_STATUS.ASSIGNING]}</SelectItem>
                  <SelectItem value="published">{REQUEST_STATUS_LABEL[REQUEST_STATUS.PUBLISHED]}</SelectItem>
                </SelectContent>
              </Select>
            </>
          ) : null}

          <Button
            variant="outline"
            size="icon"
            className="shrink-0 bg-white border-slate-200 text-gray-600 hover:bg-gray-50"
            onClick={handleResetFilters}
          >
            <RotateCcw size={16} />
          </Button>

          {tab === 'assigning' ? (
            <div className="flex items-center space-x-2">
              <Switch
                className="!rounded-[15px]"
                checked={onlyNeedsAction}
                onCheckedChange={setOnlyNeedsAction}
              />
              <p className="text-black whitespace-nowrap">Chỉ hiện yêu cầu cần xử lý</p>
            </div>
          ) : null}
        </div>
      </div>

        <div className="flex gap-4 flex-1 min-h-0">
        {/* Sidebar */}
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
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 space-y-2 bg-slate-50">
            {filteredRequests.length === 0 && (
              <div className="p-4 text-sm text-gray-500">
                Chưa có yêu cầu nào có phiên của nhóm này.
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
                  setSelectedRequestId(r.requestId);
                  setActiveSession(null);
                }}
                hintText="Bấm để xem danh sách phiên"
              />
            ))}
          </div>
        </div>

        {/* Content — scroll một vùng giống tab Tổng quan manager (RequestDetail) */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-1">
          {!selectedRequest ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-sm text-gray-500">
              Chọn một yêu cầu ở danh sách bên trái để xem chi tiết và phân công.
            </div>
          ) : (
            <div className="space-y-4 flex flex-col min-h-0 flex-1">
              {/* Request header */}
              <div className="bg-white rounded-2xl px-6 py-5 shadow-sm border border-slate-200 mb-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h5 className="text-xl font-medium text-slate-800 truncate min-w-0 flex-1">
                    {selectedRequest.requestName || selectedRequest.requestCode}
                  </h5>
                  {/* <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      title="Sao chép mã"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      title="Chia sẻ"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 hover:border-slate-300"
                      title="Xem trong lịch"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                  </div> */}
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedRequestTypeInfo && (
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
                        {selectedRequestTypeInfo.label}
                      </span>
                    )}
                    {selectedRequest && (
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium border ${getTeamLeaderRequestStatusInfo(selectedRequest.status).className}`}
                      >
                        {getTeamLeaderRequestStatusInfo(selectedRequest.status).label}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-start gap-3">
                    <Hash className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] text-slate-500">Mã yêu cầu</p>
                      <p className="font-medium text-sm text-slate-900 mt-0.5">
                        {selectedRequest.requestCode}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] text-slate-500">Ngày gửi</p>
                      <p className="font-medium text-sm text-slate-900 mt-0.5">
                        {selectedRequest.startDate
                          ? dayjs(selectedRequest.startDate).format('DD/MM/YYYY')
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <List className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[11px] text-slate-500">Số lượng phiên</p>
                      <p className="font-medium text-sm text-slate-900 mt-0.5">
                        {requestSessionsLoading ? '—' : `${selectedRequest.sessions.length} phiên`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {requestSessionsLoading ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[280px] py-12">
                  <Spin tip="Đang tải danh sách phiên theo nhóm..." />
                </div>
              ) : (
                <>
              {/* Progress uses only sessions loaded via getById (when user opens a session) — ẩn trên tab phân công lại */}
              {tab !== 'rejected'
                ? (() => {
                    const sessions = selectedRequest.sessions;
                    let totalSlots = 0;
                    let filledSlots = 0;
                    let loadedSessionCount = 0;
                    sessions.forEach((s) => {
                      if (!sessionDetailsById[s.sessionId]) return;
                      loadedSessionCount += 1;
                      const stats = getSessionStats(s);
                      totalSlots += stats.total;
                      filledSlots += stats.filled;
                    });
                    const progress = totalSlots === 0 ? 0 : Math.min(1, filledSlots / totalSlots);
                    if (sessions.length > 0 && loadedSessionCount === 0) {
                      return (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-slate-700">Tiến độ phân công</span>
                          </div>
                          <p className="text-xs text-slate-500">
                            Mở một phiên học bên dưới để tải chi tiết và xem tiến độ theo vị trí của nhóm.
                          </p>
                        </div>
                      );
                    }
                    return (
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-slate-700">Tiến độ phân công</span>
                          <span className="text-sm font-medium text-slate-800 tabular-nums">
                            {filledSlots}/{totalSlots} vị trí
                            {loadedSessionCount < sessions.length ? (
                              <span className="text-[11px] font-normal text-slate-500 ml-1">
                                ({loadedSessionCount}/{sessions.length} phiên đã tải)
                              </span>
                            ) : null}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#2197C0] to-emerald-500 transition-all duration-300"
                            style={{ width: `${progress * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()
                : null}

              {/* Danh sách phiên học — layout đồng bộ RequestDetail (manager) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-medium text-slate-900">Danh sách phiên học</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {selectedRequest.sessions.length} phiên trong yêu cầu này
                  </p>
                </div>
                {selectedRequest.sessions.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    Yêu cầu này chưa có phiên nào gán cho nhóm.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedRequest.sessions.map((session) => {
                      const detailLoaded = Boolean(sessionDetailsById[session.sessionId]);
                      const stats = getSessionStats(session);
                      const sessionStatusInfo = getSessionStatusInfo(session.status);
                      const isActive = activeSession?.sessionId === session.sessionId;
                      const detail = sessionDetailsById[session.sessionId];
                      const title = getSessionDisplayTitleWithDetail(
                        session as RequestSessionSummary & { notes?: string | null },
                        detail,
                      );
                      const topicDescription = getSessionTopicDescription(session, detail);
                      const sessionSkills = collectSessionSkillsFromDetail(detail);
                      const location =
                        (detail?.Location != null && String(detail.Location).trim()
                          ? String(detail.Location)
                          : session.location) || '—';
                      const teamCount = countTeamsOnSession(detail);
                      const fullyAssigned =
                        detailLoaded && stats.total > 0 && stats.filled === stats.total;
                      const hasPendingCancelReassign = sessionHasPendingCancelReassign(detail, stats);
                      const secondaryBadge = getSessionListSecondaryBadge(
                        session,
                        detailLoaded,
                        stats,
                        hasPendingCancelReassign,
                      );
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
                          className={`w-full border border-slate-200 rounded-xl bg-white px-4 py-3 hover:border-slate-300 hover:bg-slate-50/60 transition cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-sky-200/70 focus:ring-offset-2 ${
                            isActive ? 'ring-2 ring-sky-300 border-sky-200 bg-sky-50/40' : ''
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="text-xs text-sky-700 font-medium tabular-nums">
                                <span className="text-slate-600 font-medium">
                                  {dayjs(session.startAt).format('DD/MM/YYYY')}
                                </span>
                                <span className="text-slate-300 font-normal mx-1">·</span>
                                {dayjs(session.startAt).format('HH:mm')} -{' '}
                                {dayjs(session.endAt).format('HH:mm')}
                              </span>
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${sessionStatusInfo.className}`}
                              >
                                {sessionStatusInfo.label}
                              </span>
                              {secondaryBadge ? (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${secondaryBadge.className}`}
                                >
                                  {secondaryBadge.showAlert && (
                                    <AlertCircle className="w-3 h-3 shrink-0" />
                                  )}
                                  {secondaryBadge.label}
                                </span>
                              ) : null}
                            </div>
                            <span
                              className="inline-flex items-center gap-0.5 text-xs font-medium text-sky-700 select-none"
                              aria-hidden
                            >
                              Chi tiết
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-medium text-slate-900 leading-snug line-clamp-2">
                            {title}
                          </p>
                          {topicDescription ? (
                            <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{topicDescription}</p>
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
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 flex-wrap">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{location}</span>
                            {fullyAssigned && teamCount > 0 ? (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-700 font-medium">{teamCount} đội</span>
                              </>
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
                <h2 className="text-lg font-medium text-slate-900 leading-snug">
                  {getSessionDisplayTitleWithDetail(
                    activeSession as RequestSessionSummary & { notes?: string | null },
                    sessionDetailsById[activeSession.sessionId],
                  )}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-xs font-medium text-[#2197C0]">
                    {dayjs(activeSession.startAt).format('DD/MM/YYYY')}
                  </span>
                  <span className="text-xs text-slate-300">·</span>
                  <span className="text-xs font-medium text-slate-700 tabular-nums">
                    {dayjs(activeSession.startAt).format('HH:mm')} - {dayjs(activeSession.endAt).format('HH:mm')}
                  </span>
                  {(() => {
                    const d = sessionDetailsById[activeSession.sessionId];
                    const eff = String(d?.Status ?? activeSession.status ?? '').trim();
                    const sessionInfo = getSessionStatusInfo(eff);
                    const sessionRejected = isSessionAssignmentRejectedStatus(eff);
                    return (
                      <>
                        {tab === 'rejected' && !sessionRejected ? (
                          <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-800">
                            Yêu cầu có phiên bị từ chối
                          </span>
                        ) : null}
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${sessionInfo.className}`}
                        >
                          {sessionInfo.label}
                        </span>
                        
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

            {/* Panel body: thông tin phiên trước, sau đó phân công */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-4 space-y-5">
              {(() => {
                const detail = sessionDetailsById[activeSession.sessionId];
                if (!detail) {
                  return (
                    <div className="flex items-center justify-center py-8">
                      <Spin tip="Đang tải chi tiết phiên..." />
                    </div>
                  );
                }

                const assignments = detail.Assignments ?? [];
                const {
                  editableTeacherSlots,
                  editableTaSlots,
                  lockedTeacherCount: lockedTeacherSlots,
                  lockedTaCount: lockedTaSlots,
                  cancelledTeacherSlots,
                  cancelledTaSlots,
                  teachersRequired,
                  tasRequired,
                } = partitionTeamLeaderAssignmentSlots(detail, currentTeamId);

                const teamSessionsRaw = detail.TeamSessions ?? [];

                const normalizedTeamSessions = teamSessionsRaw.map((ts) => ({
                  teamId: Number(ts.TeamId ?? 0),
                  teamName: String(ts.TeamName ?? ''),
                  teachersRequired: Math.max(0, Number(ts.TeachersRequired ?? 0) || 0),
                  tasRequired: Math.max(0, Number(ts.TasRequired ?? 0) || 0),
                }));

                const otherTeamSessions =
                  currentTeamId != null
                    ? normalizedTeamSessions.filter((ts) => ts.teamId > 0 && ts.teamId !== currentTeamId)
                    : normalizedTeamSessions;
                const otherTeamNames = Array.from(
                  new Set(
                    otherTeamSessions
                      .map((ts) => ts.teamName?.trim())
                      .filter((name): name is string => Boolean(name)),
                  ),
                );
                const progressStats = getSessionStats(activeSession);
                const progressTotal = progressStats.total;
                const progressFilled = progressStats.filled;
                const progressRatio =
                  progressTotal === 0 ? 0 : Math.min(1, progressFilled / progressTotal);

                const sessionInfoCard = (
                  <div className="rounded-xl bg-white shadow-sm border border-gray-100">
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <h3 className="font-medium text-gray-900 text-sm">Thông tin phiên</h3>
                    </div>
                    <div className="px-4 py-3 space-y-3 text-sm">
                      <div className="flex items-center gap-3 text-gray-600">
                        <Hash className="h-4 w-4 shrink-0 text-[#2197C0]" />
                        <span className="text-gray-500">Mã yêu cầu:</span>
                        <span className="font-medium text-[#2197C0]">
                          {selectedRequest?.requestCode}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600">
                        <Clock className="h-4 w-4 shrink-0 text-[#2197C0]" />
                        <span className="text-gray-500">Thời gian:</span>
                        <span className="font-medium text-black">
                          {dayjs(activeSession.startAt).format('HH:mm')} -{' '}
                          {dayjs(activeSession.endAt).format('HH:mm')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600">
                        <Calendar className="h-4 w-4 shrink-0 text-[#2197C0]" />
                        <span className="text-gray-500">Ngày:</span>
                        <span className="font-medium text-black">
                          {dayjs(activeSession.startAt).format('DD/MM/YYYY')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600">
                        <MapPin className="h-4 w-4 shrink-0 text-[#2197C0]" />
                        <span className="text-gray-500">Địa điểm:</span>
                        <span className="font-medium text-black">
                          {activeSession.location || '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600">
                        <GraduationCap className="h-4 w-4 shrink-0 text-[#2197C0]" />
                        <span className="text-gray-500">Giáo viên cần:</span>
                        <span className="font-medium text-black">
                          {teachersRequired}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600">
                        <Users className="h-4 w-4 shrink-0 text-[#2197C0]" />
                        <span className="text-gray-500">Trợ giảng cần:</span>
                        <span className="font-medium text-black">
                          {tasRequired}
                        </span>
                      </div>
                      {(lockedTeacherSlots > 0 || lockedTaSlots > 0) && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                          Phiên này cần phân công nhân sự thuộc nhóm khác, bạn chỉ phân công nhân sự thuộc nhóm của mình.
                        </div>
                      )}
                    </div>
                  </div>
                );

                const teamQuotaSlots = [...editableTeacherSlots, ...editableTaSlots];
                const cancelledTeacherMemberIds = cancelledTeacherSlots
                  .map((a) => Number(a.StaffMemberId ?? 0))
                  .filter((id) => id > 0);
                const cancelledTaMemberIds = cancelledTaSlots
                  .map((a) => Number(a.StaffMemberId ?? 0))
                  .filter((id) => id > 0);
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
                  <>
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
                              ? 'Các phân công dưới đây bị quản lý từ chối; vui lòng chọn lại nhân sự.'
                              : 'Xem lý do từ quản lý và kiểm tra phân công từng vai trò bên dưới.'}
                          </p>
                        </div>
                        {/* {requestReasonLines.length > 0 && (
                          <div className="px-4 py-3 border-b border-orange-100 bg-white/60">
                            <p className="text-xs font-medium text-orange-900 mb-1.5">
                              Lý do (yêu cầu)
                            </p>
                            <ul className="space-y-1 text-xs text-orange-950 leading-relaxed list-none pl-0">
                              {requestReasonLines.map((line, idx) => (
                                <li key={idx} className="pl-3 border-l-2 border-orange-300">
                                  {line}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )} */}
                        {teamRejectedAssignments.length === 0 && sessionRejectedUi && (
                          <p className="px-4 py-3 text-xs text-orange-800">
                            Phiên đang ở trạng thái từ chối phân công. Nếu không thấy dòng vị trí cụ thể,
                            hãy làm mới hoặc kiểm tra phân công từng giảng viên / trợ giảng phía dưới.
                          </p>
                        )}
                      </div>
                    )}

                    {assignments.length === 0 ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                        <AlertCircle className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                        <p className="text-xs text-amber-700 font-medium">
                          Phiên này chưa có vị trí phân công.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {renderSlotPicker(
                          activeSession.sessionId,
                          editableTeacherSlots,
                          teachersRequired,
                          'sky',
                          true,
                          cancelledTeacherMemberIds,
                          cancelledTeacherSlots,
                          lockedTeacherSlots,
                          otherTeamNames,
                        )}
                        {renderSlotPicker(
                          activeSession.sessionId,
                          editableTaSlots,
                          tasRequired,
                          'amber',
                          true,
                          cancelledTaMemberIds,
                          cancelledTaSlots,
                          lockedTaSlots,
                          otherTeamNames,
                        )}

                        {progressTotal > 0 && tab !== 'rejected' && (
                          <div className="pt-1 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-medium text-slate-700">
                              <span>Tiến độ phân công</span>
                              <span className="tabular-nums">
                                {progressFilled}/{progressTotal}
                              </span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-sky-500 transition-all duration-300"
                                style={{ width: `${progressRatio * 100}%` }}
                              />
                            </div>
                          </div>
                        )}

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

                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <div className="relative inline-flex group">
                        <button
                          type="button"
                          onClick={() => {
                            if (!canReportCannotAssign) {
                              message.info('Không đủ điều kiện gửi báo cáo phiên này.');
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
                          Hủy phiên
                        </button>
                        {!canReportCannotAssign ? (
                          <span className="pointer-events-none absolute left-0 bottom-full z-50 mb-1 hidden whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white shadow-md group-hover:block">
                            Không đủ điều kiện hủy
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
                </div>
              </div>
            )}

      <Dialog
        open={reportSessionOpen}
        onClose={() => !reportSessionLoading && setReportSessionOpen(false)}
        title="Hủy phiên"
        description="Nhập lý do để báo phiên cần bị hủy. Thao tác không thể hoàn tác."
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
          ? { label: 'Trợ giảng', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
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