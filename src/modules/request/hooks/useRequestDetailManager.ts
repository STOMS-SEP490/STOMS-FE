import { useCallback, useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import type { RequestListItem, RequestSessionSummary, SessionTopicInfo } from '../request';
import requestService from '../api/requestApi';
import sessionService from '../api/sessionApi';
import { teamSessionApi } from '@/modules/team/api/teamSessionApi';
import assignmentService from '../../assignment/api/assignmentApi';
import { useProgramCoordinatorId } from './useProgramCoordinatorId';
import type { AssignmentResponse, SessionResponse } from '../session.types';
import type {
  RequestLayoutOutletContext,
  RightPanelState,
  SessionAssignmentRow,
  SessionWithFlags,
} from '../requestDetail.types';
import { getRequestStatusCode, REQUEST_STATUS } from '@/constants/status';
import { canManagerReviewAssignmentRow } from '../utils/assignmentSlotUtils';

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
        reason: String(a.reason ?? a.Reason ?? '').trim() || undefined,
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

const mapTopicFromRef = (ref: SessionResponse['SubjectSession']): SessionTopicInfo | null => {
  if (!ref) return null;
  const duration = ref.Duration != null && String(ref.Duration).trim() ? String(ref.Duration).trim() : null;
  const title = ref.Title?.trim() ? ref.Title.trim() : null;
  const description = ref.Description?.trim() ? ref.Description.trim() : null;
  if (!title && !description && !duration) return null;
  return { title, description, duration };
};

const collectSessionSkills = (raw: SessionResponse): string[] => {
  const fromSubject = (raw.SubjectSkill ?? [])
    .filter((s) => s.IsActive !== false)
    .map((s) => String(s.SkillName ?? '').trim())
    .filter(Boolean);
  const fromEvent = (raw.EventSessionSkill ?? [])
    .filter((s) => s.IsActive !== false)
    .map((s) => String(s.SkillName ?? '').trim())
    .filter(Boolean);
  return Array.from(new Set([...fromSubject, ...fromEvent]));
};

const mapSessionFromFilterItem = (raw: SessionResponse): SessionWithFlags => {
  const fromSessions = raw.TeamSessions ?? [];
  const backendTeamIds = fromSessions
    .map((ts) => ts.TeamId)
    .filter((id): id is number => typeof id === 'number' && id > 0);
  const rawReservationId = raw.ReservationId ?? null;
  const reservationNum = rawReservationId != null ? Number(rawReservationId) : NaN;
  const reservationId = !Number.isNaN(reservationNum) && reservationNum > 0 ? reservationNum : null;
  const statusText = String(raw.Status ?? '').toLowerCase();
  const teamAssigned =
    backendTeamIds.length > 0 ||
    statusText === 'approved' ||
    statusText === 'assigned' ||
    statusText === 'ongoing' ||
    statusText === 'completed';

  return {
    sessionId: Number(raw.SessionId ?? 0),
    requestId: Number(raw.RequestId ?? 0),
    sessionNo: Number(raw.SessionNo ?? 0),
    startAt: String(raw.StartAt ?? ''),
    endAt: String(raw.EndAt ?? ''),
    location: String(raw.Location ?? ''),
    status: String(raw.Status ?? ''),
    notes: String(raw.Notes ?? ''),
    teachersRequired: raw.TeachersRequired ?? null,
    tasRequired: raw.TasRequired ?? null,
    subjectSession: mapTopicFromRef(raw.SubjectSession ?? null),
    eventSession: mapTopicFromRef(raw.EventSession ?? null),
    sessionSkills: collectSessionSkills(raw),
    reservationId,
    teamAssigned,
    assignedTeamIds: backendTeamIds,
    equipmentReserved: reservationId != null,
    TeamSessions: fromSessions, // Giữ TeamSessions để đọc TasRequired
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
  /** reject = PUT /reject; cancel (Hủy yêu cầu) = PUT /cancel */
  const [rejectDialogAction, setRejectDialogAction] = useState<'reject' | 'cancel'>('reject');
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

  const applySessionState = useCallback((mappedSessions: SessionWithFlags[]) => {
    const nextUiAssigned = mappedSessions.reduce<Record<number, number[]>>((acc, s) => {
      const anyS = s as SessionWithFlags & {
        teamId?: number | null;
        TeamId?: number | null;
        teamSessions?: { teamId?: number | null; TeamId?: number | null; tasRequired?: number | null; TasRequired?: number | null }[];
        TeamSessions?: { teamId?: number | null; TeamId?: number | null; tasRequired?: number | null; TasRequired?: number | null }[];
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
    
    // Đọc TasRequired trực tiếp từ TeamSession của backend thay vì phân bổ lại
    const nextTeamQuantities = mappedSessions.reduce<
      Record<number, Record<number, { teachersRequired: number; tasRequired: number }>>
    >(
        (acc, s) => {
          const anyS = s as SessionWithFlags & {
            teamSessions?: { teamId?: number | null; TeamId?: number | null; tasRequired?: number | null; TasRequired?: number | null }[];
            TeamSessions?: { teamId?: number | null; TeamId?: number | null; tasRequired?: number | null; TasRequired?: number | null }[];
          };
          const fromSessions = anyS.teamSessions ?? anyS.TeamSessions ?? [];
          const teamIds = nextUiAssigned[s.sessionId] ?? [];
          
          // Nếu backend trả về TasRequired cho từng team, dùng giá trị đó
          const hasBackendQuantities = fromSessions.some(ts => 
            (ts.tasRequired != null && ts.tasRequired > 0) || 
            (ts.TasRequired != null && ts.TasRequired > 0)
          );
          
          if (hasBackendQuantities) {
            // Dùng giá trị TasRequired từ backend
            acc[s.sessionId] = fromSessions.reduce<Record<number, { teachersRequired: number; tasRequired: number }>>(
              (m, ts) => {
                const teamId = Number(ts.teamId ?? ts.TeamId ?? 0);
                if (teamId > 0) {
                  m[teamId] = {
                    teachersRequired: 0,
                    tasRequired: Math.max(0, Number(ts.tasRequired ?? ts.TasRequired ?? 0)),
                  };
                }
                return m;
              },
              {}
            );
          } else {
            // Fallback: phân bổ đều nếu backend không trả về
            const sortedTeamIds = [...teamIds].sort((a, b) => a - b);
            const requiredTas = normalizeRequiredCount((s as any).tasRequired, 1);
            const taDist = distributeCountByTeam(sortedTeamIds, requiredTas);
            acc[s.sessionId] = sortedTeamIds.reduce<Record<number, { teachersRequired: number; tasRequired: number }>>(
              (m, teamId, idx) => {
                m[teamId] = {
                  teachersRequired: 0,
                  tasRequired: taDist[idx]?.count ?? 0,
                };
                return m;
              },
              {}
            );
          }
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
    const items = res.Items ?? [];
    return (items as SessionResponse[])
      .map(mapSessionFromFilterItem)
      .filter((s) => Number(s.sessionId) > 0)
      .sort((a, b) => Number(a.sessionNo ?? 0) - Number(b.sessionNo ?? 0));
  }, []);

  useEffect(() => {
    if (!id) return;
    setRightPanel(null);
    setRequest(null);
    setSessions([]);
    setUiAssignedTeamIdsBySessionId({});
    setUiTeamQuantitiesBySessionId({});

    const fetchData = async () => {
      try {
        setLoading(true);
        const detail = await requestService.getById(Number(id));
        const { mappedSessions } = mapSessionsWithFlags(detail);
        const byFilter = await loadSessionsByRequestId(Number(detail.requestId ?? id));
        applySessionState(byFilter.length ? byFilter : mappedSessions);
        setRequest(detail);
      } catch (err) {
        console.error(err);
        setRequest(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [id, applySessionState, loadSessionsByRequestId]);

  const requestStatusCode = request ? getRequestStatusCode(request.status) : null;
  const shouldLoadSessionAssignments =
    viewMode === 'assignment' ||
    (requestStatusCode != null && requestStatusCode >= REQUEST_STATUS.PUBLISHED);

  useEffect(() => {
    if (!shouldLoadSessionAssignments) return;
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
              const baseAssignments = (d.Assignments ?? []).filter(
                (a) => a && a.AssignmentId
              );
              if (!baseAssignments.length) {
                return { sessionId: Number(d.SessionId ?? sid), rows: [] as SessionAssignmentRow[] };
              }

              const rows = await Promise.all(
                baseAssignments.map(async (a: AssignmentResponse) => {
                  const assignmentId = Number(a.AssignmentId ?? 0);
                  const reasonFromSession =
                    a.Reason != null && String(a.Reason).trim() ? String(a.Reason).trim() : undefined;
                  try {
                    if (assignmentId <= 0) throw new Error('Invalid assignment id');
                    const full = await assignmentService.getById(assignmentId);
                    const staff = (full as any).staffMember ?? (full as any).StaffMember;
                    const staffUser = staff?.user ?? staff?.User ?? null;
                    const reasonFromDetail =
                      full.reason != null && String(full.reason).trim()
                        ? String(full.reason).trim()
                        : undefined;
                    return {
                      assignmentId: Number((full as any).assignmentId ?? (full as any).AssignmentId ?? assignmentId),
                      staffMemberId: Number((full as any).staffMemberId ?? (full as any).StaffMemberId ?? 0),
                      staffRole: String((full as any).staffRole ?? (full as any).StaffRole ?? '').toUpperCase(),
                      status: String((full as any).status ?? (full as any).Status ?? ''),
                      reason: reasonFromDetail || reasonFromSession,
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
                    const staff = a.StaffMember ?? null;
                    const staffUser = staff?.User ?? null;
                    return {
                      assignmentId,
                      staffMemberId: Number(a.StaffMemberId ?? 0),
                      staffRole: String(a.StaffRole ?? '').toUpperCase(),
                      status: String(a.Status ?? ''),
                      reason: reasonFromSession,
                      fullName: staff?.FullName || '—',
                      email: staff?.Email ?? staffUser?.Email ?? '',
                      avatarUrl: staff?.AvatarUrl ?? '',
                    } satisfies SessionAssignmentRow;
                  }
                })
              );

              return { sessionId: Number(d.SessionId ?? sid), rows };
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
  }, [shouldLoadSessionAssignments, sessions, assignmentsBySessionId, request?.requestId]);

  const handleAssignSession = useCallback(
    (
      sessionId: number,
      teamIds: number[],
      teamQuantities: Record<number, { teachersRequired: number; tasRequired: number }>
    ) => {
      const targetSession = sessions.find((s) => s.sessionId === sessionId);
      const requiredTas = normalizeRequiredCount(
        (targetSession as SessionWithFlags | undefined)?.tasRequired,
        1
      );
      const totalTas = teamIds.reduce(
        (sum, teamId) => sum + normalizeRequiredCount(teamQuantities?.[teamId]?.tasRequired, 0),
        0
      );

      if (totalTas > requiredTas) {
        message.error(`Vui lòng giảm số lượng hoặc bớt nhóm.`);
        return;
      }

      const keptTeamIds = teamIds.filter((teamId) => {
        const tg = normalizeRequiredCount(teamQuantities?.[teamId]?.tasRequired, 0);
        return tg > 0;
      });
      const nextQty = keptTeamIds.reduce<Record<number, { teachersRequired: number; tasRequired: number }>>(
        (m, teamId) => {
          m[teamId] = {
            teachersRequired: 0,
            tasRequired: normalizeRequiredCount(teamQuantities?.[teamId]?.tasRequired, 0),
          };
          return m;
        },
        {},
      );

      setUiAssignedTeamIdsBySessionId((prev) => ({ ...prev, [sessionId]: keptTeamIds }));
      setUiTeamQuantitiesBySessionId((prev) => ({
        ...prev,
        [sessionId]: nextQty,
      }));
      setSessions((prev) =>
        prev.map((s) => (s.sessionId === sessionId ? { ...s, teamAssigned: keptTeamIds.length > 0 } : s))
      );
    },
    [sessions]
  );

  const refreshDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const detail = await requestService.getById(Number(id));
      const { mappedSessions } = mapSessionsWithFlags(detail);
      const byFilter = await loadSessionsByRequestId(Number(detail.requestId ?? id));
      applySessionState(byFilter.length ? byFilter : mappedSessions);
      setRequest(detail);
    } finally {
      setLoading(false);
    }
  }, [id, applySessionState, loadSessionsByRequestId]);

  const reloadAssignmentsForSession = useCallback(async (sessionId: number) => {
    if (!sessionId || sessionId <= 0) return;
    try {
      const detail = await sessionService.getById(sessionId);
      const rowsReload = mapSessionAssignments(detail);
      setAssignmentsBySessionId((prev) => ({ ...prev, [sessionId]: rowsReload }));
      setSelectedAssignmentIdsBySessionId((prev) => {
        const selected = prev[sessionId] ?? [];
        if (!selected.length) return prev;
        const valid = new Set(rowsReload.filter((r) => canManagerReviewAssignmentRow(r)).map((r) => r.assignmentId));
        return {
          ...prev,
          [sessionId]: selected.filter((id) => valid.has(id)),
        };
      });
    } catch {
      // keep current cached rows if reload fails
    }
  }, []);

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

  const handleToggleSelectAllReviewableAssignments = useCallback((sessionId: number) => {
    setSelectedAssignmentIdsBySessionId((prev) => {
      const sessionRows = assignmentsBySessionId[sessionId] ?? [];
      const reviewableIds = sessionRows
        .filter((r) => canManagerReviewAssignmentRow(r))
        .map((r) => r.assignmentId)
        .filter((aid) => aid > 0);
      const current = prev[sessionId] ?? [];
      const allSelected =
        reviewableIds.length > 0 && reviewableIds.every((aid) => current.includes(aid));
      const nextForSession = allSelected ? [] : reviewableIds;
      return { ...prev, [sessionId]: nextForSession };
    });
  }, [assignmentsBySessionId]);

  const handleApproveSelectedAssignments = useCallback(
    async (sessionId: number) => {
      const rows = assignmentsBySessionId[sessionId] ?? [];
      if (!rows.length) {
        message.warning('Buổi này chưa có phân công nào để duyệt.');
        return;
      }
      const selected = selectedAssignmentIdsBySessionId[sessionId] ?? [];
      if (!selected.length) {
        message.warning('Vui lòng chọn ít nhất một phân công để duyệt.');
        return;
      }
      const ids = selected
        .map((id) => Number(id))
        .filter((id) => id > 0)
        .filter((id) => {
          const row = rows.find((r) => r.assignmentId === id);
          return row != null && canManagerReviewAssignmentRow(row);
        });
      if (!ids.length) {
        message.warning(
          'Các phân công đã chọn không thể duyệt (chưa có nhân sự hoặc đã được xử lý).'
        );
        return;
      }
      try {
        setApprovingSessionId(sessionId);
        await assignmentService.approve(ids);
        message.success('Đã duyệt các phân công đã chọn.');

        const detail = await sessionService.getById(sessionId);
        const rowsReload = mapSessionAssignments(detail);
        setAssignmentsBySessionId((prev) => ({ ...prev, [sessionId]: rowsReload }));
        setSelectedAssignmentIdsBySessionId((prev) => ({ ...prev, [sessionId]: [] }));

        // Nếu tất cả assignments đều đã approved → cập nhật status session ngay lập tức
        const allApproved =
          rowsReload.length > 0 &&
          rowsReload.every((r) => {
            const s = String(r.status ?? '').toUpperCase().replace(/[\s_-]/g, '');
            const n = Number(r.status);
            return s === 'APPROVED' || s === '2' || (!Number.isNaN(n) && n === 2);
          });
        if (allApproved) {
          setSessions((prev) =>
            prev.map((s) => (s.sessionId === sessionId ? { ...s, status: '6' } : s))
          );
        }

        // Refresh entire request detail to update session status
        await refreshDetail();
        refreshRequestSidebar?.();
      } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg = (err as any)?.message || 'Duyệt phân công thất bại.';
        message.error(msg);
      } finally {
        setApprovingSessionId(null);
      }
    },
    [assignmentsBySessionId, selectedAssignmentIdsBySessionId, refreshDetail, refreshRequestSidebar]
  );

  const handleOpenRejectAssignment = useCallback(
    (sessionId: number, row: SessionAssignmentRow) => {
      setRejectAssignmentState({
        open: true,
        assignmentId: row.assignmentId,
        sessionId,
        displayName: row.fullName || `Phân công #${row.assignmentId}`,
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
      message.warning('Vui lòng nhập lý do từ chối phân công.');
      return;
    }
    try {
      setRejectAssignmentLoading(true);
      await assignmentService.reject(rejectAssignmentState.assignmentId, trimmed);
      message.success('Đã từ chối phân công.');
      const detail = await sessionService.getById(rejectAssignmentState.sessionId);
      const rowsReload = mapSessionAssignments(detail);
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
      const msg = (err as any)?.message || 'Từ chối phân công thất bại.';
      message.error(msg);
    } finally {
      setRejectAssignmentLoading(false);
    }
  };

  const handleConfirmApprove = useCallback(async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      await requestService.approve(Number(id));
      message.success('Đã duyệt yêu cầu');
      setApproveOpen(false);
      setRightPanel(null);
      await refreshDetail();
      refreshRequestSidebar?.();
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.message || 'Duyệt yêu cầu thất bại';
      message.error(msg);
    } finally {
      setActionLoading(false);
    }
  }, [
    id,
    refreshDetail,
    refreshRequestSidebar,
  ]);

  const handleSaveTeamAssignments = useCallback(async () => {
    if (!id || sessions.length === 0) return;
    try {
      setActionLoading(true);
      for (const s of sessions) {
        const teamIds = uiAssignedTeamIdsBySessionId[s.sessionId] ?? [];
        if (teamIds.length === 0) continue; // cho phép lưu từng phần
        const teamQuantityMap = uiTeamQuantitiesBySessionId[s.sessionId] ?? {};
        const items = teamIds
          .map((teamId) => ({
            teamId,
            teachersRequired: 0,
            tasRequired: normalizeRequiredCount(teamQuantityMap[teamId]?.tasRequired, 0),
          }))
          .filter((item) => item.tasRequired > 0);
        if (!items.length) continue;
        await teamSessionApi.replaceForSession(s.sessionId, items);
      }
      message.success('Đã lưu gán nhóm');
      setRightPanel(null);
      await refreshDetail();
      refreshRequestSidebar?.();
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (err as any)?.message || 'Lưu gán nhóm thất bại';
      message.error(msg);
    } finally {
      setActionLoading(false);
    }
  }, [
    id,
    refreshDetail,
    refreshRequestSidebar,
    sessions,
    uiAssignedTeamIdsBySessionId,
    uiTeamQuantitiesBySessionId,
  ]);

  const handleRejectClick = useCallback(() => {
    if (!request || !id) return;
    setRejectDialogAction('reject');
    setRejectReason('');
    setRejectOpen(true);
  }, [id, request]);

  const handleCancelRequestClick = useCallback(() => {
    if (!request || !id) return;
    setRejectDialogAction('cancel');
    setRejectReason('');
    setRejectOpen(true);
  }, [id, request]);

  const handleConfirmReject = useCallback(async () => {
    if (!id) return;
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      message.warning(
        rejectDialogAction === 'cancel' ? 'Vui lòng nhập lý do hủy' : 'Vui lòng nhập lý do từ chối',
      );
      return;
    }
    try {
      setActionLoading(true);
      if (rejectDialogAction === 'cancel') {
        await requestService.cancel(Number(id), { reason: trimmed });
        message.success('Đã hủy yêu cầu');
      } else {
        await requestService.reject(Number(id), {
          reason: trimmed,
          approvedByMemberId: createdByMemberId || undefined,
        });
        message.success('Đã từ chối yêu cầu');
      }
      setRejectOpen(false);
      setRejectReason('');
      setRejectDialogAction('reject');
      setRightPanel(null);
      await refreshDetail();
      refreshRequestSidebar?.();
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg =
        (err as any)?.message ||
        (rejectDialogAction === 'cancel' ? 'Hủy yêu cầu thất bại' : 'Từ chối yêu cầu thất bại');
      message.error(msg);
    } finally {
      setActionLoading(false);
    }
  }, [createdByMemberId, id, rejectDialogAction, rejectReason, refreshDetail, refreshRequestSidebar]);

  const handleEquipmentSuccess = useCallback(async () => {
    if (!request) return;
    const detail = await requestService.getById(Number(request.requestId));
    const byFilter = await loadSessionsByRequestId(Number(detail.requestId));
    if (byFilter.length) {
      applySessionState(byFilter);
    } else {
      const { mappedSessions } = mapSessionsWithFlags(detail);
      applySessionState(mappedSessions);
    }
    setRequest(detail);
  }, [request, loadSessionsByRequestId, applySessionState]);

  const assignedCount = useMemo(() => {
    return sessions.filter((s) => {
      const teamIds = uiAssignedTeamIdsBySessionId[s.sessionId] ?? [];
      if (teamIds.length === 0) return false;

      const reqTas = normalizeRequiredCount((s as any).tasRequired, 1);
      const teamQuantityMap = uiTeamQuantitiesBySessionId[s.sessionId] ?? {};
      const assignedTas = teamIds.reduce(
        (sum, teamId) => sum + normalizeRequiredCount(teamQuantityMap[teamId]?.tasRequired, 0),
        0
      );

      return assignedTas === reqTas;
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
    rejectDialogAction,
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
    refreshDetail,
    handleAssignSession,
    handleApproveClick,
    handleToggleAssignmentSelection,
    handleToggleSelectAllReviewableAssignments,
    handleApproveSelectedAssignments,
    handleOpenRejectAssignment,
    handleConfirmRejectAssignment,
    handleConfirmApprove,
    handleSaveTeamAssignments,
    handleRejectClick,
    handleCancelRequestClick,
    handleConfirmReject,
    handleEquipmentSuccess,
    reloadAssignmentsForSession,
  };
};
