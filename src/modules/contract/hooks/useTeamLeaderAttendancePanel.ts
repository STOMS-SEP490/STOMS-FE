import { useCallback, useMemo, useState } from 'react';
import type { AttendanceItem, MemberDetail, SessionDetail } from '@/modules/request/type';
import sessionApi from '@/modules/request/api/sessionApi';
import attendanceApi from '@/modules/request/api/attendanceApi';
import requestApi from '@/modules/request/api/requestApi';
import type { TeamLeaderTimetableAssignmentRow } from '@/modules/contract/hooks/useTeamLeaderTimetableAssignments';
import { getAttendanceOwnerId } from '@/shared/utils/attendanceOwner';
import { normalizeAttendanceFilterResponse } from '@/shared/utils/normalizeAttendanceFilter';
import { extractMembersFromAttendanceFilterResponse } from '@/shared/utils/extractMembersFromAttendanceFilter';

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

  const loadAttendanceItems = useCallback(async (sessionId: number, attendanceByMemberId: number | null) => {
    const res = await attendanceApi.getFilter({
      sessionId,
      attendanceByMemberId: attendanceByMemberId ?? undefined,
      pageNumber: FIRST_PAGE,
      pageSize: PAGE_SIZE,
    });
    const normalized = normalizeAttendanceFilterResponse(res as any);
    return {
      items: normalized.Items ?? [],
      membersById: extractMembersFromAttendanceFilterResponse(res),
    };
  }, []);

  const resolveAttendanceOwner = useCallback(
    async (detail: SessionDetail) => {
      const ownerIdFromSession = getAttendanceOwnerId(detail.Attendances as any);
      const ownerId = ownerIdFromSession ?? currentMemberId;

      setAttendanceByMemberIdForSession(ownerId);
      setAttendanceByMemberFullName('');
      return ownerId;
    },
    [currentMemberId],
  );

  const refreshAttendanceItems = useCallback(async () => {
    if (!activeSession) return;
    const attendanceByMemberId = attendanceByMemberIdForSession ?? null;
    const res = await attendanceApi.getFilter({
      sessionId: activeSession.sessionId,
      attendanceByMemberId: attendanceByMemberId ?? undefined,
      pageNumber: FIRST_PAGE,
      pageSize: PAGE_SIZE,
    });
    const normalized = normalizeAttendanceFilterResponse(res as any);
    const nextItems = normalized.Items ?? [];
    const nextMembers = extractMembersFromAttendanceFilterResponse(res);
    setAttendanceItems(nextItems);
    setMembersById(nextMembers);
    return { items: nextItems, membersById: nextMembers };
  }, [activeSession, attendanceByMemberIdForSession]);

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

      // Bổ sung requestCode / requestName cho activeSession nếu còn thiếu (đảm bảo đồng bộ với panel chi tiết).
      if (detail.RequestId && (!row.requestCode || !row.requestName)) {
        try {
          const req = await requestApi.getById(detail.RequestId);
          setActiveSession((prev) =>
            prev && prev.sessionId === row.sessionId
              ? {
                  ...prev,
                  requestId: detail.RequestId,
                  requestCode: req.requestCode ?? prev.requestCode,
                  requestName: req.requestName ?? prev.requestName,
                }
              : prev,
          );
        } catch {
          // Nếu lỗi khi fetch request thì bỏ qua, không chặn mở panel điểm danh.
        }
      }

      const attendanceByMemberId = await resolveAttendanceOwner(detail);
      const loaded = await loadAttendanceItems(row.sessionId, attendanceByMemberId);
      setAttendanceItems(loaded.items);
      setMembersById(loaded.membersById);

      if (mode === 'checkin' || mode === 'checkout') {
        setSelectedMemberIds(getSelectedIdsByMode(loaded.items, mode));
      }
    },
    [loadAttendanceItems, resolveAttendanceOwner],
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

      const next = await refreshAttendanceItems();
      if (next) setSelectedMemberIds(getSelectedIdsByMode(next.items, actionMode));

      await refetch?.();
    } finally {
      setIsSubmitting(false);
    }
  }, [
    activeSession,
    actionMode,
    attendanceByMemberIdForSession,
    refreshAttendanceItems,
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
    refreshAttendanceItems,
  };
}

