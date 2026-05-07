import { useState, useEffect, useMemo, useCallback } from 'react';
import { message } from 'antd';
import type { Team } from '@/modules/team/team';
import type { AssignmentResponse } from '../session.types';
import type { SuggestedStaff } from '../type';
import sessionService from '../api/sessionApi';
import assignmentApi from '@/modules/assignment/api/assignmentApi';
import { teamSessionApi } from '@/modules/team/api/teamSessionApi';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import { getRequestStatusCode, REQUEST_STATUS } from '@/constants/status';

type SessionForTeam = {
  sessionNo: number;
  startAt: string;
  endAt: string;
  teachersRequired?: number | null;
  tasRequired?: number | null;
};

type UseRequestDetailTeamPanelParams = {
  session: SessionForTeam & { sessionId: number };
  currentTeamQuantities?: Record<number, { teachersRequired: number; tasRequired: number }>;
  currentAssignedTeamIds?: number[];
  separateTeacherSelection?: boolean;
  requestStatus?: string | number | null;
  onAssignSession: (
    sessionId: number,
    teamIds: number[],
    teamQuantities: Record<number, { teachersRequired: number; tasRequired: number }>
  ) => void;
  onTeacherAssignmentUpdated?: () => void | Promise<void>;
};

function isTeacherAssignmentRole(role: string | undefined | null) {
  const normalized = String(role ?? '').toUpperCase();
  return normalized.includes('TEACH') || normalized === 'TE' || normalized.includes('GV');
}

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

export function useRequestDetailTeamPanel({
  session,
  currentTeamQuantities,
  currentAssignedTeamIds,
  separateTeacherSelection = false,
  requestStatus,
  onAssignSession,
  onTeacherAssignmentUpdated,
}: UseRequestDetailTeamPanelParams) {
  // Team suggestions state
  const [suggestedTeams, setSuggestedTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamSearch, setTeamSearch] = useState('');
  
  // Team assignment state
  const [addedTeamIds, setAddedTeamIds] = useState<number[]>([]);
  const [teamQuantities, setTeamQuantities] = useState<
    Record<number, { teachersRequired: number; tasRequired: number }>
  >({});
  const [expandedTeamIds, setExpandedTeamIds] = useState<number[]>([]);
  const [expandedAddedTeamIds, setExpandedAddedTeamIds] = useState<number[]>([]);

  // Delta validation state (isReplaceMode)
  // maxReducibleByTeam[teamId] = số TA có thể giảm an toàn (pool: Pending-null + Rejected)
  const [maxReducibleByTeam, setMaxReducibleByTeam] = useState<Record<number, number>>({});
  // originalTaByTeam[teamId] = số TA ban đầu khi mở edit (snapshot từ currentTeamQuantities)
  const [originalTaByTeam, setOriginalTaByTeam] = useState<Record<number, number>>({});
  
  // Teacher assignment state
  const [selectedTeacherCount, setSelectedTeacherCount] = useState(0);
  const [teacherAssignments, setTeacherAssignments] = useState<AssignmentResponse[]>([]);
  const [initialTeacherAssignments, setInitialTeacherAssignments] = useState<AssignmentResponse[]>([]);
  const [teacherSuggestionsByAssignmentId, setTeacherSuggestionsByAssignmentId] = useState<
    Record<number, SuggestedStaff[]>
  >({});
  const [initialTeacherByAssignmentId, setInitialTeacherByAssignmentId] = useState<Record<number, number>>({});
  const [teacherPickerAssignmentId, setTeacherPickerAssignmentId] = useState<number | null>(null);
  const [teacherSearchByAssignmentId, setTeacherSearchByAssignmentId] = useState<Record<number, string>>({});
  const [expandedTeacherIds, setExpandedTeacherIds] = useState<Set<number>>(new Set());
  
  // Session detail state (for student assignments display)
  const [sessionDetail, setSessionDetail] = useState<any>(null);
  const [sessionDetailLoading, setSessionDetailLoading] = useState(false);
  
  // Edit mode state
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [teacherEditMode, setTeacherEditMode] = useState(false);
  const [teamEditMode, setTeamEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Student approval state
  const [studentApprovalMode, setStudentApprovalMode] = useState(false);
  const [selectedStudentAssignmentIds, setSelectedStudentAssignmentIds] = useState<Set<number>>(new Set());
  const [bulkApprovingStudents, setBulkApprovingStudents] = useState(false);

  // Change team mode (đổi nhóm khi có SV bị từ chối/chưa phân công)
  const [changeTeamMode, setChangeTeamMode] = useState(false);
  
  // Reject modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingAssignmentId, setRejectingAssignmentId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingStudent, setRejectingStudent] = useState(false);
  
  const requestedTeachers = Math.max(0, Number(session.teachersRequired ?? 0) || 0);
  const requestedTas = Math.max(0, Number(session.tasRequired ?? 0) || 0);

  // Fetch team suggestions
  useEffect(() => {
    let cancelled = false;
    const fetchTeams = async () => {
      setLoading(true);
      setError(null);
      try {
        const teams = await sessionService.suggestTeams(session.sessionId);
        if (cancelled) return;
        setSuggestedTeams(teams);
      } catch (err: unknown) {
        if (cancelled) return;
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Không tải được danh sách nhóm gợi ý.';
        setError(msg);
        setSuggestedTeams([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchTeams();
    return () => {
      cancelled = true;
    };
  }, [session.sessionId]);

  // Hàm refresh sessionDetail thủ công — gọi sau khi save team để cập nhật danh sách SV
  const refreshSessionDetail = useCallback(async () => {
    const statusCode = getRequestStatusCode(requestStatus);
    const shouldLoadStudentAssignments =
      statusCode === REQUEST_STATUS.ASSIGNING ||
      statusCode === REQUEST_STATUS.PUBLISHED ||
      statusCode === REQUEST_STATUS.COMPLETED ||
      statusCode === REQUEST_STATUS.CANCELLED;
    if (!shouldLoadStudentAssignments) return;
    try {
      const detail = await sessionService.getById(session.sessionId);
      if (detail) setSessionDetail(detail);
    } catch {
      // fail-safe
    }
  }, [requestStatus, session.sessionId]);

  // Fetch session detail once — used for both teacher assignments and student assignment display
  useEffect(() => {
    const statusCode = getRequestStatusCode(requestStatus);
    const shouldLoadStudentAssignments =
      statusCode === REQUEST_STATUS.ASSIGNING ||
      statusCode === REQUEST_STATUS.PUBLISHED ||
      statusCode === REQUEST_STATUS.COMPLETED ||
      statusCode === REQUEST_STATUS.CANCELLED;

    const needsSessionDetail = separateTeacherSelection || shouldLoadStudentAssignments;

    if (!needsSessionDetail) {
      setTeacherAssignments([]);
      setTeacherSuggestionsByAssignmentId({});
      setInitialTeacherByAssignmentId({});
      setSessionDetail(null);
      setSessionDetailLoading(false);
      return;
    }

    let cancelled = false;
    const fetchSessionDetail = async () => {
      if (shouldLoadStudentAssignments) setSessionDetailLoading(true);
      try {
        const detail = await sessionService.getById(session.sessionId);
        if (cancelled) return;

        // Update session detail for student assignments display
        if (shouldLoadStudentAssignments) {
          setSessionDetail(detail);
        } else {
          setSessionDetail(null);
        }

        // Update teacher assignments
        if (separateTeacherSelection) {
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
        } else {
          setTeacherAssignments([]);
          setTeacherSuggestionsByAssignmentId({});
          setInitialTeacherByAssignmentId({});
        }
      } catch {
        if (!cancelled) {
          setTeacherAssignments([]);
          setInitialTeacherAssignments([]);
          setTeacherSuggestionsByAssignmentId({});
          setInitialTeacherByAssignmentId({});
          setSessionDetail(null);
        }
      } finally {
        if (!cancelled) setSessionDetailLoading(false);
      }
    };
    void fetchSessionDetail();
    return () => {
      cancelled = true;
    };
  }, [session.sessionId, separateTeacherSelection, requestStatus]);

  // Load maxReducible khi có assigned teams (isReplaceMode)
  // maxReducible[teamId] = số TA có thể giảm an toàn
  // = số assignments TA có status PENDING (staffMemberId=null) + REJECTED
  const loadMaxReducible = useCallback(
    async (assignedIds: number[]) => {
      if (assignedIds.length === 0) return;
      try {
        const detail = await sessionService.getById(session.sessionId);
        const assignments = (detail.Assignments ?? []).filter((a) => {
          const role = String(a.StaffRole ?? '').toUpperCase();
          return role === 'TA' || role.includes('STUDENT') || role.includes('SV');
        });

        // Lấy TeamSessions từ session detail để map teamId → leaderMemberId
        // TeamSession.Team.Members có thể chứa leader, nhưng cách đơn giản nhất:
        // dùng AssignedByMemberId = leaderMemberId của team
        // Tuy nhiên cần suggestedTeams đã load → dùng cả 2 cách:
        // Cách 1: assignment.TeamId (nếu BE trả về)
        // Cách 2: map qua leaderMemberId từ suggestedTeams (fallback)

        const maxReducible: Record<number, number> = {};

        for (const teamId of assignedIds) {
          // Lọc assignments thuộc team này
          // Ưu tiên: a.TeamId === teamId
          // Fallback: a.StaffMember?.TeamId === teamId
          // Fallback 2: a.AssignedByMemberId === leaderMemberId của team
          const team = suggestedTeams.find((t) => t.teamId === teamId);
          const leaderId = team?.leaderMemberId ?? null;

          const teamAssignments = assignments.filter((a) => {
            // Cách 1: TeamId trực tiếp trên assignment
            const directTeamId = Number(a.TeamId ?? 0);
            if (directTeamId > 0) return directTeamId === teamId;

            // Cách 2: TeamId trong StaffMember
            const memberTeamId = Number(a.StaffMember?.TeamId ?? 0);
            if (memberTeamId > 0) return memberTeamId === teamId;

            // Cách 3: AssignedByMemberId = leaderMemberId
            if (leaderId != null && leaderId > 0) {
              return Number(a.AssignedByMemberId ?? 0) === leaderId;
            }

            return false;
          });

          // Pool an toàn = Pending (staffMemberId=null/0) + Rejected
          const poolCount = teamAssignments.filter((a) => {
            const st = String(a.Status ?? '')
              .toUpperCase()
              .replace(/_/g, '')
              .replace(/ /g, '');
            const isPending = st === 'PENDING' || st === '1';
            const isRejected = st === 'REJECTED' || st === '3';
            const isUnassigned = !a.StaffMemberId || Number(a.StaffMemberId) === 0;
            return isRejected || (isPending && isUnassigned);
          }).length;

          maxReducible[teamId] = poolCount;
        }

        setMaxReducibleByTeam(maxReducible);
      } catch {
        // fail-safe: không block UI nếu load thất bại
        setMaxReducibleByTeam({});
      }
    },
    [session.sessionId, suggestedTeams],
  );

  // Sync with current assigned teams
  const assignedIdsKey = useMemo(
    () => (currentAssignedTeamIds ?? []).slice().sort((a, b) => a - b).join(','),
    [currentAssignedTeamIds],
  );

  useEffect(() => {
    const ids = currentAssignedTeamIds ?? [];
    setAddedTeamIds(ids);
    setSelectedTeacherCount(0);
    const next = ids.reduce<Record<number, { teachersRequired: number; tasRequired: number }>>((acc, teamId) => {
      acc[teamId] = {
        teachersRequired: 0,
        tasRequired: Math.max(0, Number(currentTeamQuantities?.[teamId]?.tasRequired ?? 0) || 0),
      };
      return acc;
    }, {});
    setTeamQuantities(next);
    setShowAddTeam(false);

    // Snapshot originalTaByTeam khi sync (dùng cho delta validation)
    const originalSnapshot = ids.reduce<Record<number, number>>((acc, teamId) => {
      acc[teamId] = Math.max(0, Number(currentTeamQuantities?.[teamId]?.tasRequired ?? 0) || 0);
      return acc;
    }, {});
    setOriginalTaByTeam(originalSnapshot);

    // Load maxReducible nếu đang ở replace mode (đã có assigned teams)
    if (ids.length > 0) {
      void loadMaxReducible(ids);
    } else {
      setMaxReducibleByTeam({});
    }
  }, [session.sessionId, assignedIdsKey, currentTeamQuantities]);

  // Re-run loadMaxReducible khi suggestedTeams load xong (giải quyết timing issue)
  // suggestedTeams cần thiết để map leaderMemberId → teamId (fallback)
  useEffect(() => {
    const ids = currentAssignedTeamIds ?? [];
    if (ids.length > 0 && suggestedTeams.length > 0) {
      void loadMaxReducible(ids);
    }
  }, [suggestedTeams]);

  // Computed values
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

  // Actions
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
      await onTeacherAssignmentUpdated?.();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Lưu phân công giảng viên thất bại.';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  }, [hasPendingTeacherAssignmentChanges, persistTeacherAssignments, saving, onTeacherAssignmentUpdated]);

  const handleSaveTeamsOnly = useCallback(async () => {
    if (!hasTeamChanges) {
      setTeamEditMode(false);
      setShowAddTeam(false);
      return;
    }

    // Validate: phải chọn ít nhất 1 nhóm
    if (addedTeamIds.length === 0) {
      void message.warning('Vui lòng chọn ít nhất một nhóm.');
      return;
    }

    // Validate: tổng tasRequired phải bằng session.tasRequired (nếu session cần SV)
    const needed = Math.max(0, Number(session.tasRequired ?? 0) || 0);
    if (needed > 0) {
      const totalTas = addedTeamIds.reduce(
        (sum, id) => sum + Math.max(0, Number(teamQuantities[id]?.tasRequired ?? 0) || 0),
        0,
      );
      if (totalTas !== needed) {
        const diff = needed - totalTas;
        const sign = diff > 0 ? 'thiếu' : 'dư';
        void message.error(
          `Số sinh viên phân công (${totalTas}) chưa khớp yêu cầu (${needed}). ${sign} ${Math.abs(diff)} sinh viên.`,
        );
        return;
      }
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
        tasRequired: Math.max(0, Number(teamQuantities[teamId]?.tasRequired ?? 0) || 0),
      }));
      
      const isFirstTimeAssign = !currentAssignedTeamIds || currentAssignedTeamIds.length === 0;
      
      if (isFirstTimeAssign) {
        await teamSessionApi.bulkAssignToSession(session.sessionId, items);
      } else {
        await teamSessionApi.replaceForSession(session.sessionId, items);
      }
      
      onAssignSession(session.sessionId, addedTeamIds, finalQuantities);
      setTeamEditMode(false);
      setShowAddTeam(false);
      message.success('Đã lưu nhóm phụ trách.');
      await refreshSessionDetail();
      await onTeacherAssignmentUpdated?.();
    } catch (err: unknown) {
      message.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }, [addedTeamIds, currentAssignedTeamIds, hasTeamChanges, onAssignSession, onTeacherAssignmentUpdated, refreshSessionDetail, session.sessionId, session.tasRequired, teamQuantities]);

  const handleCancelTeacherEdit = useCallback(() => {
    setTeacherAssignments(initialTeacherAssignments);
    setTeacherPickerAssignmentId(null);
    setTeacherEditMode(false);
  }, [initialTeacherAssignments]);

  const handleCancelTeamEdit = useCallback(() => {
    const ids = currentAssignedTeamIds ?? [];
    setAddedTeamIds(ids);
    const next = ids.reduce<Record<number, { teachersRequired: number; tasRequired: number }>>((acc, teamId) => {
      acc[teamId] = {
        teachersRequired: 0,
        tasRequired: Math.max(0, Number(currentTeamQuantities?.[teamId]?.tasRequired ?? 0) || 0),
      };
      return acc;
    }, {});
    setTeamQuantities(next);
    setShowAddTeam(false);
    setTeamEditMode(false);
  }, [currentAssignedTeamIds, currentTeamQuantities]);

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

  const handleToggleStudentApprovalMode = useCallback(() => {
    setStudentApprovalMode((prev) => !prev);
    setSelectedStudentAssignmentIds(new Set());
  }, []);

  const handleToggleStudentSelection = useCallback((assignmentId: number) => {
    setSelectedStudentAssignmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(assignmentId)) {
        next.delete(assignmentId);
      } else {
        next.add(assignmentId);
      }
      return next;
    });
  }, []);

  const handleToggleSelectAllStudents = useCallback((allPendingIds: number[]) => {
    setSelectedStudentAssignmentIds((prev) => {
      const allSelected = allPendingIds.every(id => prev.has(id));
      if (allSelected) {
        // Bỏ chọn tất cả
        return new Set();
      } else {
        // Chọn tất cả
        return new Set(allPendingIds);
      }
    });
  }, []);

  const handleBulkApproveStudents = useCallback(async () => {
    if (selectedStudentAssignmentIds.size === 0) {
      message.warning('Vui lòng chọn ít nhất một sinh viên để duyệt.');
      return;
    }
    try {
      setBulkApprovingStudents(true);
      const assignmentIds = Array.from(selectedStudentAssignmentIds);
      await assignmentApi.approve(assignmentIds);
      message.success(`Đã duyệt ${assignmentIds.length} sinh viên.`);
      setStudentApprovalMode(false);
      setSelectedStudentAssignmentIds(new Set());
      
      // Fetch updated session detail
      const detail = await sessionService.getById(session.sessionId);
      setSessionDetail(detail);
      
      // Trigger parent refresh to update session status
      await onTeacherAssignmentUpdated?.();
    } catch (err: unknown) {
      message.error(getErrorMessage(err));
    } finally {
      setBulkApprovingStudents(false);
    }
  }, [selectedStudentAssignmentIds, session.sessionId, onTeacherAssignmentUpdated]);

  const handleOpenRejectModal = useCallback((assignmentId: number) => {
    setRejectingAssignmentId(assignmentId);
    setRejectReason('');
    setRejectModalOpen(true);
  }, []);

  const handleConfirmRejectStudent = useCallback(async () => {
    if (!rejectingAssignmentId) return;
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      message.warning('Vui lòng nhập lý do từ chối.');
      return;
    }
    try {
      setRejectingStudent(true);
      await assignmentApi.reject(rejectingAssignmentId, trimmed);
      message.success('Đã từ chối phân công sinh viên.');
      setRejectModalOpen(false);
      setRejectingAssignmentId(null);
      setRejectReason('');
      
      // Fetch updated session detail
      const detail = await sessionService.getById(session.sessionId);
      setSessionDetail(detail);
      
      // Trigger parent refresh to update session status
      await onTeacherAssignmentUpdated?.();
    } catch (err: unknown) {
      message.error(getErrorMessage(err));
    } finally {
      setRejectingStudent(false);
    }
  }, [rejectingAssignmentId, rejectReason, session.sessionId, onTeacherAssignmentUpdated]);

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

      // isReplaceMode: validate delta giảm không vượt quá pool an toàn
      const isReplaceMode = (currentAssignedTeamIds ?? []).length > 0;
      if (isReplaceMode && safeValue < current.tasRequired) {
        const original = originalTaByTeam[teamId] ?? current.tasRequired;
        const reduction = original - safeValue; // tổng giảm so với ban đầu
        const maxReducible = maxReducibleByTeam[teamId] ?? 0;
        if (reduction > maxReducible) {
          void message.error(
            `Đội này chỉ có thể giảm tối đa ${maxReducible} sinh viên (còn ${maxReducible} phân công chưa được gán nhân sự).`,
          );
          return;
        }
      }

      setTeamQuantities((prev) => ({
        ...prev,
        [teamId]: {
          teachersRequired: 0,
          tasRequired: safeValue,
        },
      }));
    },
    [currentAssignedTeamIds, maxReducibleByTeam, originalTaByTeam, requestedTas, suggestedTeams, teamQuantities, totals]
  );

  const toggleTeamAdded = useCallback((teamId: number) => {
    setExpandedTeamIds([]);
    const exists = addedTeamIds.includes(teamId);
    
    if (exists) {
      // Bỏ team
      setAddedTeamIds((prev) => prev.filter((id) => id !== teamId));
      setTeamQuantities((prevQ) => {
        const next = { ...prevQ };
        delete next[teamId];
        return next;
      });
    } else {
      // Thêm team mới
      setAddedTeamIds((prev) => [...prev, teamId]);
      setTeamQuantities((prevQ) => {
        // Tính số TA đã dùng từ các team hiện tại (bao gồm cả team đang được thêm)
        const usedTas = addedTeamIds.reduce((sum, id) => sum + Math.max(0, Number(prevQ[id]?.tasRequired ?? 0) || 0), 0);
        const needTa = Math.max(0, requestedTas - usedTas);
        const picked = suggestedTeams.find((t) => t.teamId === teamId);
        const capped = {
          teachersRequired: 0,
          tasRequired: cappedAllocForTeam(picked, 0, needTa).tasRequired,
        };
        return { ...prevQ, [teamId]: capped };
      });
    }
  }, [addedTeamIds, requestedTas, suggestedTeams]);

  const removeAddedTeam = useCallback((teamId: number) => {
    // isReplaceMode: validate trước khi bỏ team đã có TA
    const isReplaceMode = (currentAssignedTeamIds ?? []).includes(teamId);
    if (isReplaceMode) {
      const original = originalTaByTeam[teamId] ?? 0;
      if (original > 0) {
        // Bỏ team = giảm toàn bộ original về 0
        const maxReducible = maxReducibleByTeam[teamId] ?? 0;
        if (original > maxReducible) {
          void message.error(
            `Không thể bỏ đội này vì có ${original - maxReducible} phân công đã được gán nhân sự.`,
          );
          return;
        }
      }
    }

    setExpandedTeamIds([]);
    setAddedTeamIds((prev) => prev.filter((id) => id !== teamId));
    setTeamQuantities((prevQ) => {
      const next = { ...prevQ };
      delete next[teamId];
      return next;
    });
  }, [currentAssignedTeamIds, maxReducibleByTeam, originalTaByTeam]);

  const toggleTeamExpanded = useCallback((teamId: number) => {
    setExpandedTeamIds((prev) => (prev.includes(teamId) ? [] : [teamId]));
  }, []);

  const toggleAddedTeamExpanded = useCallback((teamId: number) => {
    setExpandedAddedTeamIds((prev) => prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]);
  }, []);

  return {
    // State
    state: {
      suggestedTeams,
      loading,
      error,
      teamSearch,
      addedTeamIds,
      selectedTeacherCount,
      teamQuantities,
      showAddTeam,
      teacherEditMode,
      teamEditMode,
      teacherAssignments,
      teacherSuggestionsByAssignmentId,
      saving,
      teacherPickerAssignmentId,
      teacherSearchByAssignmentId,
      expandedTeacherIds,
      expandedTeamIds,
      expandedAddedTeamIds,
      sessionDetail,
      sessionDetailLoading,
      studentApprovalMode,
      changeTeamMode,
      selectedStudentAssignmentIds,
      bulkApprovingStudents,
      rejectModalOpen,
      rejectingAssignmentId,
      rejectReason,
      rejectingStudent,
      requestedTeachers,
      requestedTas,
      maxReducibleByTeam,
      originalTaByTeam,
    },
    // Computed
    computed: {
      filteredTeams,
      totals,
      assignedTeacherCountByAssignments,
      hasPendingTeacherAssignmentChanges,
      hasTeamChanges,
      isTasValid: requestedTas === 0 || totals.tas === requestedTas,
    },
    // Actions
    actions: {
      setTeamSearch,
      setTeamQuantities,
      setShowAddTeam,
      setTeacherEditMode,
      setTeamEditMode,
      setTeacherPickerAssignmentId,
      setTeacherSearchByAssignmentId,
      setExpandedTeacherIds,
      setExpandedTeamIds,
      setExpandedAddedTeamIds,
      setRejectReason,
      setRejectModalOpen,
      updateTeamQuantity,
      toggleTeamAdded,
      removeAddedTeam,
      toggleTeamExpanded,
      toggleAddedTeamExpanded,
      handleSaveTeachersOnly,
      handleSaveTeamsOnly,
      handleCancelTeacherEdit,
      handleCancelTeamEdit,
      handleAssignTeacherToSlot,
      handleLoadTeacherSuggestions,
      setChangeTeamMode,
      handleToggleStudentApprovalMode,
      handleToggleStudentSelection,
      handleToggleSelectAllStudents,
      handleBulkApproveStudents,
      handleOpenRejectModal,
      handleConfirmRejectStudent,
    },
  };
}
