import { useCallback, useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import type { RequestListItem, RequestSessionSummary } from '../request';
import requestService from '../api/requestApi';
import sessionService from '../api/sessionApi';
import { teamSessionApi } from '@/modules/team/api/teamSessionApi';
import assignmentService from '../api/assignmentApi';
import { useProgramCoordinatorId } from './useProgramCoordinatorId';
import type {
  RequestLayoutOutletContext,
  RightPanelState,
  SessionAssignmentRow,
  SessionWithFlags,
} from '../requestDetail.types';

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
      const reservationId = anyS.reservationId ?? anyS.ReservationId ?? null;
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

      const teamAssigned =
        initialTeamIds.length > 0 || s.status?.toLowerCase() === 'approved';

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
  const [suggestedTeamIdsBySessionId, setSuggestedTeamIdsBySessionId] = useState<Record<number, number[]>>({});
  const [uiAssignedTeamIdsBySessionId, setUiAssignedTeamIdsBySessionId] = useState<Record<number, number[]>>({});
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

  useEffect(() => {
    if (!id) return;
    setRightPanel(null);
    setSessions([]);
    setUiAssignedTeamIdsBySessionId({});

    const fetchData = async () => {
      try {
        setLoading(true);
        const detail = await requestService.getById(Number(id));
        setRequest(detail);
        const { mappedSessions, nextUiAssigned } = mapSessionsWithFlags(detail);
        setSessions(mappedSessions);
        setUiAssignedTeamIdsBySessionId(nextUiAssigned);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [id]);

  useEffect(() => {
    if (sessions.length === 0) return;
    let cancelled = false;
    const run = async () => {
      try {
        const pairs = await Promise.all(
          sessions.map(async (s) => {
            try {
              const teams = await sessionService.suggestTeams(s.sessionId);
              return [s.sessionId, teams.map((t) => t.teamId) as number[]] as const;
            } catch {
              return [s.sessionId, [] as number[]] as const;
            }
          })
        );
        if (cancelled) return;
        const map: Record<number, number[]> = {};
        for (const [sid, ids] of pairs) map[sid] = ids;
        setSuggestedTeamIdsBySessionId(map);
      } catch {
        // ignore
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [sessions]);

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
              const baseAssignments = (d.assignments ?? []).filter(
                (a) => a && a.assignmentId
              );
              if (!baseAssignments.length) {
                return { sessionId: d.sessionId, rows: [] as SessionAssignmentRow[] };
              }

              const rows = await Promise.all(
                baseAssignments.map(async (a: any) => {
                  try {
                    const full = await assignmentService.getById(a.assignmentId);
                    const staff = full.staffMember;
                    return {
                      assignmentId: full.assignmentId,
                      staffMemberId: full.staffMemberId,
                      staffRole: (full.staffRole || '').toUpperCase(),
                      status: full.status,
                      fullName: staff?.fullName || '—',
                      email: staff?.userEmail || '',
                      avatarUrl: staff?.avatarUrl || '',
                    } satisfies SessionAssignmentRow;
                  } catch {
                    const staff = a.staffMember ?? a.StaffMember ?? null;
                    const staffUser = staff?.user ?? staff?.User ?? null;
                    return {
                      assignmentId: Number(a.assignmentId),
                      staffMemberId: Number(a.staffMemberId ?? 0),
                      staffRole: String(a.staffRole ?? '').toUpperCase(),
                      status: String(a.status ?? ''),
                      fullName: staff?.fullName || staff?.FullName || '—',
                      email: staffUser?.email ?? staffUser?.Email ?? '',
                      avatarUrl: staff?.avatarUrl || staff?.AvatarUrl || '',
                    } satisfies SessionAssignmentRow;
                  }
                })
              );

              return { sessionId: d.sessionId, rows };
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

  const handleAssignSession = useCallback((sessionId: number, teamIds: number[]) => {
    setUiAssignedTeamIdsBySessionId((prev) => ({ ...prev, [sessionId]: teamIds }));
    setSessions((prev) =>
      prev.map((s) => (s.sessionId === sessionId ? { ...s, teamAssigned: teamIds.length > 0 } : s))
    );
  }, []);

  const handleAssignAllUi = useCallback((args: { sessionIds: number[]; teamId: number }) => {
    const { sessionIds, teamId } = args;
    if (sessionIds.length === 0 || !teamId) {
      return;
    }
    setUiAssignedTeamIdsBySessionId((prev) => {
      const next = { ...prev };
      for (const sid of sessionIds) next[sid] = [teamId];
      return next;
    });
    setSessions((prev) =>
      prev.map((s) => (sessionIds.includes(s.sessionId) ? { ...s, teamAssigned: true } : s))
    );
  }, []);

  const handleClearAllUi = useCallback((sessionIds: number[]) => {
    if (sessionIds.length === 0) return;
    setUiAssignedTeamIdsBySessionId((prev) => {
      const next = { ...prev };
      for (const sid of sessionIds) delete next[sid];
      return next;
    });
    setSessions((prev) =>
      prev.map((s) => (sessionIds.includes(s.sessionId) ? { ...s, teamAssigned: false } : s))
    );
  }, []);

  const handleQuantitiesChange = useCallback(
    (sessionId: number, data: { teachersRequired: number; tasRequired: number }) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.sessionId === sessionId
            ? { ...s, teachersRequired: data.teachersRequired, tasRequired: data.tasRequired }
            : s
        )
      );
    },
    []
  );

  const refreshDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const detail = await requestService.getById(Number(id));
      setRequest(detail);
      const { mappedSessions, nextUiAssigned } = mapSessionsWithFlags(detail);
      setSessions(mappedSessions);
      setUiAssignedTeamIdsBySessionId(nextUiAssigned);
    } finally {
      setLoading(false);
    }
  }, [id]);

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
        const rowsReload: SessionAssignmentRow[] =
          (detail.assignments ?? [])
            .filter((a) => a && a.assignmentId && a.staffMemberId)
            .map((a) => ({
              assignmentId: a!.assignmentId,
              staffMemberId: a!.staffMemberId,
              staffRole: (a!.staffRole || '').toUpperCase(),
              status: a!.status,
              fullName: a!.staffMember?.fullName || '—',
              email: a!.staffMember?.userEmail || '',
              avatarUrl: a!.staffMember?.avatarUrl || '',
            })) ?? [];
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
      const rowsReload: SessionAssignmentRow[] =
        (detail.assignments ?? [])
          .filter((a) => a && a.assignmentId && a.staffMemberId)
          .map((a) => ({
            assignmentId: a!.assignmentId,
            staffMemberId: a!.staffMemberId,
            staffRole: (a!.staffRole || '').toUpperCase(),
            status: a!.status,
            fullName: a!.staffMember?.fullName || '—',
            email: a!.staffMember?.userEmail || '',
            avatarUrl: a!.staffMember?.avatarUrl || '',
          })) ?? [];
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
        const teachersRequired = (s as SessionWithFlags).teachersRequired ?? 1;
        const tasRequired = (s as SessionWithFlags).tasRequired ?? 1;
        const items = teamIds.map((teamId) => ({
          teamId,
          teachersRequired: typeof teachersRequired === 'number' ? teachersRequired : 1,
          tasRequired: typeof tasRequired === 'number' ? tasRequired : 1,
        }));
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
  }, [createdByMemberId, id, refreshDetail, sessions, uiAssignedTeamIdsBySessionId, refreshRequestSidebar]);

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
        const reservationId = anyS.reservationId ?? anyS.ReservationId ?? null;
        return {
          ...s,
          reservationId,
          teamAssigned: anyS.status?.toLowerCase() === 'approved',
          equipmentReserved: reservationId != null,
        };
      }) ?? [];
    setSessions(mapped);
  }, [request]);

  const assignedCount = useMemo(
    () => sessions.filter((s) => s.teamAssigned).length,
    [sessions]
  );

  return {
    request,
    sessions,
    rightPanel,
    setRightPanel,
    loading,
    suggestedTeamIdsBySessionId,
    uiAssignedTeamIdsBySessionId,
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
    handleAssignAllUi,
    handleClearAllUi,
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
