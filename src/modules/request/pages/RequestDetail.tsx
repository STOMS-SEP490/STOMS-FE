import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import dayjs from 'dayjs';
import { Plus, X, CheckCircle2, CheckSquare } from 'lucide-react';
import { message } from 'antd';
import { Dialog } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import RequestHeader from '@/shared/components/request/RequestHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import type { RequestListItem, RequestSessionSummary } from '../request';
import { requestApi } from '../api/requestApi';
import { sessionApi } from '../api/sessionApi';
import { teamSessionApi } from '@/modules/team/api/teamSessionApi';
import { useProgramCoordinatorId } from '../hooks/useProgramCoordinatorId';
import RequestDetailTeamPanel from './RequestDetailTeamPanel';
import RequestDetailEquipmentPanel from './RequestDetailEquipmentPanel';
import RequestSessionDetailPanel from './RequestSessionDetailPanel';
import assignmentApi from '../api/assignmentApi';

type SessionWithFlags = RequestSessionSummary & {
  reservationId?: number | null;
  teamAssigned?: boolean;
  equipmentReserved?: boolean;
};

type SessionAssignmentRow = {
  assignmentId: number;
  staffMemberId: number;
  staffRole: string;
  status?: string;
  fullName: string;
  email: string;
  avatarUrl: string;
};

type RightPanelState =
  | { mode: 'team'; session: SessionWithFlags }
  | { mode: 'detail'; session: SessionWithFlags }
  | { mode: 'equipment' }
  | null;

type RequestLayoutOutletContext = {
  refreshRequestSidebar?: () => void;
  viewMode?: 'request' | 'assignment';
};

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { refreshRequestSidebar, viewMode } = useOutletContext<RequestLayoutOutletContext>();
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
  const createdByMemberId = useProgramCoordinatorId();
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
    const fetchData = async () => {
      try {
        setLoading(true);
        const detail = await requestApi.getById(Number(id));
        setRequest(detail);

        const nextUiAssigned: Record<number, number[]> = {};
        const mappedSessions: SessionWithFlags[] =
          detail.sessions?.map((s) => {
            const anyS = s as RequestSessionSummary & {
              reservationId?: number | null;
              teamId?: number | null;
              TeamId?: number | null;
              teamSessions?: { teamId?: number | null; TeamId?: number | null }[];
              TeamSessions?: { teamId?: number | null; TeamId?: number | null }[];
            };
            const reservationId = anyS.reservationId ?? null;
            const fromSessions =
              anyS.teamSessions ?? anyS.TeamSessions ?? [];
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
        setSessions(mappedSessions);
        setUiAssignedTeamIdsBySessionId(nextUiAssigned);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [id]);

  useEffect(() => {
    // Preload team-suggestions cho tất cả session để "gán cho tất cả" chỉ chạy UI, không gọi API lúc toggle.
    if (sessions.length === 0) return;
    let cancelled = false;
    const run = async () => {
      try {
        const pairs = await Promise.all(
          sessions.map(async (s) => {
            try {
              const teams = await sessionApi.suggestTeams(s.sessionId);
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

  // Khi ở tab Duyệt phân công, load assignment cho các phiên (nếu chưa có)
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
        const details = await Promise.all(missingIds.map((sid) => sessionApi.getById(sid)));
        if (cancelled) return;
        setAssignmentsBySessionId((prev) => {
          const next = { ...prev };
          details.forEach((d) => {
            const rows: SessionAssignmentRow[] =
              (d.assignments ?? [])
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
            next[d.sessionId] = rows;
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

  const refreshDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const detail = await requestApi.getById(Number(id));
      setRequest(detail);
      const nextUiAssigned: Record<number, number[]> = {};
      const mappedSessions: SessionWithFlags[] =
        detail.sessions?.map((s) => {
          const anyS = s as RequestSessionSummary & {
            reservationId?: number | null;
            teamId?: number | null;
            TeamId?: number | null;
            teamSessions?: { teamId?: number | null; TeamId?: number | null }[];
            TeamSessions?: { teamId?: number | null; TeamId?: number | null }[];
          };
          const reservationId = anyS.reservationId ?? null;
          const fromSessions = anyS.teamSessions ?? anyS.TeamSessions ?? [];
          const backendTeamIds = fromSessions
            .map((ts) => ts.teamId ?? ts.TeamId)
            .filter((tid): tid is number => typeof tid === 'number' && tid > 0);
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
        await assignmentApi.approve(ids);
        message.success('Đã duyệt các assignment đã chọn.');
        // reload assignments cho phiên này
        const detail = await sessionApi.getById(sessionId);
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
      await assignmentApi.reject(rejectAssignmentState.assignmentId, trimmed);
      message.success('Đã từ chối assignment.');
      const detail = await sessionApi.getById(rejectAssignmentState.sessionId);
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
      // 1) Gán đội lên BE cho từng session trước (PUT team-sessions/bulk)
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
      // 2) Sau khi gán xong mới duyệt yêu cầu
      await requestApi.approve(Number(id), { approvedByMemberId: createdByMemberId || undefined });
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
  }, [createdByMemberId, id, refreshDetail, sessions, uiAssignedTeamIdsBySessionId]);

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
      await requestApi.reject(Number(id), {
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
  }, [createdByMemberId, id, rejectReason, refreshDetail]);

  const handleEquipmentSuccess = useCallback(async () => {
    if (!request) return;
    const detail = await requestApi.getById(Number(request.requestId));
    setRequest(detail);
    const mapped: SessionWithFlags[] =
      detail.sessions?.map((s) => {
        const anyS = s as RequestSessionSummary & { reservationId?: number | null; status?: string };
        const reservationId = anyS.reservationId ?? null;
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

  if (!id) {
    return <div className="text-sm text-black">Không tìm thấy mã yêu cầu.</div>;
  }

  if (loading && !request) {
    return <div className="text-sm text-black p-4">Đang tải dữ liệu yêu cầu...</div>;
  }

  if (!request) {
    return <div className="text-sm text-black p-4">Không tìm thấy yêu cầu.</div>;
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 pb-6 space-y-4 text-black">
        {/* SUMMARY HEADER */}
        <RequestHeader
          title={request.requestName ?? request.requestCode}
          status={request.status}
        />

        {/* META + PROGRESS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-2">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <p className="text-xs text-gray-500 mb-1">Mã yêu cầu</p>
            <p className="font-semibold text-sm">{request.requestCode}</p>
            <p className="text-xs text-gray-500 mt-2">
              Khách hàng:{' '}
              <span className="font-medium">
                {request.customerName || 'N/A'}
              </span>
            </p>
          </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Ngày bắt đầu</p>
          <p className="font-semibold text-sm">
            {dayjs(request.startDate).format('DD/MM/YYYY')}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Số phiên yêu cầu:{' '}
            <span className="font-medium">
              {request.sessions?.length ?? request.sessionsRequired ?? 0}
            </span>
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Tiến độ gán đội</span>
            <span className="text-xs font-medium">
              {assignedCount}/{sessions.length || request.sessionsRequired || 0} phiên
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-2 bg-blue-500 rounded-full"
              style={{
                width:
                  sessions.length === 0
                    ? '0%'
                    : `${(assignedCount / sessions.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      {viewMode === 'assignment' ? (
        <div className="space-y-4 text-black">
          <div className="mb-2 sticky top-4 z-10 flex flex-wrap justify-between items-center gap-4 bg-white/95 backdrop-blur p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-slate-800 min-w-0">
              <Badge className="shrink-0 bg-sky-100 text-sky-800 border-0 text-[11px]">
                Duyệt phân công
              </Badge>
              <span className="text-gray-800">
                Xem các phiên thuộc yêu cầu này và duyệt phân công cho từng phiên sau khi Team
                Leader đã gán đủ nhân sự.
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            {sessions.length === 0 ? (
              <p className="text-xs text-gray-500">
                Yêu cầu này chưa có phiên để phân công. Vui lòng kiểm tra lại danh sách phiên.
              </p>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => {
                  const rows = assignmentsBySessionId[session.sessionId] ?? [];
                  const selectedIds = selectedAssignmentIdsBySessionId[session.sessionId] ?? [];
                  const pendingCount = rows.filter((r) => {
                    const statusText = (r.status || '').toUpperCase();
                    return statusText !== 'APPROVED' && statusText !== '2' && statusText !== 'REJECTED' && statusText !== '3';
                  }).length;
                  return (
                    <div
                      key={session.sessionId}
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 space-y-3 bg-sky-50/40"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Phiên {session.sessionNo}
                            </span>
                            <Badge className="bg-sky-50 text-sky-700 border-sky-200 text-[10px] font-semibold">
                              {session.status || 'Assigning'}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            {dayjs(session.startAt).format('DD/MM/YYYY HH:mm')} -{' '}
                            {dayjs(session.endAt).format('DD/MM/YYYY HH:mm')}
                          </p>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            <span className="font-medium text-slate-800">Giảng viên yêu cầu:</span>{' '}
                            {session.teachersRequired ?? 1}
                            {' · '}
                            <span className="font-medium text-slate-800">Trợ giảng yêu cầu:</span>{' '}
                            {session.tasRequired ?? 1}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-slate-500">
                            Pending:{' '}
                            <span className="font-semibold text-slate-800">
                              {pendingCount}
                            </span>
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-full gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-3 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={approvingSessionId === session.sessionId || pendingCount === 0}
                            onClick={() => void handleApproveSelectedAssignments(session.sessionId)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {approvingSessionId === session.sessionId
                              ? 'Đang duyệt...'
                              : selectedIds.length
                                ? 'Duyệt assignment đã chọn'
                                : 'Duyệt tất cả pending'}
                          </Button>
                        </div>
                      </div>

                      <div className="border-t border-slate-200 pt-2 space-y-1">
                        {rows.length === 0 ? (
                          <p className="text-xs text-gray-500">
                            Phiên này hiện chưa có assignment nào (hoặc chưa được Team Leader phân công).
                          </p>
                        ) : (
                          rows.map((row) => {
                            const checked = selectedIds.includes(row.assignmentId);
                            const isTeacher =
                              row.staffRole === 'TE' || row.staffRole === 'TEACHER';
                            const statusText = (row.status || '').toUpperCase();
                            const isApproved = statusText === 'APPROVED' || statusText === '2';
                            const isRejected = statusText === 'REJECTED' || statusText === '3';
                            const canReview = !isApproved && !isRejected;
                            return (
                              <div
                                key={row.assignmentId}
                                className={`flex items-center justify-between gap-3 py-1.5 px-2 rounded-lg transition-colors ${
                                  checked && canReview ? 'bg-sky-50' : 'bg-transparent'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span
                                    className={`shrink-0 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                      isTeacher
                                        ? 'bg-sky-100 text-sky-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}
                                  >
                                    {isTeacher ? 'Giảng viên' : 'Trợ giảng'}
                                  </span>
                                  <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-[10px] font-semibold text-slate-600">
                                    {row.avatarUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={row.avatarUrl}
                                        alt={row.fullName}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.currentTarget as HTMLImageElement).src = '/img/avatar.png';
                                        }}
                                      />
                                    ) : (
                                      (row.fullName || 'N')[0]
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-slate-900 truncate">
                                      {row.fullName || '—'}
                                    </p>
                                    {row.email && (
                                      <p className="text-[11px] text-slate-500 truncate">{row.email}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isApproved && (
                                    <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] px-2 py-0.5 font-semibold">
                                      Đã duyệt
                                    </span>
                                  )}
                                  {isRejected && (
                                    <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] px-2 py-0.5 font-semibold">
                                      Đã từ chối
                                    </span>
                                  )}
                                  {canReview && (
                                    <>
                                      <button
                                        type="button"
                                        className="rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-[11px] px-2 py-0.5"
                                        onClick={() =>
                                          handleOpenRejectAssignment(session.sessionId, row)
                                        }
                                      >
                                        Từ chối
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleToggleAssignmentSelection(
                                            session.sessionId,
                                            row.assignmentId
                                          )
                                        }
                                        className={`relative inline-flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
                                          checked
                                            ? 'border-emerald-500 bg-emerald-500 text-white'
                                            : 'border-slate-300 bg-white text-slate-400 hover:border-slate-400'
                                        }`}
                                        aria-label={checked ? 'Bỏ chọn assignment' : 'Chọn assignment'}
                                      >
                                        <CheckSquare
                                          className={`h-3.5 w-3.5 transition-transform ${
                                            checked ? 'scale-100' : 'scale-0'
                                          }`}
                                        />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
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
          <TabsList className="bg-transparent border-0 shadow-none p-0 mb-0">
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="constraints">Ràng buộc</TabsTrigger>
            <TabsTrigger value="attachments">Tệp đính kèm</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
          {/* ACTION BAR — nút đồng bộ màu brand như Đặt trước thiết bị */}
          <div className="mb-2 sticky top-4 z-10 flex flex-wrap justify-between items-center gap-4 bg-white/95 backdrop-blur p-4 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 text-sm text-amber-800 min-w-0">
              <Badge className="shrink-0 bg-amber-100 text-amber-800 border-0">Lưu ý</Badge>
              <span className="text-gray-800">
                Gán đội cho tất cả phiên trước khi duyệt ({assignedCount}/{sessions.length || 0}).
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg border-gray-200 text-gray-700 hover:bg-gray-50"
                disabled={String(request.status ?? '').toLowerCase() !== 'pending'}
                onClick={handleRejectClick}
              >
                Từ chối
              </Button>
              <Button
                type="button"
                disabled={
                  assignedCount !== sessions.length ||
                  sessions.length === 0 ||
                  String(request.status ?? '').toLowerCase() !== 'pending'
                }
                className="rounded-lg gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50 disabled:pointer-events-none"
                onClick={handleApproveClick}
              >
                <CheckCircle2 className="h-4 w-4" />
                Duyệt yêu cầu
              </Button>
            </div>
          </div>

          {/* SESSION LIST */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-black">Danh sách phiên học</h3>
              <Button
                onClick={() =>
                  sessions.some((s) => !s.equipmentReserved) &&
                  setRightPanel({ mode: 'equipment' })
                }
                disabled={sessions.every((s) => s.equipmentReserved)}
                className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white disabled:opacity-50"
              >
                <Plus size={16} />
                Đặt trước thiết bị
              </Button>
            </div>
            {sessions.length === 0 ? (
              <p className="text-xs text-gray-500">
                Yêu cầu này chưa có danh sách phiên chi tiết.
              </p>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.sessionId}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 hover:border-blue-300 hover:bg-blue-50/40 transition"
                  >
                    <div>
                      <p className="text-sm font-medium text-black">
                        Phiên {session.sessionNo}
                      </p>
                      <p className="text-xs text-gray-500">
                        {dayjs(session.startAt).format('DD/MM/YYYY HH:mm')} -{' '}
                        {dayjs(session.endAt).format('DD/MM/YYYY HH:mm')}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Giảng viên: {session.teachersRequired ?? 1}, Trợ giảng: {session.tasRequired ?? 1}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setRightPanel({ mode: 'team', session })
                        }
                        className="focus:outline-none cursor-pointer"
                      >
                        <Badge
                          className={
                            session.teamAssigned
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }
                        >
                          {session.teamAssigned ? 'Đã gán đội' : 'Chưa gán đội'}
                        </Badge>
                      </button>

                      <Badge
                        variant="outline"
                        className={
                          session.equipmentReserved
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 text-[11px]'
                            : 'border-gray-200 bg-gray-50 text-gray-500 text-[11px]'
                        }
                      >
                        {session.equipmentReserved ? 'Đã đặt thiết bị' : 'Chưa đặt thiết bị'}
                      </Badge>

                      <button
                        type="button"
                        onClick={() =>
                          setRightPanel({ mode: 'detail', session })
                        }
                        className="text-xs text-blue-600 underline"
                      >
                        Chi tiết
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </TabsContent>

          <TabsContent value="constraints">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-xs text-gray-500">
              Ràng buộc giảng dạy và phân công sẽ được hiển thị ở đây (theo BR-STF,
              BR-SCH, BR-TIME...).
            </div>
          </TabsContent>

          <TabsContent value="attachments">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-xs text-gray-500">
              Danh sách tệp đính kèm yêu cầu sẽ được hiển thị ở đây.
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* RIGHT SIDEBAR SLIDE-OVER FOR TEAM / EQUIPMENT */}
      {rightPanel && (
        <div className="fixed inset-0 z-40 flex justify-end">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/30"
            onClick={() => setRightPanel(null)}
          />

          {/* Panel: thu hẹp khi xem chi tiết phiên để cân bằng, đồng bộ với sidebar detail khác (vd. BorrowingDetailSidebar 560px) */}
          <div
            className={`w-full h-full bg-white text-black shadow-2xl flex flex-col overflow-hidden ${
              rightPanel.mode === 'detail' ? 'max-w-xl' : 'max-w-2xl'
            } border-l`}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                  {rightPanel.mode === 'team'
                    ? 'Đang gán đội'
                    : rightPanel.mode === 'detail'
                    ? 'Chi tiết phiên'
                    : 'Đặt trước thiết bị'}
                </p>
                {rightPanel.mode === 'equipment' ? (
                  <>
                    <h2 className="text-base font-semibold text-black">Chọn phiên & thiết bị</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Đặt thiết bị cho một hoặc nhiều phiên
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-base font-semibold text-black">
                      Phiên {rightPanel.session.sessionNo}
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

            <div className="flex-1 overflow-y-auto p-6 pt-0">
              {rightPanel.mode === 'detail' && request && (
                <RequestSessionDetailPanel
                  session={rightPanel.session}
                  requestCode={request.requestCode ?? ''}
                  assignedTeamIds={uiAssignedTeamIdsBySessionId[rightPanel.session.sessionId] ?? []}
                />
              )}
              {rightPanel.mode === 'team' && (
                <RequestDetailTeamPanel
                  session={rightPanel.session}
                  requestCode={request.requestCode ?? ''}
                  sessionsCount={sessions.length}
                  allSessions={sessions.map((s) => ({
                    sessionId: s.sessionId,
                    teachersRequired: (s as any).teachersRequired ?? null,
                    tasRequired: (s as any).tasRequired ?? null,
                  }))}
                  suggestedTeamIdsBySessionId={suggestedTeamIdsBySessionId}
                  currentAssignedTeamIds={uiAssignedTeamIdsBySessionId[rightPanel.session.sessionId] ?? []}
                  onClose={() => setRightPanel(null)}
                  onAssignSession={handleAssignSession}
                  onAssignAllUi={handleAssignAllUi}
                  onClearAllUi={handleClearAllUi}
                />
              )}
              {rightPanel.mode === 'equipment' && (
                <RequestDetailEquipmentPanel
                  sessions={sessions
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

      {/* Dialog từ chối assignment */}
      <Dialog
        open={rejectAssignmentState.open}
        onClose={() => {
          setRejectAssignmentState({ open: false, assignmentId: null, sessionId: null, displayName: '' });
          setRejectAssignmentReason('');
        }}
        title="Từ chối phân công"
        description={
          rejectAssignmentState.displayName
            ? `Assignment của: ${rejectAssignmentState.displayName}`
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
            className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs px-4"
            onClick={() => void handleConfirmRejectAssignment()}
          >
            Xác nhận từ chối
          </Button>
        </div>
      </Dialog>

      {/* Duyệt yêu cầu — form gọn, cùng tone với action bar */}
      <Dialog
        open={approveOpen}
        onClose={() => !actionLoading && setApproveOpen(false)}
        title="Xác nhận duyệt yêu cầu"
        description="Yêu cầu sẽ chuyển sang trạng thái đã duyệt."
        className="max-w-md border-0 shadow-2xl"
      >
        {request && (
          <div className="rounded-xl bg-gray-50 p-4 space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">Mã yêu cầu</span>
              <span className="font-medium text-gray-900">{request.requestCode}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">Phiên đã gán đội</span>
              <span className="font-medium text-gray-900">
                {assignedCount}/{sessions.length || 0}
              </span>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-5 mt-2 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            className="rounded-lg border-gray-200"
            disabled={actionLoading}
            onClick={() => setApproveOpen(false)}
          >
            Hủy
          </Button>
          <Button
            type="button"
            className="rounded-lg gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            disabled={actionLoading}
            onClick={handleConfirmApprove}
          >
            {actionLoading ? (
              'Đang xử lý...'
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Duyệt
              </>
            )}
          </Button>
        </div>
      </Dialog>

      {/* Từ chối yêu cầu — bắt buộc lý do */}
      <Dialog
        open={rejectOpen}
        onClose={() => !actionLoading && setRejectOpen(false)}
        title="Từ chối yêu cầu"
        description="Nhập lý do từ chối. Thao tác không thể hoàn tác."
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
              placeholder="Ví dụ: Lịch trình trùng với phiên khác..."
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
              Hủy
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-lg border-red-200 text-red-600 hover:bg-red-50"
              disabled={actionLoading}
              onClick={handleConfirmReject}
            >
              {actionLoading ? 'Đang xử lý...' : 'Từ chối'}
            </Button>
          </div>
        </div>
      </Dialog>
      </div>
    </div>
  );
}

