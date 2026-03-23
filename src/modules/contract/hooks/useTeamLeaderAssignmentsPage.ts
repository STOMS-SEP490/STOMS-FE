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

type TeamLeaderAssignmentsTab = 'assigning' | 'rejected';

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'assigning'>('assigning');
  const [activeTab, setActiveTab] = useState<TeamLeaderAssignmentsTab>('assigning');
  const [assignSelections, setAssignSelections] = useState<Record<number, number>>({});
  const [searchByAssignmentId, setSearchByAssignmentId] = useState<Record<number, string>>({});

  // Auto-assign helpers (tự gọi API khi user chọn xong)
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

  // Panel state — click session to open right panel
  const [activeSession, setActiveSession] = useState<TeamSessionLite | null>(null);

  /* ───────── Data loading ───────── */
  const loadInitial = useCallback(async (tab: TeamLeaderAssignmentsTab) => {
    try {
      setLoading(true);
      const rawUser = JSON.parse(localStorage.getItem('user') || '{}') as { memberId?: number };
      const memberId = Number(rawUser?.memberId || 0) || undefined;
      if (!memberId) {
        setRequests([]);
        return;
      }

      // Lấy teamId theo member để tránh phụ thuộc thứ tự "firstTeam".
      let teamId: number | undefined;
      try {
        const me = await memberApi.getById(memberId);
        teamId = me.teamId != null ? Number(me.teamId) : undefined;
      } catch {
        teamId = undefined;
      }

      // Fallback: nếu không lấy được teamId từ member thì lấy team đầu tiên của leader.
      if (!teamId) {
        const teamsRes = await teamApi.getTeams({
          pageNumber: 1,
          pageSize: 20,
          leaderMemberId: memberId,
        });
        const firstTeam = teamsRes.items?.[0];
        teamId = firstTeam?.teamId != null ? Number(firstTeam.teamId) : undefined;
      }

      if (!teamId) {
        setRequests([]);
        return;
      }

      let validRequests: TeamRequestItem[] = [];

      if (tab === 'assigning') {
        // Tab "Yêu cầu chờ phân công": lấy theo request.
        const approvedRequests = await requestApi.getRequests({
          teamId,
          statuses: ['ASSIGNING', 'APPROVED'],
          pageNumber: 1,
          pageSize: 200,
        });

        validRequests = (approvedRequests.items ?? []).map((r) => ({
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
      } else {
        // Tab "Yêu cầu bị từ chối": lấy theo session rồi gom nhóm về request để render sidebar trái.
        const rejectedSessionsRes = await sessionApi.getFilter({
          teamId,
          statuses: ['ASSIGNMENT_REJECTED'],
          pageNumber: 1,
          pageSize: 500,
        });

        const rejectedSessions = (rejectedSessionsRes.items ?? []).filter(
          (s) => Number(s.sessionId) > 0 && Number(s.requestId) > 0,
        );
        const requestIds = Array.from(
          new Set(rejectedSessions.map((s) => Number(s.requestId)).filter((id) => id > 0)),
        );

        const requestDetailPairs = await Promise.all(
          requestIds.map(async (rid) => {
            try {
              const req = await requestApi.getById(rid);
              return [rid, req] as const;
            } catch {
              return null;
            }
          }),
        );

        const requestById: Record<number, Awaited<ReturnType<typeof requestApi.getById>>> = {};
        requestDetailPairs.forEach((p) => {
          if (!p) return;
          requestById[p[0]] = p[1];
        });

        const groupedByRequest = rejectedSessions.reduce<Record<number, TeamSessionLite[]>>((acc, s) => {
          const rid = Number(s.requestId);
          if (!rid) return acc;
          if (!acc[rid]) acc[rid] = [];
          acc[rid].push({
            sessionId: Number(s.sessionId),
            requestId: rid,
            sessionNo: Number(s.sessionNo ?? 0),
            startAt: String(s.startAt ?? ''),
            endAt: String(s.endAt ?? ''),
            location: String(s.location ?? ''),
            status: String(s.status ?? 'ASSIGNMENT_REJECTED'),
          });
          return acc;
        }, {});

        validRequests = Object.entries(groupedByRequest).map(([ridRaw, sessions]) => {
          const rid = Number(ridRaw);
          const req = requestById[rid];
          return {
            requestId: rid,
            requestCode: req?.requestCode ?? `REQ-${rid}`,
            requestName: req?.requestName ?? `Yêu cầu #${rid}`,
            customerName: req?.customerName ?? null,
            subjectId: req?.subjectId ?? null,
            courseId: req?.courseId ?? null,
            eventId: req?.eventId ?? null,
            // Tab rejected lấy nguồn từ Session.Status=ASSIGNMENT_REJECTED,
            // nên set status tổng hợp để không bị loại bởi filter theo request.status.
            status: 'ASSIGNMENT_REJECTED',
            startDate: req?.startDate,
            sessions: sessions.sort((a, b) => (a.sessionNo ?? 0) - (b.sessionNo ?? 0)),
          };
        });
      }

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

  /* ───────── Derived data ───────── */
  const filteredRequests = useMemo(() => {
    const isAssigningTabRequest = (status?: string) => {
      const s = String(status ?? '').toUpperCase();
      return s.includes('APPROVED') || s.includes('ASSIGNING') || s === '3' || s === '4';
    };

    const isRejectedTabRequest = (status?: string) => {
      const s = String(status ?? '').toUpperCase();
      return s.includes('ASSIGNMENT_REJECTED') || s === '5' || s.includes('REJECTED') || s === '2';
    };

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
      return tabFiltered.filter((r) =>
        r.sessions.some((s) => {
          const st = String(s.status ?? '').toLowerCase();
          return st === 'assigning' || st === 'pending';
        }),
      );
    }

    return tabFiltered;
  }, [requests, search, onlyNeedsAction, statusFilter, activeTab]);

  const selectedRequest = useMemo(
    () => requests.find((r) => r.requestId === selectedRequestId) ?? null,
    [requests, selectedRequestId],
  );

  // Đồng bộ selectedRequestId với filteredRequests theo tab/search/filter
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, search, onlyNeedsAction, statusFilter, filteredRequests]);

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

  /* ───────── TL: send assignments to BE ───────── */
  const handleSendAssignments = useCallback(async () => {
    if (!selectedRequest) return;

    const sessionIds = selectedRequest.sessions.map((s) => s.sessionId).filter((id) => id > 0);
    if (!sessionIds.length) {
      message.warning('Không có phiên để gửi phân công.');
      return;
    }

    try {
      setSendingAssignments(true);

      // Lấy detail cho toàn bộ session đang nằm trong request để gom assignmentId + staffMemberId,
      // nhưng gửi lên BE theo từng session (mỗi session 1 call).
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
        const itemsForSession: { assignmentId: number; staffMemberId: number }[] = [];

        for (const a of assignments) {
          // BE chỉ cho phép gán staff khi assignment đang ở Pending hoặc Rejected.
          const st = String(a.status ?? '').trim().toUpperCase();
          const isAllowedStatus =
            st === 'PENDING' ||
            st === '1' ||
            st.includes('PENDING') ||
            st === 'REJECTED' ||
            st === '3' ||
            st.includes('REJECTED');

          if (!isAllowedStatus) continue;

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

      // Refresh status theo BE (request/session status sẽ chuyển bước)
      await loadInitial(activeTab);
      setActiveSession(null);
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.message || 'Gửi phân công thất bại.';
      message.error(msg);
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
    async (
      assignmentIds: number[],
      options: {
        forceRefetch?: boolean;
      } = {},
    ): Promise<Record<number, SuggestedStaff[]>> => {
      const unique = Array.from(new Set(assignmentIds)).filter((id) => id > 0);
      if (!unique.length) return {};

      // Trả về đủ map cho mọi assignmentIds (bao gồm cached + vừa fetch).
      const result: Record<number, SuggestedStaff[]> = {};
      const pairsToAwait: Array<readonly [number, Promise<SuggestedStaff[]>]> = [];

      for (const aid of unique) {
        const cached = suggestedByAssignmentId[aid];
        if (!options.forceRefetch && Array.isArray(cached)) {
          result[aid] = cached;
          continue;
        }

        // In-flight dedupe: nếu cùng aid đang có promise request chạy thì chỉ await nó.
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
  const isAllowedAssignmentStatus = useCallback((status?: string | number | null) => {
    const st = String(status ?? '').trim().toUpperCase();
    return (
      st === 'PENDING' ||
      st === '1' ||
      st.includes('PENDING') ||
      st === 'REJECTED' ||
      st === '3' ||
      st.includes('REJECTED')
    );
  }, []);

  const flushAutoAssignSession = useCallback(
    async (sessionId: number) => {
      // Clear debounce timer (nếu có)
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

          const itemsForSession: { assignmentId: number; staffMemberId: number }[] = [];
          for (const a of assignments) {
            if (!a?.assignmentId) continue;
            if (!isAllowedAssignmentStatus(a.status)) continue;

            const chosenStaffId = selectionsNow[a.assignmentId] ?? (a.staffMemberId ?? 0);
            if (chosenStaffId <= 0) continue;

            // Tránh gửi lại nếu chưa thay đổi sau lần auto-gán gần nhất.
            if (lastAutoAssignedStaffByAssignmentRef.current[a.assignmentId] === chosenStaffId) continue;

            itemsForSession.push({ assignmentId: a.assignmentId, staffMemberId: chosenStaffId });
          }

          if (!itemsForSession.length) return;

          await assignmentApi.assignMembers(itemsForSession);
          itemsForSession.forEach((it) => {
            lastAutoAssignedStaffByAssignmentRef.current[it.assignmentId] = it.staffMemberId;
          });

          // Refresh cả detail + status trong list phiên để UI đồng bộ
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
      isAllowedAssignmentStatus,
      refreshSessionInRequestState,
      sessionApi,
      autoAssignCounterRef,
      setAutoAssigning,
    ],
  );

  const handleSelectStaff = useCallback(
    (sessionId: number, assignmentId: number, memberId: number) => {
      setAssignSelections((prev) => ({ ...prev, [assignmentId]: memberId }));

      // Nếu đang apply theo phiên thì bỏ qua auto-save theo debounce.
      if (isApplyingRef.current) return;

      // Chỉ auto-call khi có staff được chọn.
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
        // Flush auto-assign cho phiên đang mở trước để BE state cập nhật,
        // giúp suggestStaff của các phiên sau đúng theo “từng bước”.
        await flushAutoAssignSession(sessionId);

        const baseDetail =
          sessionDetailsByIdRef.current[sessionId] ?? (await sessionApi.getById(sessionId));
        if (!baseDetail?.assignments?.length) {
          message.warning('Phiên hiện tại chưa có slot phân công.');
          return;
        }

        const baseSelectedByRole: Record<string, number[]> = {};
        for (const a of baseDetail.assignments ?? []) {
          const mid = assignSelectionsRef.current[a.assignmentId] ?? a.staffMemberId ?? 0;
          if (mid <= 0) continue;

          const roleKey = String(a.staffRole ?? '')
            .toUpperCase()
            .includes('TA')
            ? 'TA'
            : 'TE';

          if (!baseSelectedByRole[roleKey]) baseSelectedByRole[roleKey] = [];
          if (!baseSelectedByRole[roleKey].includes(mid)) baseSelectedByRole[roleKey].push(mid);
        }

        if (!Object.keys(baseSelectedByRole).length) {
          message.warning('Vui lòng chọn ít nhất một nhân sự trong phiên hiện tại trước.');
          return;
        }

        // Apply tuần tự theo thứ tự phiên (để suggestStaff “kịp load” theo BE state đã cập nhật).
        const otherSessions = selectedRequest.sessions
          .filter((s) => s.sessionId !== sessionId)
          .map((s) => s)
          .sort((a, b) => (a.sessionNo ?? 0) - (b.sessionNo ?? 0));

        for (const s of otherSessions) {
          const otherSessionId = s.sessionId;
          if (!otherSessionId) continue;

          const existingDetail = sessionDetailsByIdRef.current[otherSessionId];
          const detail =
            existingDetail ?? (await sessionApi.getById(otherSessionId));
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

          // Force refetch để suggestions của phiên sau không bị “cache” theo state cũ.
          const fetchedSuggestions = await ensureSuggestedStaffForAssignments(assignmentIds, { forceRefetch: true });

          const usedPerRole: Record<string, number[]> = {};
          const sessionNextSelections: Record<number, number> = {};
          const itemsForSession: { assignmentId: number; staffMemberId: number }[] = [];

          for (const a of assignments) {
            if (!a?.assignmentId) continue;
            if (!isAllowedAssignmentStatus(a.status)) continue;

            const roleKey = String(a.staffRole ?? '')
              .toUpperCase()
              .includes('TA')
              ? 'TA'
              : 'TE';
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = (err as any)?.message || 'Áp dụng phân công thất bại.';
        message.error(msg);
      } finally {
        isApplyingRef.current = false;
        setApplyingToOtherSessions(false);
      }
    },
    [
      ensureSuggestedStaffForAssignments,
      ensureSessionDetails,
      flushAutoAssignSession,
      assignmentApi,
      isAllowedAssignmentStatus,
      refreshSessionInRequestState,
      sessionApi,
      selectedRequest,
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
    setActiveTab,
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

