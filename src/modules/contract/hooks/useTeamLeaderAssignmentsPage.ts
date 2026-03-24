import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import { getRequestType } from '@/shared/components/request/RequestCard';
import { getTeamLeaderRequestStatusInfo } from '@/constants/status';
import { teamApi } from '@/modules/team/api/teamApi';
import type { SessionDetail, SuggestedStaff } from '@/modules/request/api/type';
import requestApi from '@/modules/request/api/requestApi';
import sessionApi from '@/modules/request/api/sessionApi';
import assignmentApi from '@/modules/request/api/assignmentApi';
import memberApi from '@/modules/request/api/memberApi';
import type {
  AssignMemberPayload,
  RoleKey,
  SessionMap,
  TeamLeaderAssignmentsTab,
  TeamRequestItem,
  TeamSessionLite,
} from '@/modules/contract/hooks/type';

const ASSIGNABLE_STATUSES = ['PENDING', 'REJECTED'];

const normalizeStatus = (status?: string | number | null) => String(status ?? '').trim().toUpperCase();

const isAssignableStatus = (status?: string | number | null) => {
  const normalized = normalizeStatus(status);
  return (
    normalized === '1' ||
    normalized === '3' ||
    ASSIGNABLE_STATUSES.some((item) => normalized === item || normalized.includes(item))
  );
};

const getRoleKey = (staffRole?: string | null): RoleKey =>
  String(staffRole ?? '').toUpperCase().includes('TA') ? 'TA' : 'TE';

const mapSessionLite = (
  session: { sessionId?: number; sessionNo?: number; startAt?: string; endAt?: string; location?: string | null; status?: string },
  requestId: number,
): TeamSessionLite => ({
  sessionId: Number(session.sessionId ?? 0),
  requestId,
  sessionNo: Number(session.sessionNo ?? 0),
  startAt: String(session.startAt ?? ''),
  endAt: String(session.endAt ?? ''),
  location: String(session.location ?? ''),
  status: String(session.status ?? ''),
});

const isAssigningTabRequest = (status?: string) => {
  const value = normalizeStatus(status);
  return value.includes('APPROVED') || value.includes('ASSIGNING') || value === '3' || value === '4';
};

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

const buildAssigningRequests = async (
  teamId: number,
  needsActionOnly: boolean,
): Promise<TeamRequestItem[]> => {
  const statuses = needsActionOnly ? ['APPROVED'] : ['ASSIGNING', 'APPROVED'];
  const response = await requestApi.getRequests({
    teamId,
    statuses,
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
  const rejectedSessionsRes = await sessionApi.getFilter({
    teamId,
    statuses: ['ASSIGNMENT_REJECTED'],
    pageNumber: 1,
    pageSize: 500,
  });

  const rejectedSessions = (rejectedSessionsRes.items ?? []).filter(
    (session) => Number(session.sessionId) > 0 && Number(session.requestId) > 0,
  );
  const requestIds = Array.from(new Set(rejectedSessions.map((session) => Number(session.requestId))));
  const validRequestIds = requestIds.filter((id) => id > 0);

  const detailPairs = await Promise.all(
    validRequestIds.map(async (requestId) => {
      try {
        const request = await requestApi.getById(requestId);
        return [requestId, request] as const;
      } catch {
        return null;
      }
    }),
  );

  const requestById = detailPairs.reduce<Record<number, Awaited<ReturnType<typeof requestApi.getById>>>>(
    (acc, pair) => {
      if (!pair) return acc;
      const [requestId, request] = pair;
      acc[requestId] = request;
      return acc;
    },
    {},
  );

  const groupedByRequest = rejectedSessions.reduce<Record<number, TeamSessionLite[]>>((acc, session) => {
    const requestId = Number(session.requestId);
    if (!requestId) return acc;
    if (!acc[requestId]) acc[requestId] = [];
    acc[requestId].push(mapSessionLite(session, requestId));
    return acc;
  }, {});

  return Object.entries(groupedByRequest).map(([requestIdRaw, sessions]) => {
    const requestId = Number(requestIdRaw);
    const request = requestById[requestId];
    return {
      requestId,
      requestCode: request?.requestCode ?? `REQ-${requestId}`,
      requestName: request?.requestName ?? `Yêu cầu #${requestId}`,
      customerName: request?.customerName ?? null,
      subjectId: request?.subjectId ?? null,
      courseId: request?.courseId ?? null,
      eventId: request?.eventId ?? null,
      status: 'ASSIGNMENT_REJECTED',
      startDate: request?.startDate,
      sessions: sessions.sort((a, b) => (a.sessionNo ?? 0) - (b.sessionNo ?? 0)),
    };
  });
};

export function useTeamLeaderAssignmentsPage(activeTab: TeamLeaderAssignmentsTab) {
  const [loading, setLoading] = useState(true);
  const [sendingAssignments, setSendingAssignments] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [applyingToOtherSessions, setApplyingToOtherSessions] = useState(false);
  const [requests, setRequests] = useState<TeamRequestItem[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);

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

  useEffect(() => {
    return () => {
      Object.values(autoAssignDebounceTimeoutBySessionIdRef.current).forEach((t) => {
        if (t) clearTimeout(t);
      });
    };
  }, []);

  const [activeSession, setActiveSession] = useState<TeamSessionLite | null>(null);

  const loadInitial = useCallback(async (tab: TeamLeaderAssignmentsTab, needsActionOnly: boolean) => {
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
        setRequests([]);
        return;
      }

      const validRequests =
        tab === 'assigning'
          ? await buildAssigningRequests(teamId, needsActionOnly)
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
    void loadInitial(activeTab, onlyNeedsAction);
  }, [loadInitial, activeTab, onlyNeedsAction]);

  useEffect(() => {
    setStatusFilter(activeTab === 'assigning' ? 'assigning' : 'all');
    setOnlyNeedsAction(false);
    setActiveSession(null);
  }, [activeTab]);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = !q
      ? requests
      : requests.filter(
          (r) =>
            r.requestCode.toLowerCase().includes(q) || (r.requestName ?? '').toLowerCase().includes(q),
        );

    const tabFiltered =
      activeTab === 'rejected'
        ? base.filter((r) => isRejectedTabRequest(r.status))
        : base.filter((r) => isAssigningTabRequest(r.status));

    if (activeTab === 'assigning' && onlyNeedsAction) {
      return tabFiltered;
    }

    return tabFiltered;
  }, [requests, search, onlyNeedsAction, activeTab]);

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
        const assignments = detail.assignments ?? [];
        const itemsForSession: AssignMemberPayload[] = [];

        for (const a of assignments) {
          if (!isAssignableStatus(a.status)) continue;

          const staffMemberId = assignSelections[a.assignmentId] ?? (a.staffMemberId ?? 0);
          if (staffMemberId > 0) {
            itemsForSession.push({ assignmentId: a.assignmentId, staffMemberId });
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

      await loadInitial(activeTab, onlyNeedsAction);
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
    onlyNeedsAction,
    activeTab,
  ]);

  const refreshSessionInRequestState = useCallback((detail: SessionDetail) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.requestId !== detail.requestId) return r;
        return {
          ...r,
          sessions: r.sessions.map((s) => {
            if (s.sessionId !== detail.sessionId) return s;
            return {
              ...s,
              status: String(detail.status ?? ''),
              startAt: detail.startAt,
              endAt: detail.endAt,
              location: detail.location ?? '',
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
          .catch((err) => {
            console.error(err);
            return [] as SuggestedStaff[];
          })
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
    if (!selectedRequest) return;
    const ids = selectedRequest.sessions.map((s) => s.sessionId).filter((id) => id > 0);
    if (ids.length) {
      void ensureSessionDetails(ids);
    }
  }, [selectedRequest, ensureSessionDetails]);

  useEffect(() => {
    if (!activeSession) return;
    const detail = sessionDetailsById[activeSession.sessionId];
    const assignments = detail?.assignments ?? [];
    const assignmentIds = assignments
      .map((a) => a?.assignmentId)
      .filter((x): x is number => typeof x === 'number' && x > 0);
    void ensureSuggestedStaffForAssignments(assignmentIds);
  }, [activeSession, sessionDetailsById, ensureSuggestedStaffForAssignments]);

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

        try {
          const detailFromState = sessionDetailsByIdRef.current[sessionId];
          const detail = detailFromState ?? (await sessionApi.getById(sessionId));

          if (!detailFromState) {
            setSessionDetailsById((prev) => ({ ...prev, [sessionId]: detail }));
            refreshSessionInRequestState(detail);
          }

          const assignments = detail.assignments ?? [];
          const selectionsNow = assignSelectionsRef.current;

          const itemsForSession: AssignMemberPayload[] = [];
          for (const a of assignments) {
            if (!a?.assignmentId) continue;
            if (!isAssignableStatus(a.status)) continue;

            const chosenStaffId = selectionsNow[a.assignmentId] ?? (a.staffMemberId ?? 0);
            if (chosenStaffId <= 0) continue;

            if (lastAutoAssignedStaffByAssignmentRef.current[a.assignmentId] === chosenStaffId) continue;

            itemsForSession.push({ assignmentId: a.assignmentId, staffMemberId: chosenStaffId });
          }

          if (!itemsForSession.length) return;

          await assignmentApi.assignMembers(itemsForSession);
          itemsForSession.forEach((it) => {
            lastAutoAssignedStaffByAssignmentRef.current[it.assignmentId] = it.staffMemberId;
          });

          const refreshed = await sessionApi.getById(sessionId);
          setSessionDetailsById((prev) => ({ ...prev, [sessionId]: refreshed }));
          refreshSessionInRequestState(refreshed);
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
        if (!baseDetail?.assignments?.length) {
          message.warning('Phiên hiện tại chưa có slot phân công.');
          return;
        }

        const baseSelectedByRole: Record<RoleKey, number[]> = { TE: [], TA: [] };
        for (const a of baseDetail.assignments ?? []) {
          const mid = assignSelectionsRef.current[a.assignmentId] ?? a.staffMemberId ?? 0;
          if (mid <= 0) continue;

          const roleKey = getRoleKey(a.staffRole);
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

          const assignments = detail?.assignments ?? [];
          if (!assignments.length) continue;

          const assignmentIds = assignments
            .map((a) => a?.assignmentId)
            .filter((x): x is number => typeof x === 'number' && x > 0);
          if (!assignmentIds.length) continue;

          const fetchedSuggestions = await ensureSuggestedStaffForAssignments(assignmentIds, { forceRefetch: true });

          const usedPerRole: Record<RoleKey, number[]> = { TE: [], TA: [] };
          const sessionNextSelections: Record<number, number> = {};
          const itemsForSession: AssignMemberPayload[] = [];

          for (const a of assignments) {
            if (!a?.assignmentId) continue;
            if (!isAssignableStatus(a.status)) continue;

            const roleKey = getRoleKey(a.staffRole);
            const candidates = baseSelectedByRole[roleKey] ?? [];
            if (!candidates.length) continue;

            const suggestionList = fetchedSuggestions[a.assignmentId] ?? [];
            const usedForRole = usedPerRole[roleKey] ?? [];

            const memberToApply = candidates.find(
              (id) =>
                !usedForRole.includes(id) && suggestionList.some((m) => m.memberId === id),
            );

            if (!memberToApply) continue;

            sessionNextSelections[a.assignmentId] = memberToApply;
            itemsForSession.push({ assignmentId: a.assignmentId, staffMemberId: memberToApply });
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

  const getSessionStats = useCallback(
    (s: TeamSessionLite) => {
      const detail = sessionDetailsById[s.sessionId];
      const assignments = detail?.assignments ?? [];
      const total = assignments.length;
      const filled = assignments.filter(
        (a) => !!(assignSelections[a.assignmentId] || a.staffMemberId),
      ).length;
      return { total, filled, detail, assignments };
    },
    [sessionDetailsById, assignSelections],
  );

  const handleResetFilters = () => {
    setSearch('');
    setOnlyNeedsAction(false);
    setStatusFilter(activeTab === 'assigning' ? 'assigning' : 'all');
  };

  return {
    loading,
    sendingAssignments,
    autoAssigning,
    applyingToOtherSessions,
    requests,
    filteredRequests,
    selectedRequestId,
    setSelectedRequestId,
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
    assignSelections,
    searchByAssignmentId,
    setSearchByAssignmentId,
    handleSelectStaff,
    handleApplyToOtherSessions,
    handleSendAssignments,
    getSessionStats,
    handleResetFilters,
  };
}

