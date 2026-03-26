import { useCallback, useMemo, useState } from 'react';
import type { AttendanceItem, MemberDetail, SessionDetail } from '@/modules/request/type';
import sessionApi from '@/modules/request/api/sessionApi';
import attendanceApi from '@/modules/request/api/attendanceApi';
import memberApi from '@/modules/request/api/memberApi';
import type { TeamLeaderTimetableAssignmentRow } from '@/modules/contract/hooks/useTeamLeaderTimetableAssignments';

type AttendanceActionMode = 'delegate' | 'checkin' | 'checkout' | null;
type AttendanceWriteMode = Exclude<AttendanceActionMode, 'delegate' | null>;
type AttendancePayloadItem = { memberId: number; note?: string | null };

const FIRST_PAGE = 1;
const PAGE_SIZE = 100;

function getSelectedIdsByMode(items: AttendanceItem[], mode: AttendanceWriteMode): number[] {
  if (mode === 'checkin') return items.filter((x) => x.CheckinAt != null).map((x) => x.MemberId);
  return items.filter((x) => x.CheckoutAt != null).map((x) => x.MemberId);
}

function buildAttendancePayload(
  selectedIds: number[],
  notes: Record<number, string>,
): AttendancePayloadItem[] {
  return Array.from(new Set(selectedIds)).map((id) => {
    const item: AttendancePayloadItem = { memberId: id };
    if (Object.prototype.hasOwnProperty.call(notes, id)) item.note = notes[id];
    return item;
  });
}

export function useTeamLeaderAttendancePanel(params?: { refetch?: () => Promise<void> }) {
  const refetch = params?.refetch;

  const [activeSession, setActiveSession] = useState<TeamLeaderTimetableAssignmentRow | null>(null);
  const [sessionDetail, setSessionDetail] = useState<SessionDetail | null>(null);
  const [memberNotes, setMemberNotes] = useState<Record<number, string>>({});
  const [attendanceItems, setAttendanceItems] = useState<AttendanceItem[]>([]);
  const [membersById, setMembersById] = useState<Record<number, MemberDetail>>({});
  const [attendanceByMemberFullName, setAttendanceByMemberFullName] = useState<string>('');
  const [attendanceByMemberIdForSession, setAttendanceByMemberIdForSession] = useState<number | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [actionMode, setActionMode] = useState<AttendanceActionMode>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentMemberId = useMemo(() => {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { memberId?: number };
      return parsed.memberId ?? null;
    } catch {
      return null;
    }
  }, []);

  const closePanel = useCallback(() => {
    setActionMode(null);
    setActiveSession(null);
    setSessionDetail(null);
    setAttendanceByMemberIdForSession(null);
    setAttendanceByMemberFullName('');
    setMemberNotes({});
    setMemberSearch('');
    setSelectedMemberIds([]);
    setAttendanceItems([]);
    setMembersById({});
  }, []);

  const hydrateMembersByIds = useCallback(async (memberIds: number[]) => {
    const uniqueIds = Array.from(new Set(memberIds)).filter((id) => Number(id) > 0);
    if (uniqueIds.length === 0) {
      setMembersById({});
      return;
    }

    const pairs = await Promise.all(
      uniqueIds.map(async (id) => ({
        id,
        detail: await memberApi.getById(id),
      })),
    );

    const map = pairs.reduce<Record<number, MemberDetail>>((acc, item) => {
      acc[item.id] = item.detail;
      return acc;
    }, {});

    setMembersById(map);
  }, []);

  const loadAttendanceItems = useCallback(async (sessionId: number, attendanceByMemberId: number | null) => {
    const res = await attendanceApi.getFilter({
      sessionId,
      attendanceByMemberId: attendanceByMemberId ?? undefined,
      pageNumber: FIRST_PAGE,
      pageSize: PAGE_SIZE,
    });
    return res.Items ?? [];
  }, []);

  const resolveAttendanceOwner = useCallback(
    async (detail: SessionDetail) => {
      const ownerIdFromSession = detail.attendances?.[0]?.attendanceByMemberId ?? null;
      const ownerId = ownerIdFromSession ?? currentMemberId;

      setAttendanceByMemberIdForSession(ownerId);

      if (!ownerId) {
        setAttendanceByMemberFullName('');
        return ownerId;
      }

      try {
        const by = await memberApi.getById(ownerId);
        setAttendanceByMemberFullName(by.fullName || by.userEmail || '');
      } catch {
        setAttendanceByMemberFullName('');
      }

      return ownerId;
    },
    [currentMemberId],
  );

  const openPanel = useCallback(
    async (row: TeamLeaderTimetableAssignmentRow, mode: Exclude<AttendanceActionMode, null>) => {
      setActiveSession(row);
      setActionMode(mode);
      setMemberNotes({});
      setMemberSearch('');
      setSelectedMemberIds([]);
      setAttendanceByMemberFullName('');

      const detail = await sessionApi.getById(row.sessionId);
      setSessionDetail(detail);

      const attendanceByMemberId = await resolveAttendanceOwner(detail);
      const items = await loadAttendanceItems(row.sessionId, attendanceByMemberId);
      setAttendanceItems(items);
      await hydrateMembersByIds(items.map((x) => x.MemberId));

      if (mode === 'checkin' || mode === 'checkout') {
        setSelectedMemberIds(getSelectedIdsByMode(items, mode));
      }
    },
    [hydrateMembersByIds, loadAttendanceItems, resolveAttendanceOwner],
  );

  const saveAttendance = useCallback(async () => {
    if (!activeSession) return;
    if (actionMode !== 'checkin' && actionMode !== 'checkout') return;

    setIsSubmitting(true);
    try {
      const items = buildAttendancePayload(selectedMemberIds, memberNotes);

      if (actionMode === 'checkin') {
        await attendanceApi.checkIn({ sessionId: activeSession.sessionId, items });
      } else {
        await attendanceApi.checkOut({ sessionId: activeSession.sessionId, items });
      }

      const updatedItems = await loadAttendanceItems(activeSession.sessionId, attendanceByMemberIdForSession);
      setAttendanceItems(updatedItems);
      setSelectedMemberIds(getSelectedIdsByMode(updatedItems, actionMode));

      await refetch?.();
    } finally {
      setIsSubmitting(false);
    }
  }, [
    activeSession,
    actionMode,
    attendanceByMemberIdForSession,
    loadAttendanceItems,
    memberNotes,
    refetch,
    selectedMemberIds,
  ]);

  return {
    currentMemberId,
    actionMode,
    setActionMode,
    activeSession,
    sessionDetail,
    attendanceItems,
    setAttendanceItems,
    membersById,
    attendanceByMemberFullName,
    attendanceByMemberIdForSession,
    memberSearch,
    setMemberSearch,
    memberNotes,
    setMemberNotes,
    selectedMemberIds,
    setSelectedMemberIds,
    isSubmitting,
    setIsSubmitting,
    openPanel,
    closePanel,
    saveAttendance,
  };
}

