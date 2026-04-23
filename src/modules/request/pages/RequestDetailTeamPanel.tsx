import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Users, Trash2, Plus, CircleHelp } from 'lucide-react';
import { message, Popover, Checkbox } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Dialog } from '@/shared/components/ui/dialog';
import { Label } from '@/shared/components/ui/label';
import type { Team } from '@/modules/team/team';
import assignmentApi from '@/modules/assignment/api/assignmentApi';
import type { AssignmentResponse } from '../session.types';
import type { SuggestedStaff } from '../type';
import sessionService from '../api/sessionApi';
import { teamSessionApi } from '@/modules/team/api/teamSessionApi';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import { getAssignmentStatusInfo, ASSIGNMENT_STATUS, REQUEST_STATUS, getRequestStatusCode } from '@/constants/status';

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
  canEdit?: boolean;
  /** Request status để kiểm tra có hiển thị danh sách sinh viên đã phân công không */
  requestStatus?: string | number | null;
  onAssignSession: (
    sessionId: number,
    teamIds: number[],
    teamQuantities: Record<number, { teachersRequired: number; tasRequired: number }>
  ) => void;
  /** Callback khi teacher assignment được update */
  onTeacherAssignmentUpdated?: () => void | Promise<void>;
};

export default function RequestDetailTeamPanel({
  session,
  currentTeamQuantities,
  currentAssignedTeamIds,
  separateTeacherSelection = false,
  canEdit = true,
  requestStatus,
  onAssignSession,
  onTeacherAssignmentUpdated,
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
  const [expandedTeacherIds, setExpandedTeacherIds] = useState<Set<number>>(new Set());
  const [expandedTeamIds, setExpandedTeamIds] = useState<number[]>([]);
  const [expandedAddedTeamIds, setExpandedAddedTeamIds] = useState<number[]>([]);
  
  // Load session detail để lấy assignments khi request status >= 4
  const [sessionDetail, setSessionDetail] = useState<any>(null);
  const [sessionDetailLoading, setSessionDetailLoading] = useState(false);
  
  // Bulk approve/reject state for student assignments
  const [studentApprovalMode, setStudentApprovalMode] = useState(false);
  const [selectedStudentAssignmentIds, setSelectedStudentAssignmentIds] = useState<Set<number>>(new Set());
  const [bulkApprovingStudents, setBulkApprovingStudents] = useState(false);
  
  // Individual reject modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingAssignmentId, setRejectingAssignmentId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingStudent, setRejectingStudent] = useState(false);
  
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

  // Load session detail để hiển thị sinh viên đã phân công khi request status >= 4
  useEffect(() => {
    const statusCode = getRequestStatusCode(requestStatus);
    const shouldLoadAssignments = 
      statusCode === REQUEST_STATUS.ASSIGNING ||
      statusCode === REQUEST_STATUS.PUBLISHED ||
      statusCode === REQUEST_STATUS.COMPLETED ||
      statusCode === REQUEST_STATUS.CANCELLED;
    
    if (!shouldLoadAssignments) {
      setSessionDetail(null);
      setSessionDetailLoading(false);
      return;
    }

    let cancelled = false;
    const fetchSessionDetail = async () => {
      setSessionDetailLoading(true);
      try {
        const detail = await sessionService.getById(session.sessionId);
        if (cancelled) return;
        setSessionDetail(detail);
      } catch (err) {
        if (!cancelled) {
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
  }, [session.sessionId, requestStatus]);

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
      
      // Gọi callback để parent refresh request và session status
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
      
      // Nếu chưa có team nào được assign (lần đầu), dùng POST bulk
      // Nếu đã có team rồi (đang sửa), dùng PUT replace
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
    } catch (err: unknown) {
      message.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }, [addedTeamIds, currentAssignedTeamIds, hasTeamChanges, onAssignSession, session.sessionId, teamQuantities]);

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

  // Bulk approval handlers
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
      // Reload session detail
      const detail = await sessionService.getById(session.sessionId);
      setSessionDetail(detail);
    } catch (err: unknown) {
      message.error(getErrorMessage(err));
    } finally {
      setBulkApprovingStudents(false);
    }
  }, [selectedStudentAssignmentIds, session.sessionId]);

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
      // Reload session detail
      const detail = await sessionService.getById(session.sessionId);
      setSessionDetail(detail);
    } catch (err: unknown) {
      message.error(getErrorMessage(err));
    } finally {
      setRejectingStudent(false);
    }
  }, [rejectingAssignmentId, rejectReason, session.sessionId]);

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
              canEdit ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-7 px-2 text-xs font-medium bg-[#208aae] text-white hover:bg-[#1a7090] border-0"
                  disabled={saving}
                  onClick={() => setTeacherEditMode(true)}
                >
                  {assignedTeacherCountByAssignments > 0 ? 'Chỉnh sửa' : 'Thêm'}
                </Button>
              ) : null
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
                          <div className="w-[min(calc(100vw-2rem),28rem)] p-2">
                            <Input
                              className="h-9 text-sm border-slate-200"
                              placeholder="Tìm giảng viên..."
                              value={teacherSearchByAssignmentId[assignmentId] ?? ''}
                              onChange={(e) =>
                                setTeacherSearchByAssignmentId((prev) => ({
                                  ...prev,
                                  [assignmentId]: e.target.value,
                                }))
                              }
                            />
                            <div className="mt-2 max-h-[400px] min-h-[200px] overflow-y-auto no-scrollbar space-y-1">
                              {filteredSuggestions.length === 0 ? (
                                <p className="text-sm text-slate-500 px-3 py-6 text-center">Không có gợi ý phù hợp.</p>
                              ) : (
                                filteredSuggestions.map((staff) => {
                                  const isExpanded = expandedTeacherIds.has(staff.memberId);
                                  return (
                                    <div key={staff.memberId} className="border border-slate-200 rounded-lg overflow-hidden">
                                      <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors">
                                        <button
                                          type="button"
                                          className="flex items-center gap-3 flex-1 min-w-0 text-left"
                                          onClick={() => {
                                            handleAssignTeacherToSlot(assignmentId, staff.memberId);
                                          }}
                                        >
                                          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0">
                                            <img
                                              src={getAvatarSrc(staff.avatarUrl)}
                                              alt={staff.fullName}
                                              className="w-full h-full object-cover"
                                              onError={(e) => {
                                                (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR_SRC;
                                              }}
                                            />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-slate-900 truncate">{staff.fullName || '—'}</p>
                                            <p className="text-xs text-slate-500 truncate">{staff.email || staff.roleName || '—'}</p>
                                          </div>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedTeacherIds((prev) => {
                                              const next = new Set(prev);
                                              if (next.has(staff.memberId)) {
                                                next.delete(staff.memberId);
                                              } else {
                                                next.add(staff.memberId);
                                              }
                                              return next;
                                            });
                                          }}
                                          className="shrink-0 p-1.5 rounded-md hover:bg-slate-100 transition-colors"
                                          title={isExpanded ? 'Thu gọn' : 'Xem chi tiết'}
                                        >
                                          <DownOutlined 
                                            className={`text-slate-400 text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                          />
                                        </button>
                                      </div>
                                      {isExpanded && (
                                        <div className="px-3 py-3 bg-slate-50 border-t border-slate-200 space-y-2">
                                          {staff.skills && staff.skills.length > 0 ? (
                                            <div>
                                              <p className="text-[10px] font-semibold text-slate-700 mb-1.5">Kỹ năng:</p>
                                              <div className="flex flex-wrap gap-1">
                                                {staff.skills.map((skill, idx) => (
                                                  <span
                                                    key={skill?.skillId ?? idx}
                                                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-orange-100 text-orange-700"
                                                  >
                                                    {typeof skill === 'string' ? skill : skill?.skillName ?? 'N/A'}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          ) : null}
                                          {staff.assignmentCountIn30Days != null ? (
                                            <div className="flex items-center gap-2">
                                              <p className="text-[10px] font-semibold text-slate-700">Số buổi trong 30 ngày:</p>
                                              <p className="text-[10px] font-semibold text-slate-700">{staff.assignmentCountIn30Days} buổi</p>
                                            </div>
                                          ) : null}
                                          {staff.skillMatchCount != null ? (
                                            <div className="flex items-center gap-2">
                                              <p className="text-[10px] font-semibold text-slate-700">Số kỹ năng phù hợp:</p>
                                              <p className="text-[10px] font-semibold text-slate-700">{staff.skillMatchCount}</p>
                                            </div>
                                          ) : null}
                                          {(!staff.skills || staff.skills.length === 0) && staff.assignmentCountIn30Days == null && !staff.skillMatchCount ? (
                                            <p className="text-xs text-slate-500 italic">Chưa có thông tin chi tiết</p>
                                          ) : null}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        }
                        styles={{ content: { padding: 12 } }}
                      >
                        <button
                          type="button"
                          disabled={saving}
                          className="w-full flex items-center justify-between gap-3 bg-white px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-60 rounded-lg border border-slate-200"
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
          {canEdit && requestedTeachers > selectedTeacherCount && (
            <div className="flex justify-end border-t border-slate-200 pt-2">
              <span className="text-xs text-slate-500">
                {/* Còn thiếu:{' '}
                <span className="font-semibold text-amber-600">{requestedTeachers - selectedTeacherCount} Giảng viên</span> */}
              </span>
            </div>
          )}
        </section>
      ) : null}
      
      {/* Chỉ hiển thị phần "Nhóm phụ trách" khi request status < 4 (chưa đến giai đoạn phân công) */}
      {(() => {
        const statusCode = getRequestStatusCode(requestStatus);
        const shouldHideTeamSection = 
          statusCode === REQUEST_STATUS.ASSIGNING ||
          statusCode === REQUEST_STATUS.PUBLISHED ||
          statusCode === REQUEST_STATUS.COMPLETED ||
          statusCode === REQUEST_STATUS.CANCELLED;
        
        if (shouldHideTeamSection && sessionDetail && !sessionDetailLoading) {
          return null; // Ẩn phần "Nhóm phụ trách" khi đã có sinh viên phân công
        }

        return (
          <>
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
              ) : canEdit ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-7 px-2 text-xs font-medium bg-[#208aae] text-white hover:bg-[#1a7090] border-0"
                  disabled={saving || loading}
                  onClick={() => setTeamEditMode(true)}
                >
                  {addedTeamIds.length > 0 ? 'Chỉnh sửa' : 'Thêm'}
                </Button>
              ) : null}
            </div>

            {addedTeamIds.length === 0 && !teamEditMode && (
              <p className="text-xs text-slate-500">Chưa có nhóm được phân công.</p>
            )}
          </>
        );
      })()}

      {/* Hiển thị danh sách nhóm đã chọn và form thêm nhóm - chỉ khi chưa đến giai đoạn phân công */}
      {(() => {
        const statusCode = getRequestStatusCode(requestStatus);
        const shouldHideTeamSection = 
          statusCode === REQUEST_STATUS.ASSIGNING ||
          statusCode === REQUEST_STATUS.PUBLISHED ||
          statusCode === REQUEST_STATUS.COMPLETED ||
          statusCode === REQUEST_STATUS.CANCELLED;
        
        if (shouldHideTeamSection && sessionDetail && !sessionDetailLoading) {
          return null; // Ẩn phần "Nhóm phụ trách" khi đã có sinh viên phân công
        }

        return (
          <>
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
                      <span></span>
                    )}
                  </div>
                </div>

                {isExpanded && team && (
                  <div className="px-3 py-3 bg-slate-50 border-t border-slate-200 space-y-2">
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
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold text-slate-700">Tổng thành viên:</span>
                              <span className="text-[10px] font-semibold text-slate-700">{memberCount}</span>
                            </div>
                          )}
                          {hasTeacher && (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold text-slate-700">Giảng viên khả dụng:</span>
                                <span className="text-[10px] font-semibold text-slate-700">{availableTeacher ?? totalTeacher ?? '—'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold text-slate-700">Kĩ năng phù hợp (GV):</span>
                                <span className="text-[10px] font-semibold text-slate-700">{matchedTeacher ?? '—'}</span>
                              </div>
                            </>
                          )}
                          {hasTa && (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold text-slate-700">Sinh viên khả dụng:</span>
                                <span className="text-[10px] font-semibold text-slate-700">{availableTa ?? totalTa ?? '—'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold text-slate-700">Kĩ năng phù hợp (SV):</span>
                                <span className="text-[10px] font-semibold text-slate-700">{matchedTa ?? '—'}</span>
                              </div>
                            </>
                          )}
                          {(() => {
                            const topics = (team as Team & { topics?: { topicId: number; topicName?: string | null }[] }).topics ?? [];
                            if (topics.length === 0) return null;
                            return (
                              <div className="pt-1">
                                <p className="text-[10px] font-semibold text-slate-700 mb-1.5">Chủ đề nhóm:</p>
                                <div className="flex flex-wrap gap-1">
                                  {topics.map((t) => (
                                    <span key={t.topicId} className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-orange-100 text-orange-700">
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
          {canEdit && requestedTas > totals.tas && (
            <div className="flex justify-end">
              {/* <span className="text-xs text-slate-500">
                Còn thiếu:{' '}
                <span className="font-semibold text-amber-600">
                  {requestedTas - totals.tas} Sinh viên
                </span>
              </span> */}
            </div>
          )}
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
                      <div className="px-3 py-3 bg-slate-50 border-t border-slate-200 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-slate-700">Tổng thành viên:</span>
                          <span className="text-[10px] font-semibold text-slate-700">
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
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-semibold text-slate-700">Giảng viên khả dụng:</span>
                                    <span className="text-[10px] font-semibold text-slate-700">{availableTeacher ?? totalTeacher ?? '—'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-semibold text-slate-700">Kĩ năng phù hợp (GV):</span>
                                    <span className="text-[10px] font-semibold text-slate-700">{matchedTeacher ?? '—'}</span>
                                  </div>
                                </>
                              )}
                              {hasTa && (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-semibold text-slate-700">Sinh viên khả dụng:</span>
                                    <span className="text-[10px] font-semibold text-slate-700">{availableTa ?? totalTa ?? '—'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-semibold text-slate-700">Kĩ năng phù hợp:</span>
                                    <span className="text-[10px] font-semibold text-slate-700">{matchedTa ?? '—'}</span>
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
                              <p className="text-[10px] font-semibold text-slate-700 mb-1.5">Chủ đề nhóm:</p>
                              <div className="flex flex-wrap gap-1">
                                {topics.map((t) => (
                                  <span
                                    key={t.topicId}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-orange-100 text-orange-700"
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
          </>
        );
      })()}

      {/* Hiển thị danh sách sinh viên đã phân công khi request status >= 4 */}
      {sessionDetail && !sessionDetailLoading && addedTeamIds.length > 0 && (() => {
        const statusCode = getRequestStatusCode(requestStatus);
        const shouldShow = 
          statusCode === REQUEST_STATUS.ASSIGNING ||
          statusCode === REQUEST_STATUS.PUBLISHED ||
          statusCode === REQUEST_STATUS.COMPLETED ||
          statusCode === REQUEST_STATUS.CANCELLED;
        
        if (!shouldShow) return null;

        // Lấy danh sách assignments sinh viên
        const allAssignments = (sessionDetail.Assignments ?? []).filter((a: any) => {
          const role = String(a.StaffRole ?? '').toUpperCase();
          return role === 'TA' || role.includes('STUDENT') || role.includes('SV') || role.includes('SINH');
        });

        // Nhóm sinh viên theo team - bao gồm CẢ những sinh viên không có team
        const studentsByTeam: Record<number, any[]> = {};
        const studentsWithoutTeam: any[] = [];
        
        allAssignments.forEach((a: any) => {
          const teamId = Number(a.TeamId ?? a.StaffMember?.TeamId ?? 0);
          if (teamId > 0) {
            if (!studentsByTeam[teamId]) studentsByTeam[teamId] = [];
            studentsByTeam[teamId].push(a);
          } else {
            studentsWithoutTeam.push(a);
          }
        });

        const hasAnyStudents = allAssignments.length > 0;
        if (!hasAnyStudents) return null;

        // Count pending students - check ALL assignments, not just those in addedTeamIds
        const allPendingStudents = allAssignments.filter((a: any) => {
          const statusInfo = getAssignmentStatusInfo(a.Status);
          return statusInfo.code === ASSIGNMENT_STATUS.PENDING;
        });
        const hasPendingStudents = allPendingStudents.length > 0;

        // Debug info removed for production performance
        // console.log('Debug approval button:', {
        //   canEdit,
        //   hasPendingStudents,
        //   allPendingStudents: allPendingStudents.length,
        //   allAssignments: allAssignments.length,
        //   studentsByTeam: Object.keys(studentsByTeam).length,
        //   requestStatus,
        //   statusCode,
        // });

        // Manager can approve students when request status >= ASSIGNING (4)
        const canApproveStudents = statusCode != null && statusCode >= REQUEST_STATUS.ASSIGNING;

        return (
          <div className="space-y-3 border-t border-slate-200 pt-4 mt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold text-slate-900">Sinh viên tham dự</h4>
              {canApproveStudents && hasPendingStudents && (
                <div className="flex items-center gap-2">
                  {studentApprovalMode ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-slate-200"
                        disabled={bulkApprovingStudents}
                        onClick={handleToggleStudentApprovalMode}
                      >
                        Hủy
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 px-2 text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 border-0"
                        disabled={bulkApprovingStudents || selectedStudentAssignmentIds.size === 0}
                        onClick={() => void handleBulkApproveStudents()}
                      >
                        {bulkApprovingStudents ? 'Đang xử lý...' : `Xác nhận duyệt (${selectedStudentAssignmentIds.size})`}
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 px-2 text-xs font-medium bg-[#208aae] text-white hover:bg-[#1a7090] border-0"
                      onClick={handleToggleStudentApprovalMode}
                    >
                      Duyệt
                    </Button>
                  )}
                </div>
              )}
            </div>
            {Object.keys(studentsByTeam).map((tidStr) => {
              const tid = Number(tidStr);
              const team = suggestedTeams.find((t) => t.teamId === tid);
              const students = studentsByTeam[tid] ?? [];
              
              if (students.length === 0) return null;

              return (
                <div key={tid} className="space-y-2 border-t border-slate-200 pt-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{team?.teamName ?? `Nhóm #${tid}`}</p>
                      <p className="text-xs text-slate-500">{students.length} sinh viên</p>
                    </div>
                  </div>

                  <div className="space-y-2 pl-12">
                    {students.map((student, index) => {
                      const statusInfo = getAssignmentStatusInfo(student.Status);
                      const isPending = statusInfo.code === ASSIGNMENT_STATUS.PENDING;
                      const isRejected = statusInfo.code === ASSIGNMENT_STATUS.REJECTED;
                      const assignmentId = Number(student.AssignmentId ?? 0);
                      const isSelected = selectedStudentAssignmentIds.has(assignmentId);
                      const showApprovalControls = studentApprovalMode && isPending;
                      const rejectReason = student.Reason?.trim() || '';

                      return (
                        <div key={assignmentId || index} className="space-y-2">
                          {/* Label SINH VIÊN X */}
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Sinh viên {index + 1}
                          </p>
                          <div
                            className={`flex items-center justify-between gap-3 bg-white px-3 py-2.5 border rounded-lg transition-colors ${
                              showApprovalControls && isSelected
                                ? 'border-[#208aae] bg-[#208aae]/5'
                                : isRejected
                                ? 'border-rose-200 bg-rose-50/30'
                                : 'border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0">
                                <img
                                  src={getAvatarSrc(student.StaffMember?.AvatarUrl ?? null)}
                                  alt={student.StaffMember?.FullName || 'Sinh viên'}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR_SRC;
                                  }}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">
                                  {student.StaffMember?.FullName || 'Sinh viên'}
                                </p>
                                <p className="text-xs text-slate-500 truncate">
                                  {student.StaffMember?.Email || student.StaffMember?.User?.Email || '—'}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0">
                              {showApprovalControls ? (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs font-medium text-rose-600 hover:bg-rose-50 border-rose-200"
                                    onClick={() => handleOpenRejectModal(assignmentId)}
                                  >
                                    Từ chối
                                  </Button>
                                  <Checkbox
                                    checked={isSelected}
                                    onChange={() => handleToggleStudentSelection(assignmentId)}
                                  />
                                </>
                              ) : (
                                <span
                                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusInfo.className}`}
                                >
                                  {statusInfo.label}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Hiển thị lịch sử từ chối (nếu có) */}
                          {rejectReason && (
                            <div className="border-l-2 border-l-rose-500 bg-rose-50/50 px-3 py-2">
                              <p className="text-xs font-medium text-rose-900 mb-1">Lịch sử từ chối:</p>
                              <p className="text-xs text-rose-950 leading-relaxed whitespace-pre-wrap">
                                {rejectReason}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            
            {/* Hiển thị sinh viên không có team */}
            {studentsWithoutTeam.length > 0 && (
              <div className="space-y-2 border-t border-slate-200 pt-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Chưa phân nhóm</p>
                    <p className="text-xs text-slate-500">{studentsWithoutTeam.length} sinh viên</p>
                  </div>
                </div>

                <div className="space-y-2 pl-12">
                  {studentsWithoutTeam.map((student, index) => {
                    const statusInfo = getAssignmentStatusInfo(student.Status);
                    const isPending = statusInfo.code === ASSIGNMENT_STATUS.PENDING;
                    const isRejected = statusInfo.code === ASSIGNMENT_STATUS.REJECTED;
                    const assignmentId = Number(student.AssignmentId ?? 0);
                    const isSelected = selectedStudentAssignmentIds.has(assignmentId);
                    const showApprovalControls = studentApprovalMode && isPending;
                    const rejectReason = student.Reason?.trim() || '';

                    return (
                      <div key={assignmentId || index} className="space-y-2">
                        {/* Label SINH VIÊN X */}
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Sinh viên {index + 1}
                        </p>
                        <div
                          className={`flex items-center justify-between gap-3 bg-white px-3 py-2.5 border rounded-lg transition-colors ${
                            showApprovalControls && isSelected
                              ? 'border-[#208aae] bg-[#208aae]/5'
                              : isRejected
                              ? 'border-rose-200 bg-rose-50/30'
                              : 'border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0">
                              <img
                                src={getAvatarSrc(student.StaffMember?.AvatarUrl ?? null)}
                                alt={student.StaffMember?.FullName || 'Sinh viên'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR_SRC;
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {student.StaffMember?.FullName || 'Sinh viên'}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {student.StaffMember?.Email || student.StaffMember?.User?.Email || '—'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            {showApprovalControls ? (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs font-medium text-rose-600 hover:bg-rose-50 border-rose-200"
                                  onClick={() => handleOpenRejectModal(assignmentId)}
                                >
                                  Từ chối
                                </Button>
                                <Checkbox
                                  checked={isSelected}
                                  onChange={() => handleToggleStudentSelection(assignmentId)}
                                />
                              </>
                            ) : (
                              <span
                                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusInfo.className}`}
                              >
                                {statusInfo.label}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Hiển thị lịch sử từ chối (nếu có) */}
                        {rejectReason && (
                          <div className="border-l-2 border-l-rose-500 bg-rose-50/50 px-3 py-2">
                            <p className="text-xs font-medium text-rose-900 mb-1">Lịch sử từ chối:</p>
                            <p className="text-xs text-rose-950 leading-relaxed whitespace-pre-wrap">
                              {rejectReason}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Reject modal */}
      <Dialog
        open={rejectModalOpen}
        onClose={() => !rejectingStudent && setRejectModalOpen(false)}
        title="Từ chối phân công sinh viên"
        description="Nhập lý do từ chối phân công sinh viên này."
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
              placeholder="Ví dụ: Không đủ kỹ năng yêu cầu, trùng lịch..."
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg border-gray-200"
              disabled={rejectingStudent}
              onClick={() => setRejectModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-lg border-red-200 text-red-600 hover:bg-red-50"
              disabled={rejectingStudent}
              onClick={() => void handleConfirmRejectStudent()}
            >
              {rejectingStudent ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </Button>
          </div>
        </div>
      </Dialog>

    </div>
  );
}
