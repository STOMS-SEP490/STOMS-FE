import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import { getRequestType } from '@/shared/components/request/RequestCard';
import { getRequestStatusLabel, getTeamLeaderRequestStatusInfo, isSessionAssignmentRejectedStatus } from '@/constants/status';
import { teamApi } from '@/modules/team/api/teamApi';
import type { AssignmentResponse } from '@/modules/request/session.types';
import type { SessionDetail, SuggestedStaff } from '@/modules/request/type';
import requestApi from '@/modules/request/api/requestApi';
import sessionApi from '@/modules/request/api/sessionApi';
import assignmentApi from '@/modules/request/api/assignmentApi';
import memberApi from '@/modules/request/api/memberApi';
import type { SessionTopicInfo } from '@/modules/request/request';
import type {
  AssignMemberPayload,
  RoleKey,
  SessionMap,
  TeamLeaderAssignmentsTab,
  TeamRequestItem,
  TeamSessionLite,
} from '@/modules/contract/hooks/type';
import { SESSION_STATUS } from '@/constants/status';

const ASSIGNABLE_STATUSES = ['PENDING', 'REJECTED'];

const normalizeStatus = (status?: string | number | null) => String(status ?? '').trim().toUpperCase();

/** Assignment đã hủy nhận (vd. bận) — không tính vào quota “team khác”; BE thường tạo assignment mới thay thế. */
export function isAssignmentCancelledStatus(status: string | number | null | undefined): boolean {
  if (status == null || status === '') return false;
  const n = Number(status);
  if (!Number.isNaN(n) && n === SESSION_STATUS.CANCELLED) return true;
  const compact = String(status).toUpperCase().replace(/[\s_-]/g, '');
  return compact === 'CANCELLED' || compact === 'CANCELED';
}

/** Chỉ PENDING / REJECTED team leader được đổi nhân sự; APPROVED (2) và Cancelled không. */
export function isTeamLeaderAssignmentEditableStatus(status?: string | number | null): boolean {
  if (isAssignmentCancelledStatus(status)) return false;
  const normalized = normalizeStatus(status);
  return (
    normalized === '1' ||
    normalized === '3' ||
    ASSIGNABLE_STATUSES.some((item) => normalized === item || normalized.includes(item))
  );
}

/** Local selection `0` means “gỡ chọn”, phải ghi đè staffMemberId từ API. */
export function getEffectiveStaffMemberId(
  assignmentId: number,
  selections: Record<number, number>,
  fallbackStaffMemberId?: number | null,
): number {
  if (Object.prototype.hasOwnProperty.call(selections, assignmentId)) {
    return selections[assignmentId];
  }
  return Number(fallbackStaffMemberId ?? 0);
}

export type TeamLeaderSlotPartition = {
  editableTeacherSlots: AssignmentResponse[];
  editableTaSlots: AssignmentResponse[];
  lockedTeacherCount: number;
  lockedTaCount: number;
  cancelledTeacherSlots: AssignmentResponse[];
  cancelledTaSlots: AssignmentResponse[];
  teachersRequired: number;
  tasRequired: number;
};

/**
 * Chia slot TE/TA: chỉ assignment **chưa Cancelled** mới tham gia slice quota vs “team khác”.
 * Assignment Cancelled vẫn trả về riêng để UI hiển thị “cần phân lại” / lịch sử hủy nhận.
 */
export function partitionTeamLeaderAssignmentSlots(
  detail: SessionDetail | undefined,
  currentTeamId: number | null,
): TeamLeaderSlotPartition {
  const assignments = detail?.Assignments ?? [];
  const teacherSlotsAll = assignments.filter((a) =>
    String(a.StaffRole ?? '')
      .toUpperCase()
      .includes('TE'),
  );
  const taSlotsAll = assignments.filter((a) =>
    String(a.StaffRole ?? '')
      .toUpperCase()
      .includes('TA'),
  );

  const teacherActive = teacherSlotsAll.filter((a) => !isAssignmentCancelledStatus(a.Status));
  const taActive = taSlotsAll.filter((a) => !isAssignmentCancelledStatus(a.Status));
  const cancelledTeacherSlots = teacherSlotsAll.filter((a) => isAssignmentCancelledStatus(a.Status));
  const cancelledTaSlots = taSlotsAll.filter((a) => isAssignmentCancelledStatus(a.Status));

  const teamSessionsRaw = detail?.TeamSessions ?? [];

  const normalizedTeamSessions = teamSessionsRaw.map((ts) => ({
    teamId: Number(ts.TeamId ?? 0),
    teachersRequired: Math.max(0, Number(ts.TeachersRequired ?? 0) || 0),
    tasRequired: Math.max(0, Number(ts.TasRequired ?? 0) || 0),
  }));

  const currentTeamSession =
    currentTeamId != null
      ? normalizedTeamSessions.find((ts) => ts.teamId === currentTeamId)
      : undefined;

  const teachersRequired = Math.max(
    0,
    Number(
      currentTeamSession?.teachersRequired ??
        detail?.TeachersRequired ??
        teacherSlotsAll.length,
    ) || 0,
  );
  const tasRequired = Math.max(
    0,
    Number(currentTeamSession?.tasRequired ?? detail?.TasRequired ?? taSlotsAll.length) || 0,
  );

  const editableTeacherSlots = teacherActive.slice(0, teachersRequired);
  const editableTaSlots = taActive.slice(0, tasRequired);
  const lockedTeacherCount = Math.max(0, teacherActive.length - teachersRequired);
  const lockedTaCount = Math.max(0, taActive.length - tasRequired);

  return {
    editableTeacherSlots,
    editableTaSlots,
    lockedTeacherCount,
    lockedTaCount,
    cancelledTeacherSlots,
    cancelledTaSlots,
    teachersRequired,
    tasRequired,
  };
}

/**
 * Chỉ tính slot mà team leader được phân công (quota team), không gồm slot “team khác”.
 */
export function computeTeamLeaderAssignableSlotStats(
  detail: SessionDetail | undefined,
  currentTeamId: number | null,
  assignSelections: Record<number, number>,
): { total: number; filled: number } {
  const { editableTeacherSlots, editableTaSlots } = partitionTeamLeaderAssignmentSlots(
    detail,
    currentTeamId,
  );
  const editable = [...editableTeacherSlots, ...editableTaSlots];

  const total = editable.length;
  const filled = editable.filter(
    (a) => getEffectiveStaffMemberId(a.AssignmentId, assignSelections, a.StaffMemberId) > 0,
  ).length;

  return { total, filled };
}

const getRoleKey = (staffRole?: string | null): RoleKey =>
  String(staffRole ?? '').toUpperCase().includes('TA') ? 'TA' : 'TE';

/** Chuẩn hóa SubjectSession/EventSession (Pascal hoặc camel) → SessionTopicInfo giống getSessionDisplayTitle. */
function mapTopicToSessionTopicInfo(raw: unknown): SessionTopicInfo | null {
  if (raw == null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const titleRaw = (o.title ?? o.Title) as string | null | undefined;
  const descRaw = (o.description ?? o.Description) as string | null | undefined;
  const durRaw = (o.duration ?? o.Duration) as string | null | undefined;
  const title = titleRaw?.trim() ? titleRaw.trim() : null;
  const description = descRaw?.trim() ? descRaw.trim() : null;
  const duration = durRaw != null && String(durRaw).trim() ? String(durRaw).trim() : null;
  if (!title && !description && !duration) return null;
  return { title, description, duration };
}

const mapSessionLite = (
  session: {
    sessionId?: number;
    sessionNo?: number;
    startAt?: string;
    endAt?: string;
    location?: string | null;
    status?: string;
    subjectSession?: unknown;
    eventSession?: unknown;
    SubjectSession?: unknown;
    EventSession?: unknown;
    notes?: string | null;
    Notes?: string | null;
  },
  requestId: number,
): TeamSessionLite => {
  const notes =
    session.notes != null && String(session.notes).trim()
      ? String(session.notes)
      : session.Notes != null && String(session.Notes).trim()
        ? String(session.Notes)
        : undefined;
  return {
    sessionId: Number(session.sessionId ?? 0),
    requestId,
    sessionNo: Number(session.sessionNo ?? 0),
    startAt: String(session.startAt ?? ''),
    endAt: String(session.endAt ?? ''),
    location: String(session.location ?? ''),
    status: String(session.status ?? ''),
    subjectSession: mapTopicToSessionTopicInfo(session.subjectSession ?? session.SubjectSession),
    eventSession: mapTopicToSessionTopicInfo(session.eventSession ?? session.EventSession),
    notes: notes ?? undefined,
  };
};

const mapFilteredSessionLite = (session: any, requestId: number): TeamSessionLite =>
  mapSessionLite(
    {
      sessionId: Number(session?.SessionId ?? session?.sessionId ?? 0),
      sessionNo: Number(session?.SessionNo ?? session?.sessionNo ?? 0),
      startAt: String(session?.StartAt ?? session?.startAt ?? ''),
      endAt: String(session?.EndAt ?? session?.endAt ?? ''),
      location: String(session?.Location ?? session?.location ?? ''),
      status: String(session?.Status ?? session?.status ?? ''),
      subjectSession: session?.SubjectSession ?? session?.subjectSession,
      eventSession: session?.EventSession ?? session?.eventSession,
      notes: session?.Notes ?? session?.notes,
    },
    requestId,
  );

const isRejectedTabRequest = (status?: string) => {
  const value = normalizeStatus(status);
  return value.includes('ASSIGNMENT_REJECTED') || value === '5' || value.includes('REJECTED') || value === '2';
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const fetchTeamId = async (memberId: number) => {
  try {
    const me = await memberApi.getById(memberId);
    if (me.teamId != null) return Number(me.teamId);
  } catch {}

  const teamsRes = await teamApi.getTeams({
    pageNumber: 1,
    pageSize: 20,
    leaderMemberId: memberId,
  });
  const firstTeam = teamsRes.items?.[0];
  return firstTeam?.teamId != null ? Number(firstTeam.teamId) : undefined;
};

const buildAssigningRequests = async (teamId: number): Promise<TeamRequestItem[]> => {
  const response = await requestApi.getRequests({
    teamId,
    assignmentStatuses: ['1'],
    pageNumber: 1,
    pageSize: 200,
  });

  return (response.items ?? []).map((request) => ({
    requestId: request.requestId,
    requestCode: request.requestCode,
    requestName: request.requestName,
    customerName: request.customerName,
    subjectId: request.subjectId,
    courseId: request.courseId,
    eventId: request.eventId,
    status: request.status,
    startDate: request.startDate,
    sessions: (request.sessions ?? []).map((session) => mapSessionLite(session, request.requestId)),
  }));
};

const buildRejectedRequests = async (teamId: number): Promise<TeamRequestItem[]> => {
  const response = await requestApi.getRequests({
    teamId,
    sessionStatuses: ['AssignmentRejected'],
    pageNumber: 1,
    pageSize: 200,
  });

  return (response.items ?? []).map((request) => ({
    requestId: request.requestId,
    requestCode: request.requestCode,
    requestName: request.requestName,
    customerName: request.customerName,
    subjectId: request.subjectId,
    courseId: request.courseId,
    eventId: request.eventId,
    // Keep the canonical request status from BE so the status pill stays consistent across roles (like PC).
    // Tab content (rejected) is determined by session assignment rejection, not by overriding request.status.
    status: request.status,
    reason: request.reason ?? null,
    startDate: request.startDate,
    sessions: (request.sessions ?? []).map((session) => mapSessionLite(session, request.requestId)),
  }));
};

export function useTeamLeaderAssignmentsPage(activeTab: TeamLeaderAssignmentsTab) {
  const [loading, setLoading] = useState(true);
  const [sendingAssignments, setSendingAssignments] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [applyingToOtherSessions, setApplyingToOtherSessions] = useState(false);
  const [requests, setRequests] = useState<TeamRequestItem[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [currentTeamId, setCurrentTeamId] = useState<number | null>(null);

  const [sessionDetailsById, setSessionDetailsById] = useState<Record<number, SessionDetail>>({});
  const [suggestedByAssignmentId, setSuggestedByAssignmentId] = useState<
    Record<number, SuggestedStaff[]>
  >({});
  const suggestStaffInFlightRef = useRef<Record<number, Promise<SuggestedStaff[]>>>({});

  const [search, setSearch] = useState('');
  const [onlyNeedsAction, setOnlyNeedsAction] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigning'>(
    activeTab === 'assigning' ? 'assigning' : 'all',
  );
  const [assignSelections, setAssignSelections] = useState<Record<number, number>>({});
  const [searchByAssignmentId, setSearchByAssignmentId] = useState<Record<number, string>>({});

  const assignSelectionsRef = useRef(assignSelections);
  useEffect(() => {
    assignSelectionsRef.current = assignSelections;
  }, [assignSelections]);

  /**
   * Optimistic selection rollback map.
   * - value = previous override staffMemberId
   * - null = previously had no override (fallback to server value)
   */
  const rollbackOverrideByAssignmentIdRef = useRef<Record<number, number | null>>({});

  const sessionDetailsByIdRef = useRef(sessionDetailsById);
  useEffect(() => {
    sessionDetailsByIdRef.current = sessionDetailsById;
  }, [sessionDetailsById]);

  const lastAutoAssignedStaffByAssignmentRef = useRef<Record<number, number>>({});
  const autoAssignInFlightPromiseBySessionIdRef = useRef<Record<number, Promise<void> | undefined>>({});
  const autoAssignDebounceTimeoutBySessionIdRef = useRef<Record<number, ReturnType<typeof setTimeout> | undefined>>(
    {},
  );
  const autoAssignCounterRef = useRef(0);
  const isApplyingRef = useRef(false);
  const completionEdgeByRequestIdRef = useRef<Record<number, boolean>>({});

  useEffect(() => {
    return () => {
      Object.values(autoAssignDebounceTimeoutBySessionIdRef.current).forEach((t) => {
        if (t) clearTimeout(t);
      });
    };
  }, []);

  const [activeSession, setActiveSession] = useState<TeamSessionLite | null>(null);

  const loadInitial = useCallback(async (tab: TeamLeaderAssignmentsTab) => {
    try {
      setLoading(true);
      const rawUser = JSON.parse(localStorage.getItem('user') || '{}') as { memberId?: number };
      const memberId = Number(rawUser?.memberId || 0) || undefined;
      if (!memberId) {
        setRequests([]);
        return;
      }

      const teamId = await fetchTeamId(memberId);

      if (!teamId) {
        setCurrentTeamId(null);
        setRequests([]);
        return;
      }
      setCurrentTeamId(teamId);

      const validRequests =
        tab === 'assigning'
          ? await buildAssigningRequests(teamId)
          : await buildRejectedRequests(teamId);

      setRequests(validRequests);
      if (validRequests.length) setSelectedRequestId(validRequests[0].requestId);
    } catch (err) {
      console.error(err);
      message.error('Không tải được dữ liệu phân công cho team.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitial(activeTab);
  }, [loadInitial, activeTab]);

  useEffect(() => {
    setStatusFilter(activeTab === 'assigning' ? 'assigning' : 'all');
    setOnlyNeedsAction(false);
    setActiveSession(null);
  }, [activeTab]);

  const getSessionStats = useCallback(
    (s: TeamSessionLite) => {
      const detail = sessionDetailsById[s.sessionId];
      const assignments = detail?.Assignments ?? [];
      const { total, filled } = computeTeamLeaderAssignableSlotStats(
        detail,
        currentTeamId,
        assignSelections,
      );
      return { total, filled, detail, assignments };
    },
    [sessionDetailsById, assignSelections, currentTeamId],
  );

  /** Mọi slot thuộc quota team đã có nhân sự (theo chi tiết phiên + lựa chọn local). */
  const isRequestTeamSlotsFullyAssigned = useCallback(
    (request: TeamRequestItem) => {
      const sessions = request.sessions ?? [];
      if (sessions.length === 0) return false;
      let hasSlots = false;
      for (const s of sessions) {
        const stats = getSessionStats(s);
        if (stats.total > 0) {
          hasSlots = true;
          if (stats.filled < stats.total) return false;
          continue;
        }

        const raw = String(s.status ?? '').trim();
        const normalized = raw.toUpperCase().replace(/[\s-]/g, '_');
        const statusCode = Number(raw);
        const isAssignedStatus =
          normalized === 'ASSIGNED' ||
          (!Number.isNaN(statusCode) && statusCode === SESSION_STATUS.ASSIGNED);

        if (!isAssignedStatus) return false;
        hasSlots = true;
      }
      return hasSlots;
    },
    [getSessionStats],
  );

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = !q
      ? requests
      : requests.filter(
          (r) =>
            r.requestCode.toLowerCase().includes(q) || (r.requestName ?? '').toLowerCase().includes(q),
        );

    const hasAssignmentRejectedSession = (r: TeamRequestItem) => {
      if (r.sessions?.length) {
        return r.sessions.some((s) => isSessionAssignmentRejectedStatus(s.status));
      }
      // Fallback: if sessions aren't present, keep old behavior using request.status.
      return isRejectedTabRequest(r.status);
    };

    // Tab assigning: dữ liệu đã lọc bởi BE (`assignmentStatuses: ['1']`). Không lọc thêm theo
    // `request.status` — ví dụ BE có thể trả Published (5) khi vẫn còn slot pending, trùng 12 vs 11.
    const tabFiltered =
      activeTab === 'rejected'
        ? base.filter((r) => hasAssignmentRejectedSession(r))
        : base;

    if (activeTab === 'assigning' && onlyNeedsAction) {
      return tabFiltered.filter((r) => !isRequestTeamSlotsFullyAssigned(r));
    }

    return tabFiltered;
  }, [
    requests,
    search,
    onlyNeedsAction,
    activeTab,
    isRequestTeamSlotsFullyAssigned,
  ]);

  const selectedRequest = useMemo(
    () => requests.find((r) => r.requestId === selectedRequestId) ?? null,
    [requests, selectedRequestId],
  );

  useEffect(() => {
    if (!filteredRequests.length) {
      setSelectedRequestId(null);
      return;
    }
    setSelectedRequestId((prev) => {
      if (prev == null) return filteredRequests[0].requestId;
      if (filteredRequests.some((r) => r.requestId === prev)) return prev;
      return filteredRequests[0].requestId;
    });
  }, [filteredRequests]);

  const selectedRequestTypeInfo = useMemo(() => {
    if (!selectedRequest) return null;
    return getRequestType({
      subjectId: selectedRequest.subjectId,
      courseId: selectedRequest.courseId,
      eventId: selectedRequest.eventId,
    });
  }, [selectedRequest]);

  const selectedRequestStatusInfo = useMemo(() => {
    if (!selectedRequest?.status) return null;
    return getTeamLeaderRequestStatusInfo(selectedRequest.status);
  }, [selectedRequest]);

  const handleSendAssignments = useCallback(async () => {
    if (!selectedRequest) return;

    const sessionIds = selectedRequest.sessions.map((s) => s.sessionId).filter((id) => id > 0);
    if (!sessionIds.length) {
      message.warning('Không có phiên để gửi phân công.');
      return;
    }

    try {
      setSendingAssignments(true);

      const pairs = await Promise.all(
        sessionIds.map(async (sid) => {
          const cached = sessionDetailsById[sid];
          if (cached) return [sid, cached] as const;
          const d = await sessionApi.getById(sid);
          return [sid, d] as const;
        }),
      );

      let totalItems = 0;

      for (const [, detail] of pairs) {
        const assignments = detail.Assignments ?? [];
        const itemsForSession: AssignMemberPayload[] = [];

        for (const a of assignments) {
          if (!isTeamLeaderAssignmentEditableStatus(a.Status)) continue;

          const staffMemberId = getEffectiveStaffMemberId(
            a.AssignmentId,
            assignSelections,
            a.StaffMemberId,
          );
          if (staffMemberId > 0) {
            itemsForSession.push({ assignmentId: a.AssignmentId, staffMemberId });
          }
        }

        if (itemsForSession.length) {
          totalItems += itemsForSession.length;
          await assignmentApi.assignMembers(itemsForSession);
        }
      }

      if (!totalItems) {
        message.warning('Vui lòng chọn nhân sự cho ít nhất một assignment.');
        return;
      }
      message.success('Đã gửi phân công.');

      await loadInitial(activeTab);
      setActiveSession(null);
    } catch (err) {
      message.error(getErrorMessage(err, 'Gửi phân công thất bại.'));
    } finally {
      setSendingAssignments(false);
    }
  }, [
    selectedRequest,
    sessionDetailsById,
    assignSelections,
    sessionApi,
    assignmentApi,
    loadInitial,
    activeTab,
  ]);

  const refreshSessionInRequestState = useCallback((detail: SessionDetail) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.requestId !== detail.RequestId) return r;
        return {
          ...r,
          sessions: r.sessions.map((s) => {
            if (s.sessionId !== detail.SessionId) return s;
            return {
              ...s,
              status: String(detail.Status ?? ''),
              startAt: detail.StartAt,
              endAt: detail.EndAt,
              location: detail.Location ?? '',
              subjectSession: mapTopicToSessionTopicInfo(detail.SubjectSession) ?? s.subjectSession,
              eventSession: mapTopicToSessionTopicInfo(detail.EventSession) ?? s.eventSession,
              notes: (() => {
                const fromDetail = String(detail.Notes ?? '').trim();
                if (fromDetail) return fromDetail;
                const prev = String(s.notes ?? '').trim();
                return prev || undefined;
              })(),
            };
          }),
        };
      }),
    );
  }, []);

  const ensureSessionDetails = useCallback(
    async (sessionIds: number[]) => {
      const missing = sessionIds.filter((id) => !sessionDetailsById[id]);
      if (!missing.length) return;
      try {
        const details = await Promise.all(
          missing.map(async (id) => {
            try {
              const s = await sessionApi.getById(id);
              return [id, s] as const;
            } catch {
              return null;
            }
          }),
        );

        const next: SessionMap = {};
        details.forEach((p) => {
          if (!p) return;
          next[p[0]] = p[1];
        });

        if (Object.keys(next).length) {
          setSessionDetailsById((prev) => ({ ...prev, ...next }));
        }
      } catch (err) {
        console.error(err);
        message.error('Không tải được chi tiết phiên.');
      }
    },
    [sessionDetailsById],
  );

  useEffect(() => {
    if (!selectedRequest?.sessions?.length) return;
    const ids = selectedRequest.sessions.map((s) => s.sessionId).filter((id) => id > 0);
    if (!ids.length) return;
    void ensureSessionDetails(ids);
  }, [selectedRequest, ensureSessionDetails]);

  const ensureSuggestedStaffForAssignments = useCallback(
    async (
      assignmentIds: number[],
      options: {
        forceRefetch?: boolean;
      } = {},
    ): Promise<Record<number, SuggestedStaff[]>> => {
      const unique = Array.from(new Set(assignmentIds)).filter((id) => id > 0);
      if (!unique.length) return {};

      const result: Record<number, SuggestedStaff[]> = {};
      const pairsToAwait: Array<readonly [number, Promise<SuggestedStaff[]>]> = [];

      for (const aid of unique) {
        const cached = suggestedByAssignmentId[aid];
        if (!options.forceRefetch && Array.isArray(cached)) {
          result[aid] = cached;
          continue;
        }

        if (!options.forceRefetch) {
          const inFlight = suggestStaffInFlightRef.current[aid];
          if (inFlight) {
            pairsToAwait.push([aid, inFlight]);
            continue;
          }
        }

        const p = assignmentApi
          .suggestStaff(aid)
          .catch(() => [] as SuggestedStaff[])
          .finally(() => {
            delete suggestStaffInFlightRef.current[aid];
          });

        suggestStaffInFlightRef.current[aid] = p;
        pairsToAwait.push([aid, p]);
      }

      if (!pairsToAwait.length) return result;

      const fetchedPairs = await Promise.all(
        pairsToAwait.map(async ([aid, p]) => [aid, await p] as const),
      );

      const fetchedMap: Record<number, SuggestedStaff[]> = {};
      fetchedPairs.forEach(([aid, list]) => {
        fetchedMap[aid] = list;
        result[aid] = list;
      });

      if (Object.keys(fetchedMap).length) {
        setSuggestedByAssignmentId((prev) => ({ ...prev, ...fetchedMap }));
      }

      return result;
    },
    [suggestedByAssignmentId],
  );

  useEffect(() => {
    if (!selectedRequestId) return;
    if (activeTab === 'assigning' && currentTeamId == null) return;

    let cancelled = false;

    const syncRequestSessionsByTeam = async () => {
      try {
        const response = await sessionApi.getFilter(
          activeTab === 'assigning'
            ? {
                RequestId: selectedRequestId,
                TeamId: currentTeamId!,
                PageNumber: 1,
                PageSize: 500,
              }
            : {
                RequestId: selectedRequestId,
                PageNumber: 1,
                PageSize: 500,
              },
        );
        const rawItems = response.Items ?? [];
        const mapped = rawItems
          .map((session) => mapFilteredSessionLite(session, selectedRequestId))
          .filter((session) => session.sessionId > 0)
          .sort((a, b) => (a.sessionNo ?? 0) - (b.sessionNo ?? 0));

        if (cancelled) return;

        setSessionDetailsById((prev) => {
          const next = { ...prev };
          for (const raw of rawItems) {
            const sid = Number(raw.SessionId ?? 0);
            if (sid > 0) next[sid] = raw;
          }
          return next;
        });

        setRequests((prev) =>
          prev.map((item) =>
            item.requestId !== selectedRequestId
              ? item
              : {
                  ...item,
                  sessions: mapped,
                },
          ),
        );

        setActiveSession((prev) =>
          prev && !mapped.some((session) => session.sessionId === prev.sessionId) ? null : prev,
        );
      } catch (err) {
        console.error(err);
      }
    };

    void syncRequestSessionsByTeam();

    return () => {
      cancelled = true;
    };
  }, [selectedRequestId, currentTeamId, activeTab]);

  useEffect(() => {
    if (!activeSession) return;
    const id = activeSession.sessionId;
    if (id > 0) void ensureSessionDetails([id]);
  }, [activeSession, ensureSessionDetails]);

  const flushAutoAssignSession = useCallback(
    async (sessionId: number) => {
      const existingT = autoAssignDebounceTimeoutBySessionIdRef.current[sessionId];
      if (existingT) {
        clearTimeout(existingT);
        delete autoAssignDebounceTimeoutBySessionIdRef.current[sessionId];
      }

      const inFlight = autoAssignInFlightPromiseBySessionIdRef.current[sessionId];
      if (inFlight) return inFlight;

      autoAssignInFlightPromiseBySessionIdRef.current[sessionId] = (async () => {
        autoAssignCounterRef.current += 1;
        if (autoAssignCounterRef.current === 1) setAutoAssigning(true);

        let itemsForSession: AssignMemberPayload[] = [];
        try {
          const detailFromState = sessionDetailsByIdRef.current[sessionId];
          const detail = detailFromState ?? (await sessionApi.getById(sessionId));

          if (!detailFromState) {
            setSessionDetailsById((prev) => ({ ...prev, [sessionId]: detail }));
            refreshSessionInRequestState(detail);
          }

          const assignments = detail.Assignments ?? [];
          const selectionsNow = assignSelectionsRef.current;

          itemsForSession = [];
          for (const a of assignments) {
            if (!a?.AssignmentId) continue;
            if (!isTeamLeaderAssignmentEditableStatus(a.Status)) continue;

            const chosenStaffId = getEffectiveStaffMemberId(
              a.AssignmentId,
              selectionsNow,
              a.StaffMemberId,
            );
            if (chosenStaffId <= 0) continue;

            if (lastAutoAssignedStaffByAssignmentRef.current[a.AssignmentId] === chosenStaffId) continue;

            itemsForSession.push({ assignmentId: a.AssignmentId, staffMemberId: chosenStaffId });
          }

          if (!itemsForSession.length) return;

          await assignmentApi.assignMembers(itemsForSession);
          itemsForSession.forEach((it) => {
            lastAutoAssignedStaffByAssignmentRef.current[it.assignmentId] = it.staffMemberId;
          });
          // Clear rollback markers for succeeded assignments
          itemsForSession.forEach((it: AssignMemberPayload) => {
            delete rollbackOverrideByAssignmentIdRef.current[it.assignmentId];
          });

          const refreshed = await sessionApi.getById(sessionId);
          setSessionDetailsById((prev) => ({ ...prev, [sessionId]: refreshed }));
          refreshSessionInRequestState(refreshed);
        } catch (err) {
          // Rollback optimistic selections for assignments we tried to persist
          const rollbackEntries = rollbackOverrideByAssignmentIdRef.current;
          const toRollback = itemsForSession
            .map((it) => it.assignmentId)
            .filter((aid) => Object.prototype.hasOwnProperty.call(rollbackEntries, aid));
          if (toRollback.length) {
            setAssignSelections((prev) => {
              const next = { ...prev };
              for (const aid of toRollback) {
                const prevOverride = rollbackEntries[aid];
                if (prevOverride == null) delete next[aid];
                else next[aid] = prevOverride;
                delete rollbackEntries[aid];
              }
              return next;
            });
          }

          // Auto-assign chạy theo debounce khi chọn staff; nếu lỗi mà không toast sẽ rất khó nhận ra.
          // Khi đang "Apply to other sessions", caller đã có toast riêng, tránh báo trùng.
          if (!isApplyingRef.current) {
            message.error(getErrorMessage(err, 'Phân công thất bại.'));
          }
          throw err;
        } finally {
          autoAssignCounterRef.current -= 1;
          if (autoAssignCounterRef.current === 0) setAutoAssigning(false);
          autoAssignInFlightPromiseBySessionIdRef.current[sessionId] = undefined;
        }
      })();

      return autoAssignInFlightPromiseBySessionIdRef.current[sessionId];
    },
    [
      assignmentApi,
      refreshSessionInRequestState,
      sessionApi,
      autoAssignCounterRef,
      setAutoAssigning,
    ],
  );

  const handleSelectStaff = useCallback(
    (sessionId: number, assignmentId: number, memberId: number) => {
      const detail = sessionDetailsByIdRef.current[sessionId];
      const row = detail?.Assignments?.find((x) => x.AssignmentId === assignmentId);
      if (row != null && !isTeamLeaderAssignmentEditableStatus(row.Status)) return;

      // Store previous override for rollback (optimistic UI)
      const prevOverride = assignSelectionsRef.current[assignmentId];
      rollbackOverrideByAssignmentIdRef.current[assignmentId] = prevOverride === undefined ? null : prevOverride;
      setAssignSelections((prev) => ({ ...prev, [assignmentId]: memberId }));

      if (isApplyingRef.current) return;

      if (memberId <= 0) return;

      const existingT = autoAssignDebounceTimeoutBySessionIdRef.current[sessionId];
      if (existingT) clearTimeout(existingT);

      autoAssignDebounceTimeoutBySessionIdRef.current[sessionId] = setTimeout(() => {
        void flushAutoAssignSession(sessionId);
      }, 600);
    },
    [flushAutoAssignSession],
  );

  const handleApplyToOtherSessions = useCallback(
    async (sessionId: number) => {
      if (!selectedRequest) return;

      setApplyingToOtherSessions(true);
      isApplyingRef.current = true;

      try {
        await flushAutoAssignSession(sessionId);

        const baseDetail =
          sessionDetailsByIdRef.current[sessionId] ?? (await sessionApi.getById(sessionId));
        if (!baseDetail?.Assignments?.length) {
          message.warning('Phiên hiện tại chưa có slot phân công.');
          return;
        }

        const baseSelectedByRole: Record<RoleKey, number[]> = { TE: [], TA: [] };
        for (const a of baseDetail.Assignments ?? []) {
          const mid = getEffectiveStaffMemberId(
            a.AssignmentId,
            assignSelectionsRef.current,
            a.StaffMemberId,
          );
          if (mid <= 0) continue;

          const roleKey = getRoleKey(a.StaffRole);
          if (!baseSelectedByRole[roleKey].includes(mid)) baseSelectedByRole[roleKey].push(mid);
        }

        if (!Object.keys(baseSelectedByRole).length) {
          message.warning('Vui lòng chọn ít nhất một nhân sự trong phiên hiện tại trước.');
          return;
        }

        const otherSessions = selectedRequest.sessions
          .filter((s) => s.sessionId !== sessionId)
          .sort((a, b) => (a.sessionNo ?? 0) - (b.sessionNo ?? 0));

        for (const s of otherSessions) {
          const otherSessionId = s.sessionId;
          if (!otherSessionId) continue;

          const existingDetail = sessionDetailsByIdRef.current[otherSessionId];
          const detail = existingDetail ?? (await sessionApi.getById(otherSessionId));
          if (!existingDetail) {
            setSessionDetailsById((prev) => ({ ...prev, [otherSessionId]: detail }));
            refreshSessionInRequestState(detail);
          }

          const assignments = detail?.Assignments ?? [];
          if (!assignments.length) continue;

          const assignmentIds = assignments
            .filter((a) => a?.AssignmentId && isTeamLeaderAssignmentEditableStatus(a.Status))
            .map((a) => a?.AssignmentId)
            .filter((x): x is number => typeof x === 'number' && x > 0);
          if (!assignmentIds.length) continue;

          const fetchedSuggestions = await ensureSuggestedStaffForAssignments(assignmentIds, { forceRefetch: true });

          const usedPerRole: Record<RoleKey, number[]> = { TE: [], TA: [] };
          const sessionNextSelections: Record<number, number> = {};
          const itemsForSession: AssignMemberPayload[] = [];

          for (const a of assignments) {
            if (!a?.AssignmentId) continue;
            if (!isTeamLeaderAssignmentEditableStatus(a.Status)) continue;

            const roleKey = getRoleKey(a.StaffRole);
            const candidates = baseSelectedByRole[roleKey] ?? [];
            if (!candidates.length) continue;

            const suggestionList = fetchedSuggestions[a.AssignmentId] ?? [];
            const usedForRole = usedPerRole[roleKey] ?? [];

            const memberToApply = candidates.find(
              (id) =>
                !usedForRole.includes(id) && suggestionList.some((m) => m.memberId === id),
            );

            if (!memberToApply) continue;

            sessionNextSelections[a.AssignmentId] = memberToApply;
            itemsForSession.push({ assignmentId: a.AssignmentId, staffMemberId: memberToApply });
            usedPerRole[roleKey] = [...usedForRole, memberToApply];
          }

          if (!itemsForSession.length) continue;

          setAssignSelections((prev) => ({ ...prev, ...sessionNextSelections }));
          await assignmentApi.assignMembers(itemsForSession);
          itemsForSession.forEach((it) => {
            lastAutoAssignedStaffByAssignmentRef.current[it.assignmentId] = it.staffMemberId;
          });

          const refreshed = await sessionApi.getById(otherSessionId);
          setSessionDetailsById((prev) => ({ ...prev, [otherSessionId]: refreshed }));
          refreshSessionInRequestState(refreshed);
        }

        message.success('Đã áp dụng phân công từ phiên hiện tại cho các phiên khác.');
      } catch (err) {
        message.error(getErrorMessage(err, 'Áp dụng phân công thất bại.'));
      } finally {
        isApplyingRef.current = false;
        setApplyingToOtherSessions(false);
      }
    },
    [
      ensureSuggestedStaffForAssignments,
      flushAutoAssignSession,
      assignmentApi,
      refreshSessionInRequestState,
      sessionApi,
      selectedRequest,
    ],
  );

  const handleResetFilters = () => {
    setSearch('');
    setOnlyNeedsAction(false);
    setStatusFilter(activeTab === 'assigning' ? 'assigning' : 'all');
  };

  const refetchRequestById = useCallback(async (requestId: number) => {
    if (!requestId || requestId <= 0) return;
    try {
      const request = await requestApi.getById(requestId);
      setRequests((prev) =>
        prev.map((item) =>
          item.requestId !== requestId
            ? item
            : {
                ...item,
                requestCode: request.requestCode,
                requestName: request.requestName,
                customerName: request.customerName,
                subjectId: request.subjectId,
                courseId: request.courseId,
                eventId: request.eventId,
                status: request.status,
                startDate: request.startDate,
                sessions: (request.sessions ?? []).map((session) => mapSessionLite(session, requestId)),
              },
        ),
      );
    } catch (err) {
      message.error(getErrorMessage(err, 'Không thể làm mới thông tin yêu cầu.'));
    }
  }, []);

  useEffect(() => {
    if (!selectedRequest) return;
    const requestId = selectedRequest.requestId;
    const isAssigning = getRequestStatusLabel(selectedRequest.status) === 'Đang phân công';
    const isFullyAssigned = isRequestTeamSlotsFullyAssigned(selectedRequest);
    const wasFullyAssigned = completionEdgeByRequestIdRef.current[requestId] ?? false;

    if (!isAssigning || !isFullyAssigned) {
      completionEdgeByRequestIdRef.current[requestId] = false;
      return;
    }
    if (wasFullyAssigned) return;

    completionEdgeByRequestIdRef.current[requestId] = true;
    void refetchRequestById(requestId);
  }, [selectedRequest, isRequestTeamSlotsFullyAssigned, refetchRequestById]);

  return {
    loading,
    sendingAssignments,
    autoAssigning,
    applyingToOtherSessions,
    requests,
    filteredRequests,
    selectedRequestId,
    setSelectedRequestId,
    currentTeamId,
    selectedRequest,
    selectedRequestTypeInfo,
    selectedRequestStatusInfo,
    search,
    setSearch,
    activeTab,
    onlyNeedsAction,
    setOnlyNeedsAction,
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
    handleApplyToOtherSessions,
    handleSendAssignments,
    refetchRequestById,
    getSessionStats,
    handleResetFilters,
  };
}

