import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import { getRequestType } from '@/shared/components/request/RequestCard';
import { getRequestStatusInfo } from '@/constants/status';
import { teamApi } from '@/modules/team/api/teamApi';
import type { SessionDetail, SuggestedStaff } from '@/modules/request/api/type';
import requestApi from '@/modules/request/api/requestApi';
import sessionApi from '@/modules/request/api/sessionApi';
import assignmentApi from '@/modules/request/api/assignmentApi';

export type TeamSessionLite = {
  sessionId: number;
  requestId: number;
  sessionNo: number;
  startAt: string;
  endAt: string;
  location: string;
  status: string;
};

export type TeamRequestItem = {
  requestId: number;
  requestCode: string;
  requestName: string;
  customerName?: string | null;
  subjectId?: number | null;
  courseId?: number | null;
  eventId?: number | null;
  status: string;
  startDate?: string;
  sessions: TeamSessionLite[];
};

export function useTeamLeaderAssignmentsPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<TeamRequestItem[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);

  const [sessionDetailsById, setSessionDetailsById] = useState<Record<number, SessionDetail>>({});
  const [suggestedByAssignmentId, setSuggestedByAssignmentId] = useState<
    Record<number, SuggestedStaff[]>
  >({});
  const suggestStaffInFlightRef = useRef<Record<number, Promise<SuggestedStaff[]>>>({});

  const [search, setSearch] = useState('');
  const [onlyNeedsAction, setOnlyNeedsAction] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigning'>('assigning');
  const [assignSelections, setAssignSelections] = useState<Record<number, number>>({});
  const [searchByAssignmentId, setSearchByAssignmentId] = useState<Record<number, string>>({});

  // Panel state — click session to open right panel
  const [activeSession, setActiveSession] = useState<TeamSessionLite | null>(null);

  /* ───────── Data loading ───────── */
  const loadInitial = useCallback(async () => {
    try {
      setLoading(true);
      const rawUser = JSON.parse(localStorage.getItem('user') || '{}') as { memberId?: number };
      const memberId = Number(rawUser?.memberId || 0) || undefined;
      if (!memberId) {
        setRequests([]);
        return;
      }

      const teamsRes = await teamApi.getTeams({
        pageNumber: 1,
        pageSize: 20,
        leaderMemberId: memberId,
      });
      const firstTeam = teamsRes.items?.[0];
      if (!firstTeam?.teamId) {
        setRequests([]);
        return;
      }

      const teamId = firstTeam.teamId;

      // Lấy các request đã được duyệt/đang phân công của team này
      const approvedRequests = await requestApi.getRequests({
        teamId,
        statuses: ['APPROVED', 'ASSIGNING'],
        pageNumber: 1,
        pageSize: 200,
      });

      const validRequests: TeamRequestItem[] = (approvedRequests.items ?? []).map((r) => ({
        requestId: r.requestId,
        requestCode: r.requestCode,
        requestName: r.requestName,
        customerName: r.customerName,
        subjectId: r.subjectId,
        courseId: r.courseId,
        eventId: r.eventId,
        status: r.status,
        startDate: r.startDate,
        sessions: (r.sessions ?? []).map((s) => ({
          sessionId: s.sessionId,
          requestId: r.requestId,
          sessionNo: s.sessionNo,
          startAt: s.startAt,
          endAt: s.endAt,
          location: s.location ?? '',
          status: s.status,
        })),
      }));

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
    void loadInitial();
  }, [loadInitial]);

  /* ───────── Derived data ───────── */
  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = !q
      ? requests
      : requests.filter(
          (r) =>
            r.requestCode.toLowerCase().includes(q) || (r.requestName ?? '').toLowerCase().includes(q),
        );

    if (statusFilter === 'assigning' || onlyNeedsAction) {
      return base.filter((r) =>
        r.sessions.some((s) => {
          const st = String(s.status ?? '').toLowerCase();
          return st === 'assigning' || st === 'pending';
        }),
      );
    }

    return base;
  }, [requests, search, onlyNeedsAction, statusFilter]);

  const selectedRequest = useMemo(
    () => requests.find((r) => r.requestId === selectedRequestId) ?? null,
    [requests, selectedRequestId],
  );

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
    return getRequestStatusInfo(selectedRequest.status);
  }, [selectedRequest]);

  /* ───────── Session details + suggestions ───────── */
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

        const next: Record<number, SessionDetail> = {};
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
    async (assignmentIds: number[]): Promise<Record<number, SuggestedStaff[]>> => {
      const unique = Array.from(new Set(assignmentIds)).filter((id) => id > 0);
      if (!unique.length) return {};

      // Trả về đủ map cho mọi assignmentIds (bao gồm cached + vừa fetch).
      const result: Record<number, SuggestedStaff[]> = {};
      const pairsToAwait: Array<readonly [number, Promise<SuggestedStaff[]>]> = [];

      for (const aid of unique) {
        const cached = suggestedByAssignmentId[aid];
        if (Array.isArray(cached)) {
          result[aid] = cached;
          continue;
        }

        // In-flight dedupe: nếu cùng aid đang có promise request chạy thì chỉ await nó.
        const inFlight = suggestStaffInFlightRef.current[aid];
        if (inFlight) {
          pairsToAwait.push([aid, inFlight]);
          continue;
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

  // Chỉ fetch suggestion cho phiên đang mở (lazy), tránh gọi suggestStaff cho toàn bộ sessions/assignments
  useEffect(() => {
    if (!activeSession) return;
    const detail = sessionDetailsById[activeSession.sessionId];
    const assignments = detail?.assignments ?? [];
    const assignmentIds = assignments
      .map((a) => a?.assignmentId)
      .filter((x): x is number => typeof x === 'number' && x > 0);
    void ensureSuggestedStaffForAssignments(assignmentIds);
  }, [activeSession, sessionDetailsById, ensureSuggestedStaffForAssignments]);

  /* ───────── Assignment handlers ───────── */
  const handleSelectStaff = useCallback((assignmentId: number, memberId: number) => {
    setAssignSelections((prev) => ({ ...prev, [assignmentId]: memberId }));
  }, []);

  const handleApplyToOtherSessions = useCallback(
    async (sessionId: number) => {
      const baseDetail = sessionDetailsById[sessionId];
      if (!baseDetail?.assignments?.length || !selectedRequest) return;

      const baseAssignments = baseDetail.assignments;
      const baseSelectedByRole: Record<string, number[]> = {};
      baseAssignments.forEach((a) => {
        const mid = assignSelections[a.assignmentId] || a.staffMemberId;
        if (!mid) return;
        const roleKey = String(a.staffRole ?? '')
          .toUpperCase()
          .includes('TA')
          ? 'TA'
          : 'TE';
        if (!baseSelectedByRole[roleKey]) baseSelectedByRole[roleKey] = [];
        if (!baseSelectedByRole[roleKey].includes(mid)) baseSelectedByRole[roleKey].push(mid);
      });

      if (!Object.keys(baseSelectedByRole).length) {
        message.warning('Vui lòng chọn ít nhất một nhân sự trong phiên hiện tại trước.');
        return;
      }

      // Để apply đúng, cần đảm bảo đã có "suggest staff" cho các assignment thuộc các phiên khác.
      const otherSessionIds = selectedRequest.sessions
        .filter((s) => s.sessionId !== sessionId)
        .map((s) => s.sessionId);
      const otherAssignmentIds = otherSessionIds
        .flatMap((sid) => sessionDetailsById[sid]?.assignments ?? [])
        .map((a) => a?.assignmentId)
        .filter((x): x is number => typeof x === 'number' && x > 0);

      const fetchedSuggestions = await ensureSuggestedStaffForAssignments(otherAssignmentIds);

      const nextSelections: Record<number, number> = { ...assignSelections };
      selectedRequest.sessions
        .filter((s) => s.sessionId !== sessionId)
        .forEach((s) => {
          const detail = sessionDetailsById[s.sessionId];
          if (!detail?.assignments?.length) return;
          const usedPerRole: Record<string, number[]> = {};
          detail.assignments.forEach((a) => {
            const roleKey = String(a.staffRole ?? '')
              .toUpperCase()
              .includes('TA')
              ? 'TA'
              : 'TE';
            const candidates = baseSelectedByRole[roleKey];
            if (!candidates?.length) return;
            const suggestionList =
              suggestedByAssignmentId[a.assignmentId] ?? fetchedSuggestions[a.assignmentId] ?? [];
            const sourceList: { memberId: number }[] = suggestionList;
            const usedForRole = usedPerRole[roleKey] ?? [];
            const memberToApply = candidates.find(
              (id) => !usedForRole.includes(id) && sourceList.some((m) => m.memberId === id),
            );
            if (memberToApply) {
              nextSelections[a.assignmentId] = memberToApply;
              usedPerRole[roleKey] = [...usedForRole, memberToApply];
            }
          });
        });

      setAssignSelections(nextSelections);
      message.success('Đã áp dụng phân công từ phiên hiện tại cho các phiên khác.');
    },
    [
      assignSelections,
      ensureSuggestedStaffForAssignments,
      selectedRequest,
      sessionDetailsById,
      suggestedByAssignmentId,
    ],
  );

  /* ───────── Helper: session stats ───────── */
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
    setStatusFilter('assigning');
  };

  return {
    loading,
    requests,
    filteredRequests,
    selectedRequestId,
    setSelectedRequestId,
    selectedRequest,
    selectedRequestTypeInfo,
    selectedRequestStatusInfo,
    search,
    setSearch,
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
    getSessionStats,
    handleResetFilters,
  };
}

