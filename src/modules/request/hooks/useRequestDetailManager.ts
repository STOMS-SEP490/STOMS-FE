import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import type { RequestListItem, RequestSessionSummary } from '../request';
import requestService from '../api/requestApi';
import sessionService from '../api/sessionApi';
import { teamSessionApi } from '@/modules/team/api/teamSessionApi';
import assignmentService from '../api/assignmentApi';
import { useProgramCoordinatorId } from './useProgramCoordinatorId';
import type { PagedResponse, SessionResponse } from '../session.types';
import type {
  RequestLayoutOutletContext,
  RightPanelState,
  SessionAssignmentRow,
  SessionWithFlags,
} from '../requestDetail.types';

const mapSessionAssignments = (detail: any): SessionAssignmentRow[] => {
  const rawAssignments = detail?.Assignments ?? detail?.assignments ?? [];
  return (rawAssignments as any[])
    .filter((a) => a && (a.assignmentId || a.AssignmentId))
    .map((a) => {
      const staff = a.staffMember ?? a.StaffMember ?? null;
      const staffUser = staff?.user ?? staff?.User ?? null;
      return {
        assignmentId: Number(a.assignmentId ?? a.AssignmentId ?? 0),
        staffMemberId: Number(a.staffMemberId ?? a.StaffMemberId ?? 0),
        staffRole: String(a.staffRole ?? a.StaffRole ?? '').toUpperCase(),
        status: String(a.status ?? a.Status ?? ''),
        fullName: staff?.fullName || staff?.FullName || '—',
        email: staff?.userEmail || staff?.email || staff?.Email || staffUser?.email || staffUser?.Email || '',
        avatarUrl: staff?.avatarUrl || staff?.AvatarUrl || '',
      } satisfies SessionAssignmentRow;
    });
};

const mapSessionsWithFlags = (detail: RequestListItem) => {
  const nextUiAssigned: Record<number, number[]> = {};
  const mappedSessions: SessionWithFlags[] =
    detail.sessions?.map((s) => {
      const anyS = s as RequestSessionSummary & {
        reservationId?: number | null;
        ReservationId?: number | null;
        teamId?: number | null;
        TeamId?: number | null;
        teamSessions?: { teamId?: number | null; TeamId?: number | null }[];
        TeamSessions?: { teamId?: number | null; TeamId?: number | null }[];
      };
      const rawReservationId =
        anyS.reservationId ??
        anyS.ReservationId ??
        null;

      const parsed = rawReservationId != null ? Number(rawReservationId) : NaN;
      const reservationId = !Number.isNaN(parsed) && parsed > 0 ? parsed : null;
      const fromSessions = anyS.teamSessions ?? anyS.TeamSessions ?? [];
      const backendTeamIds = fromSessions
        .map((ts) => ts.teamId ?? ts.TeamId)
        .filter((id): id is number => typeof id === 'number' && id > 0);
      const singleTeamId = anyS.teamId ?? anyS.TeamId;
      const initialTeamIds =
        backendTeamIds.length > 0
          ? backendTeamIds
          : typeof singleTeamId === 'number' && singleTeamId > 0
            ? [singleTeamId]
            : [];

      const statusStr = (s.status ?? '').toString().toLowerCase();
      const teamAssigned =
        initialTeamIds.length > 0 ||
        statusStr === 'approved' ||
        statusStr === 'assigned' ||
        statusStr === 'ongoing' ||
        statusStr === 'completed';

      if (initialTeamIds.length > 0) nextUiAssigned[s.sessionId] = initialTeamIds;

        return {
        ...s,
        reservationId,
        teamAssigned,
        equipmentReserved: reservationId != null,
      };
    }) ?? [];

  return { mappedSessions, nextUiAssigned };
};

const mapSessionFromFilterItem = (raw: SessionResponse): SessionWithFlags => {
  const anyRaw = raw as SessionResponse & {
    TeamSessions?: { teamId?: number | null; TeamId?: number | null }[];
    teamSessions?: { teamId?: number | null; TeamId?: number | null }[];
  };
  const fromSessions = anyRaw.TeamSessions ?? anyRaw.teamSessions ?? [];
  const backendTeamIds = fromSessions
    .map((ts) => ts?.teamId ?? ts?.TeamId)
    .filter((id): id is number => typeof id === 'number' && id > 0);
  const rawReservationId = anyRaw.ReservationId ?? anyRaw.reservationId ?? null;
  const reservationNum = rawReservationId != null ? Number(rawReservationId) : NaN;
  const reservationId = !Number.isNaN(reservationNum) && reservationNum > 0 ? reservationNum : null;
  const statusText = String(anyRaw.Status ?? anyRaw.status ?? '').toLowerCase();
  const teamAssigned =
    backendTeamIds.length > 0 ||
    statusText === 'approved' ||
    statusText === 'assigned' ||
    statusText === 'ongoing' ||
    statusText === 'completed';

  return {
    sessionId: Number(anyRaw.SessionId ?? anyRaw.sessionId ?? 0),
    requestId: Number(anyRaw.RequestId ?? anyRaw.requestId ?? 0),
    sessionNo: Number(anyRaw.SessionNo ?? anyRaw.sessionNo ?? 0),
    startAt: String(anyRaw.StartAt ?? anyRaw.startAt ?? ''),
    endAt: String(anyRaw.EndAt ?? anyRaw.endAt ?? ''),
    location: String(anyRaw.Location ?? anyRaw.location ?? ''),
    status: String(anyRaw.Status ?? anyRaw.status ?? ''),
    notes: String(anyRaw.Notes ?? anyRaw.notes ?? ''),
    teachersRequired: anyRaw.TeachersRequired ?? anyRaw.teachersRequired ?? null,
    tasRequired: anyRaw.TasRequired ?? anyRaw.tasRequired ?? null,
    reservationId,
    teamAssigned,
    assignedTeamIds: backendTeamIds,
    equipmentReserved: reservationId != null,
  } as SessionWithFlags;
};

const normalizeRequiredCount = (value: unknown, fallback: number) => {
  const n = Number(value);
  if (Number.isNaN(n)) return fallback;
  return Math.max(0, n);
};

const distributeCountByTeam = (teamIds: number[], total: number) => {
  const result = teamIds.map((teamId) => ({ teamId, count: 0 }));
  if (!result.length || total <= 0) return result;
  for (let i = 0; i < total; i += 1) {
    result[i % result.length].count += 1;
  }
  return result;
};

export const useRequestDetailManager = (params: {
  id?: string;
  viewMode?: RequestLayoutOutletContext['viewMode'];
  refreshRequestSidebar?: RequestLayoutOutletContext['refreshRequestSidebar'];
}) => {
  const { id, viewMode, refreshRequestSidebar } = params;
  const createdByMemberId = useProgramCoordinatorId();

  const [request, setRequest] = useState<RequestListItem | null>(null);
  const [sessions, setSessions] = useState<SessionWithFlags[]>([]);
  const [rightPanel, setRightPanel] = useState<RightPanelState>(null);
  const [loading, setLoading] = useState(false);
  const [uiAssignedTeamIdsBySessionId, setUiAssignedTeamIdsBySessionId] = useState<Record<number, number[]>>({});
  const [uiTeamQuantitiesBySessionId, setUiTeamQuantitiesBySessionId] = useState<
    Record<number, Record<number, { teachersRequired: number; tasRequired: number }>>
  >({});
  const [assignmentsBySessionId, setAssignmentsBySessionId] = useState<Record<number, SessionAssignmentRow[]>>({});
  const [selectedAssignmentIdsBySessionId, setSelectedAssignmentIdsBySessionId] = useState<Record<number, number[]>>(
    {}
  );
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [approvingSessionId, setApprovingSessionId] = useState<number | null>(null);
  const [rejectAssignmentState, setRejectAssignmentState] = useState<{
    open: boolean;
    assignmentId: number | null;
    sessionId: number | null;
    displayName: string;
  }>({ open: false, assignmentId: null, sessionId: null, displayName: '' });
  const [rejectAssignmentReason, setRejectAssignmentReason] = useState('');
  const [, setRejectAssignmentLoading] = useState(false);
  const lastFilterSyncKeyRef = useRef<string>('');

  const applySessionState = useCallback((mappedSessions: SessionWithFlags[]) => {
    const nextUiAssigned = mappedSessions.reduce<Record<number, number[]>>((acc, s) => {
      const anyS = s as SessionWithFlags & {
        teamId?: number | null;
        TeamId?: number | null;
        teamSessions?: { teamId?: number | null; TeamId?: number | null }[];
        TeamSessions?: { teamId?: number | null; TeamId?: number | null }[];
      };
      const fromSessions = anyS.teamSessions ?? anyS.TeamSessions ?? [];
      const backendTeamIds = fromSessions
        .map((ts) => ts?.teamId ?? ts?.TeamId)
        .filter((teamId): teamId is number => typeof teamId === 'number' && teamId > 0);
      const fromMapped = Array.isArray((anyS as any).assignedTeamIds)
        ? ((anyS as any).assignedTeamIds as number[]).filter((teamId) => typeof teamId === 'number' && teamId > 0)
        : [];
      const singleTeamId = anyS.teamId ?? anyS.TeamId;
      const teamIds =
        fromMapped.length > 0
          ? fromMapped
          : backendTeamIds.length > 0
          ? backendTeamIds
          : typeof singleTeamId === 'number' && singleTeamId > 0
            ? [singleTeamId]
            : [];
      if (teamIds.length > 0) acc[s.sessionId] = teamIds;
      return acc;
    }, {});

    setSessions(mappedSessions);
    setUiAssignedTeamIdsBySessionId((prev) => {
      const hasLocal = Object.keys(prev).length > 0;
      if (!hasLocal) return nextUiAssigned;
      return {
        ...nextUiAssigned,
        ...prev,
      };
    });
    const nextTeamQuantities = mappedSessions.reduce<
      Record<number, Record<number, { teachersRequired: number; tasRequired: number }>>
    >(
        (acc, s) => {
          const teamIds = nextUiAssigned[s.sessionId] ?? [];
          const requiredTeachers = normalizeRequiredCount((s as any).teachersRequired, 1);
          const requiredTas = normalizeRequiredCount((s as any).tasRequired, 1);
          const teacherDist = distributeCountByTeam(teamIds, requiredTeachers);
          const taDist = distributeCountByTeam(teamIds, requiredTas);
          acc[s.sessionId] = teamIds.reduce<Record<number, { teachersRequired: number; tasRequired: number }>>(
            (m, teamId, idx) => {
              m[teamId] = {
                teachersRequired: teacherDist[idx]?.count ?? 0,
                tasRequired: taDist[idx]?.count ?? 0,
              };
              return m;
            },
            {}
          );
          return acc;
        },
        {}
      );
    setUiTeamQuantitiesBySessionId((prev) => {
      const hasLocal = Object.keys(prev).length > 0;
      if (!hasLocal) return nextTeamQuantities;
      return {
        ...nextTeamQuantities,
        ...prev,
      };
    });
  }, []);

  const loadSessionsByRequestId = useCallback(async (requestId: number): Promise<SessionWithFlags[]> => {
    if (!requestId || requestId <= 0) return [];
    const res = await sessionService.getFilter({
      RequestId: requestId,
      PageNumber: 1,
      PageSize: 500,
    });
    const items = (res as PagedResponse<SessionResponse>).Items ?? (res as any).items ?? [];
    return (items as SessionResponse[])
      .map(mapSessionFromFilterItem)
      .filter((s) => Number(s.sessionId) > 0)
      .sort((a, b) => Number(a.sessionNo ?? 0) - Number(b.sessionNo ?? 0));
  }, []);

  useEffect(() => {
    if (!id) return;
    setRightPanel(null);
    setSessions([]);
    setUiAssignedTeamIdsBySessionId({});
    setUiTeamQuantitiesBySessionId({});

    const fetchData = async () => {
      try {
        setLoading(true);
        const detail = await requestService.getById(Number(id));
        setRequest(detail);
        const { mappedSessions } = mapSessionsWithFlags(detail);
        const byFilter = await loadSessionsByRequestId(Number(detail.requestId ?? id));
        applySessionState(byFilter.length ? byFilter : mappedSessions);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [id, applySessionState, loadSessionsByRequestId]);

  useEffect(() => {
    if (!request?.requestId) return;
    const rightPanelSessionId = rightPanel && 'session' in rightPanel ? rightPanel.session?.sessionId : null;
    if (!rightPanelSessionId) return;
    const syncKey = `${request.requestId}-${rightPanelSessionId}`;
    if (lastFilterSyncKeyRef.current === syncKey) return;
    lastFilterSyncKeyRef.current = syncKey;

    let cancelled = false;
    const syncSessionsByFilter = async () => {
      try {
        const byFilter = await loadSessionsByRequestId(Number(request.requestId));
        if (cancelled || !byFilter.length) return;
        applySessionState(byFilter);
      } catch {
        // keep current list if filter API fails
      }
    };
    void syncSessionsByFilter();
    return () => {
      cancelled = true;
    };
  }, [request?.requestId, rightPanel, loadSessionsByRequestId, applySessionState]);

  useEffect(() => {
    if (viewMode !== 'assignment') return;
    if (!sessions.length) return;
    const missingIds = sessions
      .map((s) => s.sessionId)
      .filter((sid) => !assignmentsBySessionId[sid]);
    if (!missingIds.length) return;
    let cancelled = false;
    const run = async () => {
      try {
        const details = await Promise.all(
          missingIds.map(async (sid) => {
            try {
              const d = await sessionService.getById(sid);
              const baseAssignments = (d.Assignments ?? d.assignments ?? []).filter(
                (a: any) => a && (a.assignmentId || a.AssignmentId)
              );
              if (!baseAssignments.length) {
                return { sessionId: Number(d.SessionId ?? d.sessionId ?? sid), rows: [] as SessionAssignmentRow[] };
              }

              const rows = await Promise.all(
                baseAssignments.map(async (a: any) => {
                  const assignmentId = Number(a.assignmentId ?? a.AssignmentId ?? 0);
                  try {
                    if (assignmentId <= 0) throw new Error('Invalid assignment id');
                    const full = await assignmentService.getById(assignmentId);
                    const staff = (full as any).staffMember ?? (full as any).StaffMember;
                    const staffUser = staff?.user ?? staff?.User ?? null;
                    return {
                      assignmentId: Number((full as any).assignmentId ?? (full as any).AssignmentId ?? assignmentId),
                      staffMemberId: Number((full as any).staffMemberId ?? (full as any).StaffMemberId ?? 0),
                      staffRole: String((full as any).staffRole ?? (full as any).StaffRole ?? '').toUpperCase(),
                      status: String((full as any).status ?? (full as any).Status ?? ''),
                      fullName: staff?.fullName || '—',
                      email:
                        staff?.userEmail ||
                        staff?.email ||
                        staff?.Email ||
                        staffUser?.email ||
                        staffUser?.Email ||
                        '',
                      avatarUrl: staff?.avatarUrl || '',
                    } satisfies SessionAssignmentRow;
                  } catch {
                    const staff = a.staffMember ?? a.StaffMember ?? null;
                    const staffUser = staff?.user ?? staff?.User ?? null;
                    return {
                      assignmentId,
                      staffMemberId: Number(a.staffMemberId ?? a.StaffMemberId ?? 0),
                      staffRole: String(a.staffRole ?? a.StaffRole ?? '').toUpperCase(),
                      status: String(a.status ?? a.Status ?? ''),
                      fullName: staff?.fullName || staff?.FullName || '—',
                      email:
                        staff?.userEmail ??
                        staff?.email ??
                        staff?.Email ??
                        staffUser?.email ??
                        staffUser?.Email ??
                        '',
                      avatarUrl: staff?.avatarUrl || staff?.AvatarUrl || '',
                    } satisfies SessionAssignmentRow;
                  }
                })
              );

              return { sessionId: Number(d.SessionId ?? d.sessionId ?? sid), rows };
            } catch {
              return { sessionId: sid, rows: [] as SessionAssignmentRow[] };
            }
          })
        );
        if (cancelled) return;
        setAssignmentsBySessionId((prev) => {
          const next = { ...prev };
          details.forEach((d) => {
            next[d.sessionId] = d.rows;
          });
          return next;
        });
      } catch {
        // ignore
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [viewMode, sessions, assignmentsBySessionId]);

  const handleAssignSession = useCallback(
    (
      sessionId: number,
      teamIds: number[],
      teamQuantities: Record<number, { teachersRequired: number; tasRequired: number }>
    ) => {
      const targetSession = sessions.find((s) => s.sessionId === sessionId);
      const requiredTeachers = normalizeRequiredCount(
        (targetSession as SessionWithFlags | undefined)?.teachersRequired,
        1
      );
      const requiredTas = normalizeRequiredCount(
        (targetSession as SessionWithFlags | undefined)?.tasRequired,
        1
      );
      const totalTeachers = teamIds.reduce(
        (sum, teamId) => sum + normalizeRequiredCount(teamQuantities?.[teamId]?.teachersRequired, 0),
        0
      );
      const totalTas = teamIds.reduce(
        (sum, teamId) => sum + normalizeRequiredCount(teamQuantities?.[teamId]?.tasRequired, 0),
        0
      );

      if (totalTeachers > requiredTeachers || totalTas > requiredTas) {
        message.error(
          `Phân bổ vượt nhu cầu phiên (${requiredTeachers} GV / ${requiredTas} TG). Vui lòng giảm số lượng hoặc bớt đội.`
        );
        return;
      }

      setUiAssignedTeamIdsBySessionId((prev) => ({ ...prev, [sessionId]: teamIds }));
      setUiTeamQuantitiesBySessionId((prev) => ({
        ...prev,
        [sessionId]: teamIds.reduce<Record<number, { teachersRequired: number; tasRequired: number }>>(
          (m, teamId) => {
            m[teamId] = {
              teachersRequired: normalizeRequiredCount(teamQuantities?.[teamId]?.teachersRequired, 0),
              tasRequired: normalizeRequiredCount(teamQuantities?.[teamId]?.tasRequired, 0),
            };
            return m;
          },
          {}
        ),
      }));
      setSessions((prev) =>
        prev.map((s) => (s.sessionId === sessionId ? { ...s, teamAssigned: teamIds.length > 0 } : s))
      );
    },
    [sessions]
  );

  const handleQuantitiesChange = useCallback(
    (sessionId: number, data: Record<number, { teachersRequired: number; tasRequired: number }>) => {
      setUiTeamQuantitiesBySessionId((prev) => ({
        ...prev,
        [sessionId]: data,
      }));
    },
    []
  );

  const refreshDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const detail = await requestService.getById(Number(id));
      setRequest(detail);
      const { mappedSessions } = mapSessionsWithFlags(detail);
      const byFilter = await loadSessionsByRequestId(Number(detail.requestId ?? id));
      applySessionState(byFilter.length ? byFilter : mappedSessions);
    } finally {
      setLoading(false);
    }
  }, [id, applySessionState, loadSessionsByRequestId]);

  const handleApproveClick = useCallback(() => {
    if (!request || !id) return;
    setApproveOpen(true);
  }, [id, request]);

  const handleToggleAssignmentSelection = useCallback((sessionId: number, assignmentId: number) => {
    setSelectedAssignmentIdsBySessionId((prev) => {
      const current = prev[sessionId] ?? [];
      const exists = current.includes(assignmentId);
      const nextForSession = exists ? current.filter((id) => id !== assignmentId) : [...current, assignmentId];
      return { ...prev, [sessionId]: nextForSession };
    });
  }, []);

  const handleApproveSelectedAssignments = useCallback(
    async (sessionId: number) => {
      const rows = assignmentsBySessionId[sessionId] ?? [];
      if (!rows.length) {
        message.warning('Phiên này chưa có assignment nào để duyệt.');
        return;
      }
      const selected = selectedAssignmentIdsBySessionId[sessionId] ?? [];
      const ids = (selected.length ? selected : rows.map((r) => r.assignmentId)).filter((id) => id > 0);
      if (!ids.length) {
        message.warning('Vui lòng chọn ít nhất một assignment để duyệt.');
        return;
      }
      try {
        setApprovingSessionId(sessionId);
        await assignmentService.approve(ids);
        message.success('Đã duyệt các assignment đã chọn.');
        const detail = await sessionService.getById(sessionId);
        const rowsReload = mapSessionAssignments(detail).filter((a) => a.staffMemberId > 0);
        setAssignmentsBySessionId((prev) => ({ ...prev, [sessionId]: rowsReload }));
        setSelectedAssignmentIdsBySessionId((prev) => ({ ...prev, [sessionId]: [] }));
        await refreshDetail();
      } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = (err as any)?.message || 'Duyệt phân công thất bại.';
        message.error(msg);
      } finally {
        setApprovingSessionId(null);
      }
    },
    [assignmentsBySessionId, selectedAssignmentIdsBySessionId, refreshDetail]
  );

  const handleOpenRejectAssignment = useCallback(
    (sessionId: number, row: SessionAssignmentRow) => {
      setRejectAssignmentState({
        open: true,
        assignmentId: row.assignmentId,
        sessionId,
        displayName: row.fullName || `Assignment #${row.assignmentId}`,
      });
      setRejectAssignmentReason('');
    },
    []
  );

  const handleConfirmRejectAssignment = async () => {
    if (!rejectAssignmentState.open || !rejectAssignmentState.assignmentId || !rejectAssignmentState.sessionId) {
      return;
    }
    const trimmed = rejectAssignmentReason.trim();
    if (!trimmed) {
      message.warning('Vui lòng nhập lý do từ chối assignment.');
      return;
    }
    try {
      setRejectAssignmentLoading(true);
      await assignmentService.reject(rejectAssignmentState.assignmentId, trimmed);
      message.success('Đã từ chối assignment.');
      const detail = await sessionService.getById(rejectAssignmentState.sessionId);
      const rowsReload = mapSessionAssignments(detail).filter((a) => a.staffMemberId > 0);
      setAssignmentsBySessionId((prev) => ({ ...prev, [rejectAssignmentState.sessionId!]: rowsReload }));
      setSelectedAssignmentIdsBySessionId((prev) => {
        const current = prev[rejectAssignmentState.sessionId!] ?? [];
        return {
          ...prev,
          [rejectAssignmentState.sessionId!]: current.filter((id) => id !== rejectAssignmentState.assignmentId),
        };
      });
      setRejectAssignmentState({ open: false, assignmentId: null, sessionId: null, displayName: '' });
      setRejectAssignmentReason('');
      await refreshDetail();
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.message || 'Từ chối assignment thất bại.';
      message.error(msg);
    } finally {
      setRejectAssignmentLoading(false);
    }
  };

  const handleConfirmApprove = useCallback(async () => {
    if (!id || sessions.length === 0) return;
    try {
      setActionLoading(true);
      for (const s of sessions) {
        const teamIds = uiAssignedTeamIdsBySessionId[s.sessionId] ?? [];
        if (teamIds.length === 0) {
          message.error(`Phiên ${s.sessionNo} chưa có đội gán.`);
          return;
        }
        const requiredTeachers = normalizeRequiredCount((s as SessionWithFlags).teachersRequired, 1);
        const requiredTas = normalizeRequiredCount((s as SessionWithFlags).tasRequired, 1);
        const teamQuantityMap = uiTeamQuantitiesBySessionId[s.sessionId] ?? {};
        const totalAssignedTeachers = teamIds.reduce(
          (sum, teamId) => sum + normalizeRequiredCount(teamQuantityMap[teamId]?.teachersRequired, 0),
          0
        );
        const totalAssignedTas = teamIds.reduce(
          (sum, teamId) => sum + normalizeRequiredCount(teamQuantityMap[teamId]?.tasRequired, 0),
          0
        );

        if (totalAssignedTeachers !== requiredTeachers || totalAssignedTas !== requiredTas) {
          message.error(
            `Phiên ${s.sessionNo} phải đúng nhu cầu ${requiredTeachers} GV / ${requiredTas} TG trước khi duyệt.`
          );
          return;
        }

        const items = teamIds
          .map((teamId) => ({
            teamId,
            teachersRequired: normalizeRequiredCount(teamQuantityMap[teamId]?.teachersRequired, 0),
            tasRequired: normalizeRequiredCount(teamQuantityMap[teamId]?.tasRequired, 0),
          }))
          .filter((item) => item.teachersRequired > 0 || item.tasRequired > 0);

        if (!items.length) {
          message.error(`Phiên ${s.sessionNo} chưa có phân bổ nhân sự hợp lệ.`);
          return;
        }
        await teamSessionApi.replaceForSession(s.sessionId, items);
      }
      await requestService.approve(Number(id), { approvedByMemberId: createdByMemberId || undefined });
      message.success('Đã gán đội và duyệt yêu cầu');
      setApproveOpen(false);
      setRightPanel(null);
      await refreshDetail();
      refreshRequestSidebar?.();
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.message || 'Gán đội hoặc duyệt yêu cầu thất bại';
      message.error(msg);
    } finally {
      setActionLoading(false);
    }
  }, [
    createdByMemberId,
    id,
    refreshDetail,
    sessions,
    uiAssignedTeamIdsBySessionId,
    uiTeamQuantitiesBySessionId,
    refreshRequestSidebar,
  ]);

  const handleRejectClick = useCallback(() => {
    if (!request || !id) return;
    setRejectReason('');
    setRejectOpen(true);
  }, [id, request]);

  const handleConfirmReject = useCallback(async () => {
    if (!id) return;
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      message.warning('Vui lòng nhập lý do từ chối');
      return;
    }
    try {
      setActionLoading(true);
      await requestService.reject(Number(id), {
        reason: trimmed,
        approvedByMemberId: createdByMemberId || undefined,
      });
      message.success('Đã từ chối yêu cầu');
      setRejectOpen(false);
      setRejectReason('');
      setRightPanel(null);
      await refreshDetail();
      refreshRequestSidebar?.();
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.message || 'Từ chối yêu cầu thất bại';
      message.error(msg);
    } finally {
      setActionLoading(false);
    }
  }, [createdByMemberId, id, rejectReason, refreshDetail, refreshRequestSidebar]);

  const handleEquipmentSuccess = useCallback(async () => {
    if (!request) return;
    const detail = await requestService.getById(Number(request.requestId));
    setRequest(detail);
    const mapped: SessionWithFlags[] =
      detail.sessions?.map((s) => {
        const anyS = s as RequestSessionSummary & {
          reservationId?: number | null;
          ReservationId?: number | null;
          status?: string;
        };
        const rawReservationId =
          anyS.reservationId ??
          anyS.ReservationId ??
          null;

        const parsed = rawReservationId != null ? Number(rawReservationId) : NaN;
        const reservationId = !Number.isNaN(parsed) && parsed > 0 ? parsed : null;
        return {
          ...s,
          reservationId,
          teamAssigned: anyS.status?.toLowerCase() === 'approved',
          equipmentReserved: reservationId != null,
        };
      }) ?? [];
    setSessions(mapped);
  }, [request]);

  const assignedCount = useMemo(() => {
    return sessions.filter((s) => {
      const teamIds = uiAssignedTeamIdsBySessionId[s.sessionId] ?? [];
      if (teamIds.length === 0) return false;

      const reqTeachers = normalizeRequiredCount((s as any).teachersRequired, 1);
      const reqTas = normalizeRequiredCount((s as any).tasRequired, 1);
      const teamQuantityMap = uiTeamQuantitiesBySessionId[s.sessionId] ?? {};
      const assignedTeachers = teamIds.reduce(
        (sum, teamId) => sum + normalizeRequiredCount(teamQuantityMap[teamId]?.teachersRequired, 0),
        0
      );
      const assignedTas = teamIds.reduce(
        (sum, teamId) => sum + normalizeRequiredCount(teamQuantityMap[teamId]?.tasRequired, 0),
        0
      );

      return assignedTeachers === reqTeachers && assignedTas === reqTas;
    }).length;
  }, [sessions, uiAssignedTeamIdsBySessionId, uiTeamQuantitiesBySessionId]);

  return {
    request,
    sessions,
    rightPanel,
    setRightPanel,
    loading,
    uiAssignedTeamIdsBySessionId,
    uiTeamQuantitiesBySessionId,
    assignmentsBySessionId,
    selectedAssignmentIdsBySessionId,
    approveOpen,
    setApproveOpen,
    rejectOpen,
    setRejectOpen,
    rejectReason,
    setRejectReason,
    actionLoading,
    approvingSessionId,
    rejectAssignmentState,
    setRejectAssignmentState,
    rejectAssignmentReason,
    setRejectAssignmentReason,
    createdByMemberId,
    assignedCount,
    handleAssignSession,
    handleQuantitiesChange,
    handleApproveClick,
    handleToggleAssignmentSelection,
    handleApproveSelectedAssignments,
    handleOpenRejectAssignment,
    handleConfirmRejectAssignment,
    handleConfirmApprove,
    handleRejectClick,
    handleConfirmReject,
    handleEquipmentSuccess,
  };
};
