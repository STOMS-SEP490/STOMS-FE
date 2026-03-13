import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { message, Spin } from 'antd';
import HoverSearch from '@/shared/components/ui/search';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import RequestHeader from '@/shared/components/request/RequestHeader';
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

  const renderMemberOption = (m: Member | SuggestedStaff) => (
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
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-medium text-slate-900 truncate">
          {m.fullName || '—'}
        </span>
        <span className="text-[11px] text-slate-500 truncate">
          {'user' in m ? (m as Member).user?.email || '—' : (m as SuggestedStaff).roleName || '—'}
        </span>
      </div>
    </div>
  );

  const buildSuggestedTooltip = (m: Member | SuggestedStaff): string => {
    if ('skills' in m) {
      const staff = m as SuggestedStaff;
      const skills =
        (staff as any).skills && Array.isArray((staff as any).skills)
          ? ((staff as any).skills as { skillName?: string }[])
              .map((s) => s.skillName)
              .filter(Boolean)
              .join(', ')
          : '';
      const skillText = skills ? `Kỹ năng: ${skills}` : 'Kỹ năng: (không có dữ liệu)';
      const workload = `Số buổi trong 30 ngày: ${staff.assignmentCountIn30Days}`;
      const match =
        staff.skillMatchCount && staff.skillMatchCount > 0
          ? `Kỹ năng khớp yêu cầu: ${staff.skillMatchCount}`
          : 'Kỹ năng khớp yêu cầu: 0';
      return `${skillText}\n${workload}\n${match}`;
    }
    const member = m as Member;
    return `Email: ${member.user?.email || '—'}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {loading && (
          <div className="fixed inset-0 bg-white/60 z-20 flex items-center justify-center">
            <Spin tip="Đang tải dữ liệu phân công cho team..." />
          </div>
        )}

        <div className="bg-white px-6 py-4 mb-2 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-gray-900">Phân công nhân sự cho team</h2>
          <p className="text-xs text-gray-500">
            Chọn yêu cầu bên trái, sau đó gán giảng viên và trợ giảng cho từng phiên của team.
          </p>
        </div>

        <div className="flex gap-4">
          {/* Sidebar requests */}
          <div className="w-[340px] bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 truncate">
                  Yêu cầu cần phân công
                </h3>
                <p className="text-[11px] text-slate-500">
                  {filteredRequests.length} yêu cầu thuộc team của bạn
                </p>
              </div>
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
                <div className="p-4 text-xs text-slate-500">
                  Chưa có yêu cầu nào có phiên của team này.
                </div>
              )}
              {filteredRequests.map((r) => {
                const isActive = r.requestId === selectedRequestId;
                return (
                  <button
                    key={r.requestId}
                    type="button"
                    onClick={() => setSelectedRequestId(r.requestId)}
                    className={`w-full text-left rounded-2xl border px-3 py-2.5 transition ${
                      isActive
                        ? 'bg-blue-50/70 border-blue-300 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-slate-900 truncate">
                          {r.requestName || '—'}
                        </div>
                        <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px] text-slate-600">
                          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 font-medium">
                            {r.requestCode}
                          </span>
                          {r.startDate && (
                            <span className="text-slate-500">
                              Bắt đầu: {dayjs(r.startDate).format('DD/MM/YYYY')}
                            </span>
                          )}
                          <span className="text-slate-500">
                            {r.sessions.length} phiên của team
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail */}
          <div className="flex-1">
            {!selectedRequest ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-sm text-slate-500">
                Chọn một yêu cầu ở cột bên trái để bắt đầu phân công nhân sự cho team.
              </div>
            ) : (
              <div className="space-y-4">
                <RequestHeader
                  title={selectedRequest.requestName || selectedRequest.requestCode}
                  status={selectedRequest.status}
                />

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Phiên của team trong yêu cầu này
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Gợi ý nhân sự lấy từ danh sách thành viên trong team.
                    </p>
                  </div>

                  {selectedRequest.sessions.length === 0 ? (
                    <div className="text-xs text-slate-500">
                      Yêu cầu này chưa có phiên nào gán cho team.
                    </div>
                  ) : (
                    <div className="space-y-3">
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
                            className="border border-slate-200 rounded-xl px-4 py-3 space-y-2"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <div className="text-sm font-semibold text-slate-900">
                                  Phiên {s.sessionNo}
                                </div>
                                <div className="text-[11px] text-slate-600">
                                  {dayjs(s.startAt).format('DD/MM/YYYY HH:mm')} -{' '}
                                  {dayjs(s.endAt).format('DD/MM/YYYY HH:mm')}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {s.location || '—'}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {assignments.length === 0 && (
                                  <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] text-amber-700">
                                    Chưa có phân công
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mt-3 space-y-3">
                              {/* Giáo viên */}
                              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <Badge className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-semibold">
                                    Giảng viên
                                  </Badge>
                                  <span className="text-[11px] text-slate-500">
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
                                          m.roleName?.toLowerCase().includes(searchText))
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
                                        className="rounded-lg bg-white px-3 py-2 border border-slate-200"
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
                                                title={buildSuggestedTooltip(m)}
                                              >
                                                {renderMemberOption(m)}
                                              </SelectItem>
                                            ))}
                                            {fallbackList.map((m) => (
                                              <SelectItem
                                                key={m.memberId}
                                                value={String(m.memberId)}
                                                className="text-xs py-1.5"
                                                title={buildSuggestedTooltip(m)}
                                              >
                                                {renderMemberOption(m)}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Trợ giảng */}
                              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <Badge className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold">
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
                                          m.roleName?.toLowerCase().includes(searchText))
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
                                        className="rounded-lg bg-white px-3 py-2 border border-slate-200"
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
                                                title={buildSuggestedTooltip(m)}
                                              >
                                                {renderMemberOption(m)}
                                              </SelectItem>
                                            ))}
                                            {fallbackList.map((m) => (
                                              <SelectItem
                                                key={m.memberId}
                                                value={String(m.memberId)}
                                                className="text-xs py-1.5"
                                                title={buildSuggestedTooltip(m)}
                                              >
                                                {renderMemberOption(m)}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Tiến độ phân công */}
                              {totalSlots > 0 && (
                                <div className="pt-1 space-y-1">
                                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                                    <span>Tiến độ phân công</span>
                                    <span>
                                      {filledSlots}/{totalSlots}
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-[#2197C0] to-emerald-400 transition-all"
                                      style={{ width: `${progress * 100}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {assignments.length > 0 && selectedRequest.sessions.length > 1 && (
                              <div className="pt-3 flex flex-wrap items-center justify-between gap-2">
                                <button
                                  type="button"
                                  className="text-[11px] text-[#2197C0] hover:text-[#208AAE] font-medium underline-offset-2 hover:underline"
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
            )}
          </div>
        </div>

        {selectedRequest && (
          <div className="max-w-6xl mx-auto mt-4 flex justify-end">
            <Button
              type="button"
              disabled={savingAll}
              className="rounded-lg bg-[#2197C0] hover:bg-[#208AAE] text-white text-xs px-5"
              onClick={() => void handleSaveAllAssignmentsForRequest()}
            >
              {savingAll ? 'Đang hoàn tất phân công...' : 'Hoàn tất phân công cho yêu cầu này'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

