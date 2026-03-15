import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { message, Spin } from 'antd';
import HoverSearch from '@/shared/components/ui/search';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import RequestHeader from '@/shared/components/request/RequestHeader';
import RequestCard from '@/shared/components/request/RequestCard';
import { requestApi } from '@/modules/request/api/requestApi';
import { sessionApi, type SessionDetail } from '@/modules/request/api/sessionApi';
import { teamApi } from '@/modules/team/api/teamApi';
import memberApi from '@/modules/member/api/memberApi';
import type { Member } from '@/modules/member/member';
import axiosClient from '@/shared/lib/axios';
import { assignmentApi, type SuggestedStaff } from '@/modules/request/api/assignmentApi';

type TeamSessionLite = {
  sessionId: number;
  requestId: number;
  sessionNo: number;
  startAt: string;
  endAt: string;
  location: string;
  status: string;
};

type TeamRequestItem = {
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

export default function TeamLeaderAssignmentsPage() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<TeamRequestItem[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [sessionDetailsById, setSessionDetailsById] = useState<Record<number, SessionDetail>>({});
  const [teamMembers, setTeamMembers] = useState<Member[]>([]);
  const [suggestedByAssignmentId, setSuggestedByAssignmentId] = useState<
    Record<number, SuggestedStaff[]>
  >({});
  const [search, setSearch] = useState('');
  const [assignSelections, setAssignSelections] = useState<Record<number, number>>({});
  const [searchByAssignmentId, setSearchByAssignmentId] = useState<Record<number, string>>({});
  const [savingAll, setSavingAll] = useState(false);
  const [hoveredStaff, setHoveredStaff] = useState<{
    staff: SuggestedStaff | Member;
    assignmentId: number;
  } | null>(null);

  const loadInitial = useCallback(async () => {
    try {
      setLoading(true);
      const rawUser = JSON.parse(localStorage.getItem('user') || '{}') as { memberId?: number };
      const memberId = Number(rawUser?.memberId || 0) || undefined;
      if (!memberId) {
        setRequests([]);
        return;
      }
      // Tìm team mà member này là leader
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

      // Lấy danh sách session mà team này được gán
      const sessionsRes = await axiosClient.get<any[]>(`/sessions/by-team/${teamId}`);
      const sessionsRaw: any[] = ((sessionsRes as any)?.data ?? sessionsRes ?? []) as any[];
      const liteSessions: TeamSessionLite[] =
        (sessionsRaw ?? []).map((s: any) => ({
          sessionId: Number(s.sessionId ?? s.SessionId ?? 0),
          requestId: Number(s.requestId ?? s.RequestId ?? 0),
          sessionNo: Number(s.sessionNo ?? s.SessionNo ?? 0),
          startAt: String(s.startAt ?? s.StartAt ?? ''),
          endAt: String(s.endAt ?? s.EndAt ?? ''),
          location: String(s.location ?? s.Location ?? ''),
          status: String(s.status ?? s.Status ?? ''),
        })) ?? [];

      const sessionsByRequest = new Map<number, TeamSessionLite[]>();
      liteSessions.forEach((s) => {
        if (!s.requestId) return;
        const list = sessionsByRequest.get(s.requestId) ?? [];
        list.push(s);
        sessionsByRequest.set(s.requestId, list);
      });

      const requestIds = Array.from(sessionsByRequest.keys());
      const requestsDetail = await Promise.all(
        requestIds.map(async (id) => {
          try {
            const r = await requestApi.getById(id);
            return {
              requestId: r.requestId,
              requestCode: r.requestCode,
              requestName: r.requestName,
              customerName: r.customerName,
              subjectId: r.subjectId,
              courseId: r.courseId,
              eventId: r.eventId,
              status: r.status,
              startDate: r.startDate,
              sessions: sessionsByRequest.get(id) ?? [],
            } as TeamRequestItem;
          } catch {
            return null;
          }
        })
      );
      const validRequests = requestsDetail.filter(Boolean) as TeamRequestItem[];
      setRequests(validRequests);
      if (validRequests.length) setSelectedRequestId(validRequests[0].requestId);

      // Lấy gợi ý nhân sự: tất cả member trong team
      const membersRes = await memberApi.getMembers({
        pageNumber: 1,
        pageSize: 200,
        TeamId: teamId,
      });
      setTeamMembers(membersRes.items ?? []);
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

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter(
      (r) =>
        r.requestCode.toLowerCase().includes(q) ||
        (r.requestName ?? '').toLowerCase().includes(q)
    );
  }, [requests, search]);

  const selectedRequest = useMemo(
    () => requests.find((r) => r.requestId === selectedRequestId) ?? null,
    [requests, selectedRequestId]
  );

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
          })
        );
        const next: Record<number, SessionDetail> = {};
        details.forEach((p) => {
          if (!p) return;
          next[p[0]] = p[1];
        });
        if (Object.keys(next).length) {
          setSessionDetailsById((prev) => ({ ...prev, ...next }));
        }

        // Lấy gợi ý nhân sự cho từng assignment trong các session mới load
        const allAssignments = Object.values(next)
          .flatMap((d) => d.assignments ?? [])
          .filter(Boolean) as any[];
        const uniqueAssignmentIds = Array.from(
          new Set(
            (allAssignments ?? [])
              .map((a) => a?.assignmentId)
              .filter((x): x is number => typeof x === 'number' && x > 0)
          )
        );
        if (uniqueAssignmentIds.length) {
          const suggestionPairs = await Promise.all(
            uniqueAssignmentIds.map(async (id) => {
              try {
                const list = await assignmentApi.suggestStaff(id);
                return [id, list] as const;
              } catch {
                return null;
              }
            })
          );
          const sug: Record<number, SuggestedStaff[]> = {};
          suggestionPairs.forEach((p) => {
            if (!p) return;
            sug[p[0]] = p[1];
          });
          if (Object.keys(sug).length) {
            setSuggestedByAssignmentId((prev) => ({ ...prev, ...sug }));
          }
        }
      } catch (err) {
        console.error(err);
        message.error('Không tải được chi tiết phiên.');
      }
    },
    [sessionDetailsById]
  );

  useEffect(() => {
    if (!selectedRequest) return;
    const ids = selectedRequest.sessions.map((s) => s.sessionId).filter((id) => id > 0);
    if (ids.length) {
      void ensureSessionDetails(ids);
    }
  }, [selectedRequest, ensureSessionDetails]);

  const handleSelectStaff = useCallback((assignmentId: number, memberId: number) => {
    setAssignSelections((prev) => ({ ...prev, [assignmentId]: memberId }));
  }, []);

  const handleSaveAllAssignmentsForRequest = useCallback(
    async () => {
      if (!selectedRequest) return;
      const sessionIds = selectedRequest.sessions.map((s) => s.sessionId).filter((id) => id > 0);
      if (!sessionIds.length) {
        message.warning('Yêu cầu này không có phiên nào của team để phân công.');
        return;
      }

      // Kiểm tra thiếu slot ở bất kỳ phiên nào
      const missingPerSession: number[] = [];
      for (const s of selectedRequest.sessions) {
        const detail = sessionDetailsById[s.sessionId];
        if (!detail?.assignments?.length) continue;
        const missingSlots = detail.assignments.filter(
          (a) => !(assignSelections[a.assignmentId] || a.staffMemberId)
        );
        if (missingSlots.length > 0) {
          missingPerSession.push(s.sessionNo);
        }
      }
      if (missingPerSession.length > 0) {
        message.warning(
          `Vui lòng gán đủ giảng viên / trợ giảng cho tất cả slot trước khi hoàn tất. Còn thiếu ở phiên: ${missingPerSession.join(
            ', '
          )}.`
        );
        return;
      }

      try {
        setSavingAll(true);
        for (const s of selectedRequest.sessions) {
          const detail = sessionDetailsById[s.sessionId];
          if (!detail?.assignments?.length) continue;
          const items = detail.assignments
            .map((a) => {
              const memberId = assignSelections[a.assignmentId] ?? a.staffMemberId;
              if (!memberId) return null;
              return { AssignmentId: a.assignmentId, StaffMemberId: memberId };
            })
            .filter(Boolean) as { AssignmentId: number; StaffMemberId: number }[];
          if (!items.length) continue;
          // Gọi API gán cho từng phiên
          // eslint-disable-next-line no-await-in-loop
          await axiosClient.put(`/assignments/session/${s.sessionId}/assign-members`, {
            items,
          });
        }
        message.success('Đã hoàn tất phân công cho tất cả phiên của team trong yêu cầu này.');
        // Reload chi tiết phiên để đồng bộ UI
        await ensureSessionDetails(sessionIds);
      } catch (err) {
        console.error(err);
        message.error('Hoàn tất phân công thất bại.');
      } finally {
        setSavingAll(false);
      }
    },
    [assignSelections, ensureSessionDetails, selectedRequest, sessionDetailsById]
  );

  const handleApplyToOtherSessions = useCallback(
    (sessionId: number) => {
      const baseDetail = sessionDetailsById[sessionId];
      if (!baseDetail?.assignments?.length || !selectedRequest) return;

      const baseAssignments = baseDetail.assignments;
      // Map role group -> selected memberId
      const baseSelectedByRole: Record<string, number[]> = {};
      baseAssignments.forEach((a) => {
        const memberId = assignSelections[a.assignmentId] || a.staffMemberId;
        if (!memberId) return;
        const roleKey = String(a.staffRole ?? '').toUpperCase().includes('TA')
          ? 'TA'
          : 'TE';
        if (!baseSelectedByRole[roleKey]) baseSelectedByRole[roleKey] = [];
        if (!baseSelectedByRole[roleKey].includes(memberId)) {
          baseSelectedByRole[roleKey].push(memberId);
        }
      });
      if (!Object.keys(baseSelectedByRole).length) {
        message.warning('Vui lòng chọn ít nhất một nhân sự trong phiên hiện tại trước.');
        return;
      }

      const nextSelections: Record<number, number> = { ...assignSelections };

      selectedRequest.sessions
        .filter((s) => s.sessionId !== sessionId)
        .forEach((s) => {
          const detail = sessionDetailsById[s.sessionId];
          if (!detail?.assignments?.length) return;

          const usedPerRole: Record<string, number[]> = {};

          detail.assignments.forEach((a) => {
            const roleKey = String(a.staffRole ?? '').toUpperCase().includes('TA')
              ? 'TA'
              : 'TE';
            const candidates = baseSelectedByRole[roleKey];
            if (!candidates || !candidates.length) return;

            const suggestionList = suggestedByAssignmentId[a.assignmentId] ?? [];
            const hasSuggestionData = suggestionList.length > 0;
            const sourceList: { memberId: number }[] =
              hasSuggestionData && suggestionList.length
                ? suggestionList
                : teamMembers;

            const usedForRole = usedPerRole[roleKey] ?? [];
            const memberToApply = candidates.find(
              (id) =>
                !usedForRole.includes(id) &&
                sourceList.some((m) => m.memberId === id)
            );
            if (memberToApply) {
              // luôn ghi đè để lần áp dụng sau phản ánh lựa chọn mới nhất
              nextSelections[a.assignmentId] = memberToApply;
              usedPerRole[roleKey] = [...usedForRole, memberToApply];
            }
          });
        });

      setAssignSelections(nextSelections);
      message.success('Đã áp dụng phân công từ phiên hiện tại cho các phiên khác (nếu phù hợp).');
    },
    [assignSelections, selectedRequest, sessionDetailsById, suggestedByAssignmentId, teamMembers]
  );

  const renderMemberOption = (m: Member | SuggestedStaff) => {
    const subText =
      'user' in m
        ? (m as Member).user?.email || '—'
        : (m as SuggestedStaff).email ?? (m as SuggestedStaff).roleName ?? '—';
    return (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center text-[10px] font-semibold text-slate-600">
          {m.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={m.avatarUrl}
              alt={m.fullName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/img/avatar.png';
              }}
            />
          ) : (
            (m.fullName || 'N')[0]
          )}
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

  const renderStaffHoverCard = (staff: SuggestedStaff | Member) => {
    const isSuggested = 'skillMatchCount' in staff && 'assignmentCountIn30Days' in staff;
    if (!isSuggested) return null;
    const s = staff as SuggestedStaff;
    const skillNames =
      s.skills?.map((sk) => sk.skillName).filter(Boolean).join(', ') || '—';
    return (
      <div className="px-2 py-2 border-t border-slate-100 bg-slate-50/90 rounded-b-md">
        <div className="text-[11px] space-y-1">
          <div>
            <span className="font-medium text-slate-600">Kỹ năng: </span>
            <span className="text-slate-800">{skillNames}</span>
          </div>
          <div>
            <span className="font-medium text-slate-600">Khớp yêu cầu: </span>
            <span className="text-slate-800">{s.skillMatchCount}</span>
          </div>
          <div>
            <span className="font-medium text-slate-600">Số buổi (30 ngày): </span>
            <span className="text-slate-800">{s.assignmentCountIn30Days}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6 space-y-6 bg-slate-50">
      {loading && (
        <div className="fixed inset-0 bg-white/60 z-20 flex items-center justify-center">
          <Spin tip="Đang tải dữ liệu phân công cho team..." />
        </div>
      )}

      <div className="bg-white px-6 py-4 mb-2 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-semibold text-black">Phân công nhân sự cho team</h2>
        <p className="text-xs text-gray-500">
          Chọn yêu cầu bên trái, sau đó gán giảng viên và trợ giảng cho từng phiên của team.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Sidebar — đồng bộ style với Duyệt yêu cầu (RequestLayout) */}
        <div className="w-full lg:w-[360px] shrink-0 bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="h-full flex flex-col text-black">
            <div className="flex justify-between items-center p-4 border-b border-slate-200">
              <div className="min-w-0">
                <h2 className="font-semibold text-base text-black truncate">Danh sách yêu cầu</h2>
                <p className="text-[11px] text-slate-500">
                  {filteredRequests.length} yêu cầu thuộc team của bạn
                </p>
              </div>
              <span className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2 py-1 shrink-0">
                {filteredRequests.length}
              </span>
            </div>
            <div className="px-3 pt-2 pb-3 border-b border-slate-100">
              <HoverSearch
                value={search}
                onChange={setSearch}
                placeholder="Tìm theo mã hoặc tên yêu cầu..."
              />
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50">
              {filteredRequests.length === 0 && (
                <div className="p-4 text-sm text-gray-500">
                  Chưa có yêu cầu nào có phiên của team này.
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
                  showNeedsAction={true}
                  isActive={r.requestId === selectedRequestId}
                  onClick={() => setSelectedRequestId(r.requestId)}
                  hintText="Bấm để xem chi tiết"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-y-auto">
            {!selectedRequest ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl text-slate-400">📋</span>
                </div>
                <p className="text-sm font-medium text-black">Chọn một yêu cầu ở cột bên trái</p>
                <p className="text-xs text-gray-500 mt-1">để bắt đầu phân công nhân sự cho team.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <RequestHeader
                  title={selectedRequest.requestName || selectedRequest.requestCode}
                  status={selectedRequest.status}
                />

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-50 to-white px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Phiên của team trong yêu cầu này
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Gợi ý nhân sự lấy từ danh sách thành viên trong team.
                      </p>
                    </div>
                    <Button
                      type="button"
                      disabled={savingAll}
                      className="rounded-lg bg-[#2197C0] hover:bg-[#208AAE] text-white text-xs px-5 shrink-0"
                      onClick={() => void handleSaveAllAssignmentsForRequest()}
                    >
                      {savingAll ? 'Đang hoàn tất phân công...' : 'Hoàn tất phân công cho yêu cầu này'}
                    </Button>
                  </div>
                  <div className="p-4 space-y-3">
                  {selectedRequest.sessions.length === 0 ? (
                    <div className="text-xs text-slate-500 py-4">
                      Yêu cầu này chưa có phiên nào gán cho team.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedRequest.sessions.map((s) => {
                        const detail = sessionDetailsById[s.sessionId];
                        const assignments = detail?.assignments ?? [];
                        const teacherSlots = assignments.filter((a) =>
                          String(a.staffRole ?? '').toUpperCase().includes('TE')
                        );
                        const taSlots = assignments.filter((a) =>
                          String(a.staffRole ?? '').toUpperCase().includes('TA')
                        );
                        const totalSlots = teacherSlots.length + taSlots.length;
                        const filledSlots =
                          assignments.filter(
                            (a) => !!(assignSelections[a.assignmentId] || a.staffMemberId)
                          ).length || 0;
                        const teachersRequired =
                          (detail?.teachersRequired ?? teacherSlots.length) || 0;
                        const tasRequired =
                          (detail?.tasRequired ?? taSlots.length) || 0;
                        const progress =
                          totalSlots === 0 ? 0 : Math.min(1, filledSlots / totalSlots);

                        return (
                          <div
                            key={s.sessionId}
                            className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-sky-50/80 to-white border-b border-slate-100">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-[#2197C0]/10 flex items-center justify-center shrink-0">
                                  <span className="text-sm font-bold text-[#1978a0]">{s.sessionNo}</span>
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-slate-900">
                                    Phiên {s.sessionNo}
                                  </div>
                                  <div className="text-[11px] text-slate-600">
                                    {dayjs(s.startAt).format('DD/MM HH:mm')} → {dayjs(s.endAt).format('HH:mm')}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    {s.location || '—'}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {assignments.length === 0 && (
                                  <span className="inline-flex items-center rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                                    Chưa có phân công
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="p-4 space-y-3">
                              {/* Giảng viên */}
                              <div className="rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50/50 to-white p-3 space-y-2 shadow-sm">
                                <div className="flex items-center justify-between">
                                  <Badge className="px-2 py-0.5 rounded-lg bg-sky-100 text-sky-800 border border-sky-200 text-[11px] font-semibold">
                                    Giảng viên
                                  </Badge>
                                  <span className="text-[11px] font-medium text-slate-600">
                                    Cần: {teachersRequired || teacherSlots.length || 0}
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  {teacherSlots.length === 0 && (
                                    <div className="text-[11px] text-slate-500">
                                      Phiên này chưa có slot giáo viên (assignment).
                                    </div>
                                  )}
                                  {teacherSlots.map((a) => {
                                    const selectedId =
                                      assignSelections[a.assignmentId] ?? (a.staffMemberId ?? 0);
                                    const selectedTeacherIds = teacherSlots
                                      .map(
                                        (slot) =>
                                          assignSelections[slot.assignmentId] ??
                                          (slot.staffMemberId ?? 0)
                                      )
                                      .filter((id) => id > 0);
                                    const selectedOthers = selectedTeacherIds.filter(
                                      (id) => id !== selectedId
                                    );
                                    const searchText =
                                      searchByAssignmentId[a.assignmentId]?.toLowerCase() || '';

                                    const suggestedList = (suggestedByAssignmentId[a.assignmentId] ??
                                      []).filter(
                                      (m) =>
                                        (!selectedOthers.includes(m.memberId) ||
                                          m.memberId === selectedId) &&
                                        (!searchText ||
                                          m.fullName?.toLowerCase().includes(searchText) ||
                                          m.roleName?.toLowerCase().includes(searchText) ||
                                          m.email?.toLowerCase().includes(searchText))
                                    );

                                    const fallbackList =
                                      !suggestedByAssignmentId[a.assignmentId] ||
                                      suggestedByAssignmentId[a.assignmentId]?.length === 0
                                        ? teamMembers.filter(
                                            (m) =>
                                              (!selectedOthers.includes(m.memberId) ||
                                                m.memberId === selectedId) &&
                                              (!searchText ||
                                                m.fullName
                                                  ?.toLowerCase()
                                                  .includes(searchText) ||
                                                m.user?.email
                                                  ?.toLowerCase()
                                                  .includes(searchText))
                                          )
                                        : [];

                                    return (
                                      <div
                                        key={a.assignmentId}
                                        className="rounded-lg bg-white px-3 py-2 border border-sky-100 shadow-sm"
                                      >
                                        <Select
                                          value={selectedId ? String(selectedId) : undefined}
                                          onValueChange={(value) =>
                                            handleSelectStaff(a.assignmentId, Number(value))
                                          }
                                        >
                                          <SelectTrigger className="h-9 w-full text-xs border-none shadow-none px-0">
                                            <SelectValue placeholder="Chọn giảng viên" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <div className="px-2 pb-1 pt-1.5">
                                              <Input
                                                placeholder="Tìm giảng viên..."
                                                className="h-7 text-xs"
                                                value={searchByAssignmentId[a.assignmentId] || ''}
                                                onChange={(e) =>
                                                  setSearchByAssignmentId((prev) => ({
                                                    ...prev,
                                                    [a.assignmentId]: e.target.value,
                                                  }))
                                                }
                                              />
                                            </div>
                                            {suggestedList.map((m) => (
                                              <SelectItem
                                                key={m.memberId}
                                                value={String(m.memberId)}
                                                className="text-xs py-1.5"
                                              >
                                                <div
                                                  className="w-full"
                                                  onMouseEnter={() =>
                                                    setHoveredStaff({ staff: m, assignmentId: a.assignmentId })
                                                  }
                                                  onMouseLeave={() => setHoveredStaff(null)}
                                                >
                                                  {renderMemberOption(m)}
                                                </div>
                                              </SelectItem>
                                            ))}
                                            {fallbackList.map((m) => (
                                              <SelectItem
                                                key={m.memberId}
                                                value={String(m.memberId)}
                                                className="text-xs py-1.5"
                                              >
                                                <div
                                                  className="w-full"
                                                  onMouseEnter={() =>
                                                    setHoveredStaff({ staff: m, assignmentId: a.assignmentId })
                                                  }
                                                  onMouseLeave={() => setHoveredStaff(null)}
                                                >
                                                  {renderMemberOption(m)}
                                                </div>
                                              </SelectItem>
                                            ))}
                                            {hoveredStaff?.assignmentId === a.assignmentId &&
                                              renderStaffHoverCard(hoveredStaff.staff)}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Trợ giảng */}
                              <div className="rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/50 to-white p-3 space-y-2 shadow-sm">
                                <div className="flex items-center justify-between">
                                  <Badge className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                                    Trợ giảng
                                  </Badge>
                                  <span className="text-[11px] text-slate-500">
                                    Cần: {tasRequired || taSlots.length || 0}
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  {taSlots.length === 0 && (
                                    <div className="text-[11px] text-slate-500">
                                      Phiên này chưa có slot trợ giảng (assignment).
                                    </div>
                                  )}
                                  {taSlots.map((a) => {
                                    const selectedId =
                                      assignSelections[a.assignmentId] ?? (a.staffMemberId ?? 0);
                                    const selectedTaIds = taSlots
                                      .map(
                                        (slot) =>
                                          assignSelections[slot.assignmentId] ??
                                          (slot.staffMemberId ?? 0)
                                      )
                                      .filter((id) => id > 0);
                                    const selectedOthers = selectedTaIds.filter(
                                      (id) => id !== selectedId
                                    );
                                    const searchText =
                                      searchByAssignmentId[a.assignmentId]?.toLowerCase() || '';

                                    const suggestedList = (suggestedByAssignmentId[a.assignmentId] ??
                                      []).filter(
                                      (m) =>
                                        (!selectedOthers.includes(m.memberId) ||
                                          m.memberId === selectedId) &&
                                        (!searchText ||
                                          m.fullName?.toLowerCase().includes(searchText) ||
                                          m.roleName?.toLowerCase().includes(searchText) ||
                                          m.email?.toLowerCase().includes(searchText))
                                    );

                                    const fallbackList =
                                      !suggestedByAssignmentId[a.assignmentId] ||
                                      suggestedByAssignmentId[a.assignmentId]?.length === 0
                                        ? teamMembers.filter(
                                            (m) =>
                                              (!selectedOthers.includes(m.memberId) ||
                                                m.memberId === selectedId) &&
                                              (!searchText ||
                                                m.fullName
                                                  ?.toLowerCase()
                                                  .includes(searchText) ||
                                                m.user?.email
                                                  ?.toLowerCase()
                                                  .includes(searchText))
                                          )
                                        : [];

                                    return (
                                      <div
                                        key={a.assignmentId}
                                        className="rounded-lg bg-white px-3 py-2 border border-amber-100 shadow-sm"
                                      >
                                        <Select
                                          value={selectedId ? String(selectedId) : undefined}
                                          onValueChange={(value) =>
                                            handleSelectStaff(a.assignmentId, Number(value))
                                          }
                                        >
                                          <SelectTrigger className="h-9 w-full text-xs border-none shadow-none px-0">
                                            <SelectValue placeholder="Chọn trợ giảng" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <div className="px-2 pb-1 pt-1.5">
                                              <Input
                                                placeholder="Tìm trợ giảng..."
                                                className="h-7 text-xs"
                                                value={searchByAssignmentId[a.assignmentId] || ''}
                                                onChange={(e) =>
                                                  setSearchByAssignmentId((prev) => ({
                                                    ...prev,
                                                    [a.assignmentId]: e.target.value,
                                                  }))
                                                }
                                              />
                                            </div>
                                            {suggestedList.map((m) => (
                                              <SelectItem
                                                key={m.memberId}
                                                value={String(m.memberId)}
                                                className="text-xs py-1.5"
                                              >
                                                <div
                                                  className="w-full"
                                                  onMouseEnter={() =>
                                                    setHoveredStaff({ staff: m, assignmentId: a.assignmentId })
                                                  }
                                                  onMouseLeave={() => setHoveredStaff(null)}
                                                >
                                                  {renderMemberOption(m)}
                                                </div>
                                              </SelectItem>
                                            ))}
                                            {fallbackList.map((m) => (
                                              <SelectItem
                                                key={m.memberId}
                                                value={String(m.memberId)}
                                                className="text-xs py-1.5"
                                              >
                                                <div
                                                  className="w-full"
                                                  onMouseEnter={() =>
                                                    setHoveredStaff({ staff: m, assignmentId: a.assignmentId })
                                                  }
                                                  onMouseLeave={() => setHoveredStaff(null)}
                                                >
                                                  {renderMemberOption(m)}
                                                </div>
                                              </SelectItem>
                                            ))}
                                            {hoveredStaff?.assignmentId === a.assignmentId &&
                                              renderStaffHoverCard(hoveredStaff.staff)}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Tiến độ phân công */}
                              {totalSlots > 0 && (
                                <div className="pt-3 mt-3 border-t border-slate-100 space-y-2">
                                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-700">
                                    <span>Tiến độ phân công</span>
                                    <span className="tabular-nums">
                                      {filledSlots}/{totalSlots}
                                    </span>
                                  </div>
                                  <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden shadow-inner">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-[#2197C0] to-emerald-500 transition-all duration-300"
                                      style={{ width: `${progress * 100}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {assignments.length > 0 && selectedRequest.sessions.length > 1 && (
                              <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 mt-3">
                                <button
                                  type="button"
                                  className="text-xs font-medium text-[#2197C0] hover:text-[#1978a0] hover:bg-sky-50 rounded-lg px-3 py-1.5 transition-colors"
                                  onClick={() => handleApplyToOtherSessions(s.sessionId)}
                                >
                                  Áp dụng phân công phiên này cho các phiên khác
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}
          </div>
      </div>
    </div>
  );
}

