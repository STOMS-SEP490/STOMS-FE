import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { Plus, X } from 'lucide-react';
import RequestHeader from '@/shared/components/request/RequestHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import type { RequestListItem, RequestSessionSummary } from '../request';
import { requestApi } from '../api/requestApi';
import { sessionApi } from '../api/sessionApi';
import { useProgramCoordinatorId } from '../hooks/useProgramCoordinatorId';
import RequestDetailTeamPanel from './RequestDetailTeamPanel';
import RequestDetailEquipmentPanel from './RequestDetailEquipmentPanel';
import RequestSessionDetailPanel from './RequestSessionDetailPanel';

type SessionWithFlags = RequestSessionSummary & {
  reservationId?: number | null;
  teamAssigned?: boolean;
  equipmentReserved?: boolean;
};

type RightPanelState =
  | { mode: 'team'; session: SessionWithFlags }
  | { mode: 'detail'; session: SessionWithFlags }
  | { mode: 'equipment' }
  | null;

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<RequestListItem | null>(null);
  const [sessions, setSessions] = useState<SessionWithFlags[]>([]);
  const [rightPanel, setRightPanel] = useState<RightPanelState>(null);
  const [loading, setLoading] = useState(false);
  const [suggestedTeamIdsBySessionId, setSuggestedTeamIdsBySessionId] = useState<Record<number, number[]>>({});
  const [uiAssignedTeamIdsBySessionId, setUiAssignedTeamIdsBySessionId] = useState<Record<number, number[]>>({});
  const createdByMemberId = useProgramCoordinatorId();

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const detail = await requestApi.getById(Number(id));
        setRequest(detail);

        const mappedSessions: SessionWithFlags[] =
          detail.sessions?.map((s) => {
            const anyS = s as RequestSessionSummary & { reservationId?: number | null };
            const reservationId = anyS.reservationId ?? null;
            return {
              ...s,
              reservationId,
              teamAssigned: s.status?.toLowerCase() === 'approved',
              equipmentReserved: reservationId != null,
            };
          }) ?? [];
        setSessions(mappedSessions);
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
    <div className="space-y-4 text-black">
      {/* SUMMARY HEADER */}
      <RequestHeader
        title={request.requestName ?? request.requestCode}
        status={request.status}
      />

      {/* META + PROGRESS */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Mã yêu cầu</p>
          <p className="font-semibold text-sm">{request.requestCode}</p>
          <p className="text-xs text-gray-500 mt-2">
            Khách hàng:{' '}
            <span className="font-medium">
              {request.customerName || 'N/A'}
            </span>
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border shadow-sm">
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

        <div className="bg-white rounded-2xl p-4 border shadow-sm flex flex-col justify-between">
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
      <Tabs defaultValue="overview" className="space-y-4 text-black">
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="constraints">Ràng buộc</TabsTrigger>
          <TabsTrigger value="attachments">Tệp đính kèm</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* ACTION BAR */}
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <Badge className="bg-amber-100 text-amber-700 text-black">Lưu ý</Badge>
              <span className="text-black">
                Vui lòng gán đội cho tất cả phiên trước khi duyệt yêu cầu.
              </span>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="border-red-300 text-red-600 bg-white"
              >
                Từ chối yêu cầu
              </Button>
              <Button
                disabled={assignedCount !== sessions.length || sessions.length === 0}
                className="bg-blue-600 text-white"
              >
                Duyệt yêu cầu
              </Button>
            </div>
          </div>

          {/* SESSION LIST */}
          <div className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
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
                    className="w-full border rounded-xl px-4 py-3 flex justify-between items-center hover:border-blue-400 hover:bg-blue-50 transition"
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
                        GV: {session.teachersRequired ?? 1}, TA: {session.tasRequired ?? 1}
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
          <div className="bg-white rounded-xl border shadow-sm p-4 text-xs text-gray-500">
            Ràng buộc giảng dạy và phân công sẽ được hiển thị ở đây (theo BR-STF,
            BR-SCH, BR-TIME...).
          </div>
        </TabsContent>

        <TabsContent value="attachments">
          <div className="bg-white rounded-xl border shadow-sm p-4 text-xs text-gray-500">
            Danh sách tệp đính kèm yêu cầu sẽ được hiển thị ở đây.
          </div>
        </TabsContent>
      </Tabs>

      {/* RIGHT SIDEBAR SLIDE-OVER FOR TEAM / EQUIPMENT */}
      {rightPanel && (
        <div className="fixed inset-0 z-40 flex justify-end">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/30"
            onClick={() => setRightPanel(null)}
          />

          {/* Panel */}
          <div className="w-full max-w-2xl h-full bg-white text-black shadow-2xl border-l flex flex-col overflow-hidden">
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

            {rightPanel.mode === 'detail' && request && (
              <div className="mx-6 mb-4">
                <RequestSessionDetailPanel
                  session={rightPanel.session}
                  requestCode={request.requestCode ?? ''}
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 pt-0">
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
    </div>
  );
}

