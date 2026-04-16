import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Users, Trash2, Plus, CircleHelp } from 'lucide-react';
import { message, Popover } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import type { Team } from '@/modules/team/team';
import assignmentApi from '@/modules/assignment/api/assignmentApi';
import type { AssignmentResponse } from '../session.types';
import type { SuggestedStaff } from '../type';
import sessionService from '../api/sessionApi';
import { teamSessionApi } from '@/modules/team/api/teamSessionApi';
import { getErrorMessage } from '@/shared/lib/errorMessage';

export type SessionForTeam = {
  sessionNo: number;
  startAt: string;
  endAt: string;
  teachersRequired?: number | null;
  tasRequired?: number | null;
};

function readTeamNumeric(team: Team | undefined, keys: readonly string[]): number | undefined {
  if (!team) return undefined;
  const record = team as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.floor(value);
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      if (!Number.isNaN(n) && n >= 0) return Math.floor(n);
    }
  }
  return undefined;
}

/** Trần GV có thể gán cho một nhóm (theo API team-suggestions). Ưu tiên tổng pool; không có dữ liệu → không giới hạn phía FE. */
function getTeamTeacherAssignCap(team: Team | undefined): number | undefined {
  const total = readTeamNumeric(team, [
    'totalTeacherCount',
    'TotalTeacherCount',
    'teachersCount',
    'TeachersCount',
    'teacherCount',
    'TeacherCount',
  ]);
  const avail = readTeamNumeric(team, [
    'availableTeacherCount',
    'availableTeachersCount',
    'AvailableTeacherCount',
    'AvailableTeachersCount',
  ]);
  if (total != null) return total;
  if (avail != null) return avail;
  return undefined;
}

function getTeamTaAssignCap(team: Team | undefined): number | undefined {
  const total = readTeamNumeric(team, ['totalTaCount', 'TotalTaCount', 'tasCount', 'TasCount', 'taCount', 'TaCount']);
  const avail = readTeamNumeric(team, [
    'availableTaCount',
    'AvailableTACount',
    'AvailableTaCount',
    'availableTACount',
  ]);
  if (total != null) return total;
  if (avail != null) return avail;
  return undefined;
}

function cappedAllocForTeam(
  team: Team | undefined,
  needTeachers: number,
  needTas: number,
): { teachersRequired: number; tasRequired: number } {
  const capT = getTeamTeacherAssignCap(team);
  const capTa = getTeamTaAssignCap(team);
  const nt = Math.max(0, needTeachers);
  const na = Math.max(0, needTas);
  return {
    teachersRequired: capT != null ? Math.min(nt, capT) : nt,
    tasRequired: capTa != null ? Math.min(na, capTa) : na,
  };
}

function isTeacherAssignmentRole(role: string | undefined | null) {
  const normalized = String(role ?? '').toUpperCase();
  return normalized.includes('TEACH') || normalized === 'TE' || normalized.includes('GV');
}

const DEFAULT_AVATAR_SRC = '/img/ava.png';

function getAvatarSrc(src?: string | null) {
  return src && String(src).trim() ? String(src) : DEFAULT_AVATAR_SRC;
}

type Props = {
  session: SessionForTeam & { sessionId: number };
  currentTeamQuantities?: Record<number, { teachersRequired: number; tasRequired: number }>;
  currentAssignedTeamIds?: number[];
  separateTeacherSelection?: boolean;
  onAssignSession: (
    sessionId: number,
    teamIds: number[],
    teamQuantities: Record<number, { teachersRequired: number; tasRequired: number }>
  ) => void;
};

export default function RequestDetailTeamPanel({
  session,
  currentTeamQuantities,
  currentAssignedTeamIds,
  separateTeacherSelection = false,
  onAssignSession,
}: Props) {
  const [suggestedTeams, setSuggestedTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamSearch, setTeamSearch] = useState('');
  const [addedTeamIds, setAddedTeamIds] = useState<number[]>([]);
  const [selectedTeacherCount, setSelectedTeacherCount] = useState(0);
  const [teamQuantities, setTeamQuantities] = useState<
    Record<number, { teachersRequired: number; tasRequired: number }>
  >({});
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [teacherEditMode, setTeacherEditMode] = useState(false);
  const [teamEditMode, setTeamEditMode] = useState(false);
  const [teacherAssignments, setTeacherAssignments] = useState<AssignmentResponse[]>([]);
  const [initialTeacherAssignments, setInitialTeacherAssignments] = useState<AssignmentResponse[]>([]);
  const [teacherSuggestionsByAssignmentId, setTeacherSuggestionsByAssignmentId] = useState<
    Record<number, SuggestedStaff[]>
  >({});
  const [initialTeacherByAssignmentId, setInitialTeacherByAssignmentId] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);
  const [teacherPickerAssignmentId, setTeacherPickerAssignmentId] = useState<number | null>(null);
  const [teacherSearchByAssignmentId, setTeacherSearchByAssignmentId] = useState<Record<number, string>>({});
  const [expandedTeamIds, setExpandedTeamIds] = useState<number[]>([]);
  const [expandedAddedTeamIds, setExpandedAddedTeamIds] = useState<number[]>([]);
  const requestedTeachers = Math.max(0, Number(session.teachersRequired ?? 0) || 0);
  const requestedTas = Math.max(0, Number(session.tasRequired ?? 0) || 0);

  useEffect(() => {
    const fetchTeams = async () => {
      setLoading(true);
      setError(null);
      try {
        const teams = await sessionService.suggestTeams(session.sessionId);
        setSuggestedTeams(teams);
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Không tải được danh sách nhóm gợi ý.';
        setError(msg);
        setSuggestedTeams([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchTeams();
  }, [session.sessionId]);

  useEffect(() => {
    if (!separateTeacherSelection) {
      setTeacherAssignments([]);
      setTeacherSuggestionsByAssignmentId({});
      setInitialTeacherByAssignmentId({});
      return;
    }
    let cancelled = false;
    const fetchTeacherAssignments = async () => {
      try {
        const detail = await sessionService.getById(session.sessionId);
        if (cancelled) return;
        const teacherSlots = (detail.Assignments ?? []).filter((a) => isTeacherAssignmentRole(a.StaffRole));
        setTeacherAssignments(teacherSlots);
        setInitialTeacherAssignments(teacherSlots);
        setInitialTeacherByAssignmentId(
          teacherSlots.reduce<Record<number, number>>((acc, slot) => {
            const assignmentId = Number(slot.AssignmentId ?? 0);
            if (assignmentId > 0) {
              acc[assignmentId] = Math.max(0, Number(slot.StaffMemberId ?? 0));
            }
            return acc;
          }, {})
        );
        const pairs = await Promise.all(
          teacherSlots.map(async (a) => {
            try {
              const list = await assignmentApi.suggestStaff(Number(a.AssignmentId ?? 0));
              return [Number(a.AssignmentId ?? 0), list] as const;
            } catch {
              const empty: SuggestedStaff[] = [];
              return [Number(a.AssignmentId ?? 0), empty] as const;
            }
          })
        );
        if (cancelled) return;
        setTeacherSuggestionsByAssignmentId(
          pairs.reduce<Record<number, SuggestedStaff[]>>((acc, [id, list]) => {
            if (id > 0) acc[id] = list;
            return acc;
          }, {})
        );
      } catch {
        if (!cancelled) {
          setTeacherAssignments([]);
          setInitialTeacherAssignments([]);
          setTeacherSuggestionsByAssignmentId({});
          setInitialTeacherByAssignmentId({});
        }
      }
    };
    void fetchTeacherAssignments();
    return () => {
      cancelled = true;
    };
  }, [session.sessionId, separateTeacherSelection]);

  const assignedIdsKey = useMemo(
    () => (currentAssignedTeamIds ?? []).slice().sort((a, b) => a - b).join(','),
    [currentAssignedTeamIds],
  );

  useEffect(() => {
    const ids = currentAssignedTeamIds ?? [];
    setAddedTeamIds(ids);
    // GV giờ được phân công riêng -> không dùng teachersRequired theo team.
    // Nếu separateTeacherSelection=true thì selectedTeacherCount sẽ được cập nhật lại dựa trên teacherAssignments.
    setSelectedTeacherCount(0);
    const next = ids.reduce<Record<number, { teachersRequired: number; tasRequired: number }>>((acc, teamId) => {
      acc[teamId] = {
        teachersRequired: 0,
        tasRequired: Math.max(0, Number(currentTeamQuantities?.[teamId]?.tasRequired ?? 0) || 0),
      };
      return acc;
    }, {});
    if (ids.length > 0 && Object.values(next).every((v) => v.teachersRequired === 0 && v.tasRequired === 0)) {
      const firstTeam = suggestedTeams.find((t) => t.teamId === ids[0]);
      next[ids[0]] = {
        teachersRequired: 0,
        tasRequired: cappedAllocForTeam(firstTeam, 0, requestedTas).tasRequired,
      };
    }
    setTeamQuantities(next);
    setShowAddTeam(false);
    
  }, [session.sessionId, assignedIdsKey, requestedTas, suggestedTeams, separateTeacherSelection, currentTeamQuantities]);

  const filteredTeams = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    const available = suggestedTeams.filter((t) => !addedTeamIds.includes(t.teamId));
    if (!q) return available;
    return available.filter((t) => t.teamName.toLowerCase().includes(q));
  }, [suggestedTeams, teamSearch, addedTeamIds]);

  const totals = useMemo(
    () =>
      addedTeamIds.reduce(
        (acc, teamId) => {
          acc.tas += Math.max(0, Number(teamQuantities[teamId]?.tasRequired ?? 0) || 0);
          return acc;
        },
        { tas: 0 }
      ),
    [addedTeamIds, teamQuantities]
  );

  const assignedTeacherCountByAssignments = useMemo(
    () =>
      teacherAssignments.reduce(
        (sum, a) => (Number(a.StaffMemberId ?? 0) > 0 ? sum + 1 : sum),
        0
      ),
    [teacherAssignments]
  );

  useEffect(() => {
    if (!separateTeacherSelection) return;
    setSelectedTeacherCount(Math.min(requestedTeachers, assignedTeacherCountByAssignments));
  }, [assignedTeacherCountByAssignments, requestedTeachers, separateTeacherSelection]);

  const updateTeamQuantity = useCallback(
    (teamId: number, nextValue: number) => {
      const safeValue = Math.max(0, nextValue);
      const current = teamQuantities[teamId] ?? { teachersRequired: 0, tasRequired: 0 };
      const otherTas = totals.tas - current.tasRequired;
      const teamRow = suggestedTeams.find((t) => t.teamId === teamId);
      const capTas = getTeamTaAssignCap(teamRow);
      const roomTas = Math.max(0, requestedTas - otherTas);
      const maxTasThisTeam = capTas != null ? Math.min(roomTas, capTas) : roomTas;

      if (safeValue > maxTasThisTeam) return;

      setTeamQuantities((prev) => ({
        ...prev,
        [teamId]: {
          teachersRequired: 0,
          tasRequired: safeValue,
        },
      }));
    },
    [requestedTas, session.sessionId, suggestedTeams, teamQuantities, totals]
  );

  const toggleTeamAdded = useCallback((teamId: number) => {
    // Khi thao tác vào nhóm khác, đóng toàn bộ dropdown đang mở để tránh hiển thị chồng.
    setExpandedTeamIds([]);
    setAddedTeamIds((prev) => {
      const exists = prev.includes(teamId);
      if (exists) {
        setTeamQuantities((prevQ) => {
          const next = { ...prevQ };
          delete next[teamId];
          return next;
        });
        return prev.filter((id) => id !== teamId);
      }

      setTeamQuantities((prevQ) => {
        const usedTas = prev.reduce((sum, id) => sum + Math.max(0, Number(prevQ[id]?.tasRequired ?? 0) || 0), 0);
        const needTa = Math.max(0, requestedTas - usedTas);
        const picked = suggestedTeams.find((t) => t.teamId === teamId);
        const capped = {
          teachersRequired: 0,
          tasRequired: cappedAllocForTeam(picked, 0, needTa).tasRequired,
        };
        return { ...prevQ, [teamId]: capped };
      });

      return [...prev, teamId];
    });
  }, [requestedTas, session.sessionId, suggestedTeams]);

  const removeAddedTeam = useCallback((teamId: number) => {
    // Khi bỏ nhóm, đóng dropdown đang mở để đồng bộ UI.
    setExpandedTeamIds([]);
    setAddedTeamIds((prev) => prev.filter((id) => id !== teamId));
    setTeamQuantities((prevQ) => {
      const next = { ...prevQ };
      delete next[teamId];
      return next;
    });
  }, [session.sessionId]);

  const getTeamMetric = useCallback((team: Team, keys: string[]) => {
    const record = team as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'number') return value;
    }
    return undefined;
  }, []);
  const toggleTeamExpanded = useCallback((teamId: number) => {
    setExpandedTeamIds((prev) => (prev.includes(teamId) ? [] : [teamId]));
  }, []);

  const toggleAddedTeamExpanded = useCallback((teamId: number) => {
    setExpandedAddedTeamIds((prev) => prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]);
  }, []);

  const changedTeacherAssignments = useMemo(
    () =>
      teacherAssignments
        .map((slot) => ({
          assignmentId: Number(slot.AssignmentId ?? 0),
          staffMemberId: Math.max(0, Number(slot.StaffMemberId ?? 0)),
        }))
        .filter(
          (item) =>
            item.assignmentId > 0 &&
            initialTeacherByAssignmentId[item.assignmentId] !== item.staffMemberId
        ),
    [initialTeacherByAssignmentId, teacherAssignments]
  );
  const hasPendingTeacherAssignmentChanges = changedTeacherAssignments.length > 0;
  const hasTeamChanges = useMemo(() => {
    const initialIds = [...(currentAssignedTeamIds ?? [])].sort((a, b) => a - b);
    const nextIds = [...addedTeamIds].sort((a, b) => a - b);
    if (initialIds.length !== nextIds.length) return true;
    if (initialIds.some((id, index) => id !== nextIds[index])) return true;

    const allIds = Array.from(new Set([...initialIds, ...nextIds]));
    return allIds.some((teamId) => {
      const initial = currentTeamQuantities?.[teamId] ?? { teachersRequired: 0, tasRequired: 0 };
      const next = teamQuantities[teamId] ?? { teachersRequired: 0, tasRequired: 0 };
      return (
        Math.max(0, Number(initial.tasRequired ?? 0) || 0) !== Math.max(0, Number(next.tasRequired ?? 0) || 0)
      );
    });
  }, [addedTeamIds, currentAssignedTeamIds, currentTeamQuantities, teamQuantities]);

  const persistTeacherAssignments = useCallback(
    async (showSuccessToast = false) => {
      if (!separateTeacherSelection || changedTeacherAssignments.length === 0) return;
      await assignmentApi.assignMembers(changedTeacherAssignments);
      setInitialTeacherAssignments(teacherAssignments);
      setInitialTeacherByAssignmentId((prev) => {
        const next = { ...prev };
        changedTeacherAssignments.forEach((item) => {
          next[item.assignmentId] = item.staffMemberId;
        });
        return next;
      });
      if (showSuccessToast) {
        message.success('Đã lưu phân công giảng viên.');
      }
    },
    [changedTeacherAssignments, separateTeacherSelection, teacherAssignments]
  );

  const handleSaveTeachersOnly = useCallback(async () => {
    if (saving) return;
    if (!hasPendingTeacherAssignmentChanges) {
      setTeacherEditMode(false);
      return;
    }
    try {
      setSaving(true);
      await persistTeacherAssignments(true);
      setTeacherEditMode(false);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Lưu phân công giảng viên thất bại.';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  }, [hasPendingTeacherAssignmentChanges, persistTeacherAssignments, saving]);

  const handleSaveTeamsOnly = useCallback(async () => {
    if (!hasTeamChanges) {
      setTeamEditMode(false);
      setShowAddTeam(false);
      return;
    }
    const finalQuantities = addedTeamIds.reduce<Record<number, { teachersRequired: number; tasRequired: number }>>((acc, teamId) => {
      acc[teamId] = {
        teachersRequired: 0,
        tasRequired: Math.max(0, Number(teamQuantities[teamId]?.tasRequired ?? 0) || 0),
      };
      return acc;
    }, {});

    try {
      setSaving(true);
      const items = addedTeamIds.map((teamId) => ({
        teamId,
        teachersRequired: 0,
        tasRequired: Math.max(0, Number(teamQuantities[teamId]?.tasRequired ?? 0) || 0),
      }));
      await teamSessionApi.replaceForSession(session.sessionId, items);
      onAssignSession(session.sessionId, addedTeamIds, finalQuantities);
      setTeamEditMode(false);
      setShowAddTeam(false);
      message.success('Đã lưu nhóm phụ trách.');
    } catch (err: unknown) {
      message.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }, [addedTeamIds, hasTeamChanges, onAssignSession, session.sessionId, teamQuantities]);

  const resetTeamDraftFromCurrent = useCallback(() => {
    const ids = currentAssignedTeamIds ?? [];
    setAddedTeamIds(ids);
    const next = ids.reduce<Record<number, { teachersRequired: number; tasRequired: number }>>((acc, teamId) => {
      acc[teamId] = {
        teachersRequired: 0,
        tasRequired: Math.max(0, Number(currentTeamQuantities?.[teamId]?.tasRequired ?? 0) || 0),
      };
      return acc;
    }, {});
    setSelectedTeacherCount(0);
    if (ids.length > 0 && Object.values(next).every((v) => v.teachersRequired === 0 && v.tasRequired === 0)) {
      const firstTeam = suggestedTeams.find((t) => t.teamId === ids[0]);
      next[ids[0]] = {
        teachersRequired: 0,
        tasRequired: cappedAllocForTeam(firstTeam, 0, requestedTas).tasRequired,
      };
    }
    setTeamQuantities(next);
    setShowAddTeam(false);
  }, [
    currentAssignedTeamIds,
    currentTeamQuantities,
    requestedTas,
    suggestedTeams,
  ]);

  const handleCancelTeacherEdit = useCallback(() => {
    setTeacherAssignments(initialTeacherAssignments);
    setTeacherPickerAssignmentId(null);
    setTeacherEditMode(false);
  }, [initialTeacherAssignments]);

  const handleCancelTeamEdit = useCallback(() => {
    resetTeamDraftFromCurrent();
    setTeamEditMode(false);
  }, [resetTeamDraftFromCurrent]);

  const handleAssignTeacherToSlot = useCallback(
    (assignmentId: number, staffMemberId: number) => {
      if (assignmentId <= 0) return;
      setTeacherAssignments((prev) =>
        prev.map((a) => {
          if (a.AssignmentId !== assignmentId) return a;
          const suggested = teacherSuggestionsByAssignmentId[assignmentId] ?? [];
          const picked = suggested.find((s) => s.memberId === staffMemberId);
          return {
            ...a,
            StaffMemberId: staffMemberId,
            StaffMember: picked
              ? {
                  MemberId: picked.memberId,
                  FullName: picked.fullName,
                  AvatarUrl: picked.avatarUrl || '',
                  Email: picked.email || '',
                  User: { Email: picked.email || '' },
                }
              : a.StaffMember,
          };
        })
      );
      setTeacherPickerAssignmentId(null);
    },
    [teacherSuggestionsByAssignmentId]
  );

  const handleLoadTeacherSuggestions = useCallback(async (assignmentId: number) => {
    if (assignmentId <= 0) return;
    try {
      const list = await assignmentApi.suggestStaff(assignmentId);
      setTeacherSuggestionsByAssignmentId((prev) => ({ ...prev, [assignmentId]: list }));
    } catch {
      setTeacherSuggestionsByAssignmentId((prev) => ({ ...prev, [assignmentId]: [] }));
    }
  }, []);

  return (
    <div className="space-y-5">
      {separateTeacherSelection ? (
        <section className="space-y-3 border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-base font-semibold text-slate-900">Giảng viên tham dự</p>
            {teacherEditMode ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-slate-200"
                  disabled={saving}
                  onClick={handleCancelTeacherEdit}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 px-2 text-xs font-medium bg-[#208aae] text-white hover:bg-[#1a7090] border-0"
                  disabled={saving}
                  onClick={() => void handleSaveTeachersOnly()}
                >
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                size="sm"
                className="h-7 px-2 text-xs font-medium bg-[#208aae] text-white hover:bg-[#1a7090] border-0"
                disabled={saving}
                onClick={() => setTeacherEditMode(true)}
              >
                {assignedTeacherCountByAssignments > 0 ? 'Chỉnh sửa' : 'Thêm'}
              </Button>
            )}
          </div>
          {teacherAssignments.length === 0 ? (
            <p className="text-xs text-slate-500">Chưa có slot giảng viên để phân công ở buổi này.</p>
          ) : teacherEditMode ? (
            <div className="space-y-2">
              {teacherAssignments.map((slot, index) => {
                const assignmentId = Number(slot.AssignmentId ?? 0);
                const suggestions = teacherSuggestionsByAssignmentId[assignmentId] ?? [];
                const selectedIdsOnOtherSlots = teacherAssignments
                  .map((s) =>
                    s.AssignmentId === assignmentId
                      ? 0
                      : Math.max(0, Number(s.StaffMemberId ?? 0))
                  )
                  .filter((id) => id > 0);
                const q = (teacherSearchByAssignmentId[assignmentId] ?? '').trim().toLowerCase();
                const filteredSuggestions = suggestions.filter((staff) => {
                  if (selectedIdsOnOtherSlots.includes(staff.memberId)) return false;
                  if (!q) return true;
                  return (
                    staff.fullName.toLowerCase().includes(q) ||
                    (staff.email ?? '').toLowerCase().includes(q) ||
                    (staff.roleName ?? '').toLowerCase().includes(q)
                  );
                });
                return (
                  <div key={assignmentId || index} className="border-b border-slate-200 bg-white py-2.5 last:border-b-0">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Giảng viên {index + 1}
                    </p>
                    <Popover
                      trigger="click"
                      open={teacherPickerAssignmentId === assignmentId}
                      onOpenChange={(visible) => {
                        setTeacherPickerAssignmentId(visible ? assignmentId : null);
                        if (visible) void handleLoadTeacherSuggestions(assignmentId);
                      }}
                      placement="bottomLeft"
                      destroyOnHidden
                      content={
                        <div className="w-[min(calc(100vw-2rem),20rem)] p-0.5">
                          <Input
                            className="h-8 text-xs border-slate-200"
                            placeholder="Tìm giảng viên..."
                            value={teacherSearchByAssignmentId[assignmentId] ?? ''}
                            onChange={(e) =>
                              setTeacherSearchByAssignmentId((prev) => ({
                                ...prev,
                                [assignmentId]: e.target.value,
                              }))
                            }
                          />
                          <div className="mt-2 max-h-56 overflow-y-auto no-scrollbar space-y-0.5">
                            {filteredSuggestions.length === 0 ? (
                              <p className="text-xs text-slate-500 px-2 py-3 text-center">Không có gợi ý phù hợp.</p>
                            ) : (
                              filteredSuggestions.map((staff) => (
                                <button
                                  key={staff.memberId}
                                  type="button"
                                  className="w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-slate-50 transition-colors"
                                  onClick={() => {
                                    handleAssignTeacherToSlot(assignmentId, staff.memberId);
                                  }}
                                >
                                  <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 shrink-0">
                                    <img
                                      src={getAvatarSrc(staff.avatarUrl)}
                                      alt={staff.fullName}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR_SRC;
                                      }}
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-slate-900 truncate">{staff.fullName || '—'}</p>
                                    <p className="text-[11px] text-slate-500 truncate">{staff.email || staff.roleName || '—'}</p>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      }
                      styles={{ content: { padding: 12 } }}
                    >
                      <button
                        type="button"
                        disabled={saving}
                        className="w-full flex items-center justify-between gap-3 bg-white px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-60"
                      >
                        {Number(slot.StaffMemberId ?? 0) > 0 ? (
                          <>
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0">
                                <img
                                  src={getAvatarSrc(slot.StaffMember?.AvatarUrl ?? null)}
                                  alt={slot.StaffMember?.FullName || 'Giảng viên đã chọn'}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR_SRC;
                                  }}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">
                                  {slot.StaffMember?.FullName || 'Giảng viên đã chọn'}
                                </p>
                                <p className="text-xs text-slate-500 truncate">
                                  {slot.StaffMember?.Email || slot.StaffMember?.User?.Email || 'Nhấn để đổi giảng viên'}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-medium text-slate-500 shrink-0">
                              {saving ? 'Đang lưu...' : 'Đổi'}
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                                <Plus className="h-5 w-5 stroke-[2.5]" />
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">Chưa chọn giảng viên</p>
                              </div>
                            </div>
                            <span className="text-xs font-medium text-violet-700 shrink-0">
                              {saving ? 'Đang lưu...' : 'Thêm'}
                            </span>
                          </>
                        )}
                      </button>
                    </Popover>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {teacherAssignments.map((slot, index) => (
                <div key={Number(slot.AssignmentId ?? 0) || index} className="border-b border-slate-200 bg-white py-2.5 last:border-b-0">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Giảng viên {index + 1}
                  </p>
                  <div className="w-full flex items-center justify-between gap-3 bg-white px-3 py-2 text-left">
                    {Number(slot.StaffMemberId ?? 0) > 0 ? (
                      <>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0">
                            <img
                              src={getAvatarSrc(slot.StaffMember?.AvatarUrl ?? null)}
                              alt={slot.StaffMember?.FullName || 'Giảng viên đã chọn'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR_SRC;
                              }}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {slot.StaffMember?.FullName || 'Giảng viên đã chọn'}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {slot.StaffMember?.Email || slot.StaffMember?.User?.Email || '—'}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-slate-400 shrink-0">Đã lưu</span>
                      </>
                    ) : (
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                          <Plus className="h-5 w-5 stroke-[2.5]" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">Chưa có giảng viên</p>
                          <p className="text-xs text-slate-500 truncate">Bấm chỉnh sửa để chọn giảng viên</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end border-t border-slate-200 pt-2">
            <span className="text-xs text-slate-500">
              Đã chọn: <span className="font-semibold text-sky-600">{selectedTeacherCount} Giảng viên</span>
              {' · '}
              Còn lại:{' '}
              <span className="font-semibold text-amber-600">{Math.max(0, requestedTeachers - selectedTeacherCount)} Giảng viên</span>
            </span>
          </div>
        </section>
      ) : null}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">Nhóm phụ trách</h3>
        {teamEditMode ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-slate-200"
              disabled={saving || loading}
              onClick={handleCancelTeamEdit}
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 px-2 text-xs font-medium bg-[#208aae] text-white hover:bg-[#1a7090] border-0"
              disabled={saving || loading}
              onClick={() => void handleSaveTeamsOnly()}
            >
              Lưu
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            className="h-7 px-2 text-xs font-medium bg-[#208aae] text-white hover:bg-[#1a7090] border-0"
            disabled={saving || loading}
            onClick={() => setTeamEditMode(true)}
          >
            {addedTeamIds.length > 0 ? 'Chỉnh sửa' : 'Thêm'}
          </Button>
        )}
      </div>

      {addedTeamIds.length === 0 && !teamEditMode && (
        <p className="text-xs text-slate-500">Chưa có nhóm được phân công.</p>
      )}

      {addedTeamIds.length > 0 && (
        <div className="space-y-3">
          {addedTeamIds.map((tid) => {
            const team = suggestedTeams.find((t) => t.teamId === tid);
            const memberCount = (team as Team & { memberCount?: number })?.memberCount;
            const isExpanded = expandedAddedTeamIds.includes(tid);
            return (
              <div
                key={tid}
                className="space-y-3 border-t border-slate-200 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{team?.teamName ?? `nhóm #${tid}`}</p>
                      <p className="text-xs text-slate-500">
                        {memberCount != null ? `${memberCount} thành viên` : 'nhóm đã gắn'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      aria-label="Xem chi tiết nhóm"
                      className="flex h-7 w-7 items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-[#eef0f3] rounded-sm transition-colors"
                      onClick={() => toggleAddedTeamExpanded(tid)}
                    >
                      <DownOutlined
                        style={{
                          fontSize: 12,
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s',
                          display: 'block',
                        }}
                      />
                    </button>
                    {teamEditMode ? (
                      <button
                        type="button"
                        onClick={() => removeAddedTeam(tid)}
                        className="p-1 text-slate-400 hover:text-red-600 transition shrink-0"
                        aria-label="Xóa nhóm"
                      >
                        <Trash2 size={18} />
                      </button>
                    ) : (
                      <span className="text-xs font-medium text-slate-400 shrink-0 pl-1">Đã lưu</span>
                    )}
                  </div>
                </div>

                {isExpanded && team && (
                  <div className="bg-[#f8f9fb] border-t border-[#eef0f3] px-4 py-3 space-y-2.5">
                    {(() => {
                      const matchedTeacher = getTeamMetric(team, ['matchingSkillTeacherCount']);
                      const matchedTa = getTeamMetric(team, ['matchingSkillTaCount']);
                      const availableTeacher = getTeamMetric(team, ['availableTeacherCount', 'availableTeachersCount']);
                      const availableTa = getTeamMetric(team, ['availableTaCount', 'availableTACount']);
                      const totalTeacher = getTeamMetric(team, ['totalTeacherCount', 'teachersCount']);
                      const totalTa = getTeamMetric(team, ['totalTaCount', 'totalTACount', 'tasCount']);
                      const hasTeacher = availableTeacher != null || totalTeacher != null;
                      const hasTa = availableTa != null || totalTa != null;
                      return (
                        <>
                          {memberCount != null && (
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-slate-500">Tổng thành viên</span>
                              <span className="text-[11px] font-semibold text-slate-800">{memberCount}</span>
                            </div>
                          )}
                          {hasTeacher && (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-slate-500">Giảng viên khả dụng</span>
                                <span className="text-[11px] font-semibold text-slate-800">{availableTeacher ?? totalTeacher ?? '—'}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-slate-500">Kĩ năng phù hợp (GV)</span>
                                <span className="text-[11px] font-semibold text-slate-800">{matchedTeacher ?? '—'}</span>
                              </div>
                            </>
                          )}
                          {hasTa && (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-slate-500">Sinh viên khả dụng</span>
                                <span className="text-[11px] font-semibold text-slate-800">{availableTa ?? totalTa ?? '—'}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-slate-500">Kĩ năng phù hợp (SV)</span>
                                <span className="text-[11px] font-semibold text-slate-800">{matchedTa ?? '—'}</span>
                              </div>
                            </>
                          )}
                          {(() => {
                            const topics = (team as Team & { topics?: { topicId: number; topicName?: string | null }[] }).topics ?? [];
                            if (topics.length === 0) return null;
                            return (
                              <div className="pt-1">
                                <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1.5">Chủ đề nhóm</p>
                                <div className="flex flex-wrap gap-1">
                                  {topics.map((t) => (
                                    <span key={t.topicId} className="inline-flex items-center bg-white text-slate-600 px-2 py-0.5 text-[10px] font-medium rounded-sm border border-[#e2e6ea]">
                                      {t.topicName || `Chủ đề #${t.topicId}`}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </>
                      );
                    })()}
                  </div>
                )}

                <div className="space-y-2.5 pt-2 border-t border-slate-200">
                  {teamEditMode ? (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-600">Số lượng sinh viên:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            updateTeamQuantity(tid, (teamQuantities[tid]?.tasRequired ?? 0) - 1)
                          }
                          className="w-8 h-8 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center text-lg leading-none"
                        >
                          −
                        </button>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={teamQuantities[tid]?.tasRequired ?? 0}
                          onChange={(e) => {
                            const raw = parseInt(e.target.value, 10) || 0;
                            updateTeamQuantity(tid, raw);
                          }}
                          className="w-12 h-8 text-center text-sm border-slate-200 px-1 [appearance:textfield]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateTeamQuantity(tid, (teamQuantities[tid]?.tasRequired ?? 0) + 1)
                          }
                          className="w-8 h-8 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center text-lg leading-none"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm text-slate-600">Số lượng sinh viên:</span>
                      <span className="text-sm font-semibold text-slate-900">{teamQuantities[tid]?.tasRequired ?? 0}</span>
                    </div>
                  )}
                  
                </div>
              </div>
            );
          })}
          <div className="flex justify-end">
            <span className="text-xs text-slate-500">
              Đã chọn: <span className="font-semibold text-sky-600">{totals.tas} Sinh viên</span>
              {' · '}
              Còn lại:{' '}
              <span className="font-semibold text-amber-600">
                {Math.max(0, requestedTas - totals.tas)} Sinh viên
              </span>
            </span>
          </div>
        </div>
      )}

      {teamEditMode && addedTeamIds.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAddTeam((v) => !v)}
          className="w-full bg-[#f3f6fb] hover:bg-[#e8edf5] text-[#0f6cbd] py-2.5 flex items-center justify-center gap-2 text-sm font-medium transition-colors rounded-sm"
        >
          <Plus className="w-4 h-4" />
          Thêm nhóm
        </button>
      )}

      {teamEditMode && (showAddTeam || addedTeamIds.length === 0) && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <CircleHelp className="w-3.5 h-3.5 shrink-0" />
            <span>Bấm vào mũi tên ở cuối để xem chi tiết năng lực và khả dụng nhân sự.</span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Tìm theo tên nhóm"
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              className="pl-9 text-sm text-slate-900 border border-slate-200 bg-white focus-visible:ring-1 focus-visible:ring-[#0f6cbd] rounded-sm h-9"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 px-1">{error}</p>
          )}

          {loading ? (
            <p className="text-xs text-slate-400 px-1">Đang tải danh sách nhóm gợi ý...</p>
          ) : filteredTeams.length === 0 ? (
            <p className="text-xs text-slate-400 px-1">Không có nhóm gợi ý phù hợp cho buổi này.</p>
          ) : (
            <div className="rounded-sm overflow-hidden">
              {filteredTeams.map((team, idx) => {
                const isExpanded = expandedTeamIds.includes(team.teamId);
                const leaderName = (team as { leader?: { fullName?: string } }).leader?.fullName?.trim() || '—';
                const memberCount =
                  (team as { members?: unknown[] }).members?.length ?? (team as { memberCount?: number }).memberCount ?? null;
                return (
                  <div
                    key={team.teamId}
                    className={`transition-colors ${idx !== 0 ? 'border-t border-[#eef0f3]' : ''}`}
                  >
                    <div
                      className="flex items-center justify-between gap-3 px-3 py-3 cursor-pointer hover:bg-[#f3f6fb]"
                      onClick={() => toggleTeamAdded(team.teamId)}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{team.teamName}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">Trưởng nhóm: {leaderName}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          aria-label="Xem chi tiết nhóm"
                          className="flex h-7 w-7 items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-[#eef0f3] rounded-sm transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTeamExpanded(team.teamId);
                          }}
                        >
                          <DownOutlined
                            style={{
                              fontSize: 12,
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s',
                              display: 'block',
                            }}
                          />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="bg-white border-t border-[#eef0f3] px-4 py-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">Tổng thành viên</span>
                          <span className="text-[11px] font-semibold text-slate-800">
                            {memberCount != null ? memberCount : '—'}
                          </span>
                        </div>

                        {(() => {
                          const matchedTeacher = getTeamMetric(team, ['matchingSkillTeacherCount']);
                          const matchedTa = getTeamMetric(team, ['matchingSkillTaCount']);
                          const availableTeacher = getTeamMetric(team, ['availableTeacherCount', 'availableTeachersCount']);
                          const availableTa = getTeamMetric(team, ['availableTaCount', 'availableTACount']);
                          const totalTeacher = getTeamMetric(team, ['totalTeacherCount', 'teachersCount']);
                          const totalTa = getTeamMetric(team, ['totalTaCount', 'totalTACount', 'tasCount']);
                          const hasTeacher = availableTeacher != null || totalTeacher != null;
                          const hasTa = availableTa != null || totalTa != null;
                          if (!hasTeacher && !hasTa) return null;
                          return (
                            <>
                              {hasTeacher && (
                                <>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-slate-500">Giảng viên khả dụng</span>
                                    <span className="text-[11px] font-semibold text-slate-800">{availableTeacher ?? totalTeacher ?? '—'}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-slate-500">Kĩ năng phù hợp (GV)</span>
                                    <span className="text-[11px] font-semibold text-slate-800">{matchedTeacher ?? '—'}</span>
                                  </div>
                                </>
                              )}
                              {hasTa && (
                                <>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-slate-500">Sinh viên khả dụng</span>
                                    <span className="text-[11px] font-semibold text-slate-800">{availableTa ?? totalTa ?? '—'}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-slate-500">Kĩ năng phù hợp</span>
                                    <span className="text-[11px] font-semibold text-slate-800">{matchedTa ?? '—'}</span>
                                  </div>
                                </>
                              )}
                            </>
                          );
                        })()}

                        {(() => {
                          const topics = (team as Team & { topics?: { topicId: number; topicName?: string | null }[] }).topics ?? [];
                          if (topics.length === 0) return null;
                          return (
                            <div className="pt-1">
                              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1.5">Chủ đề nhóm</p>
                              <div className="flex flex-wrap gap-1">
                                {topics.map((t) => (
                                  <span
                                    key={t.topicId}
                                    className="inline-flex items-center bg-white text-slate-600 px-2 py-0.5 text-[10px] font-medium rounded-sm border border-[#e2e6ea]"
                                  >
                                    {t.topicName || `Chủ đề #${t.topicId}`}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
