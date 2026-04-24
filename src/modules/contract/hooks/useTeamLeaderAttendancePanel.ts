import { useCallback, useMemo, useState } from 'react';
import type { AttendanceItem, MemberDetail, SessionDetail } from '@/modules/request/type';
import sessionApi from '@/modules/request/api/sessionApi';
import attendanceApi from '@/modules/attendance/attendanceApi';
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
  const ids = (items ?? [])
    .filter((x) => {
      if (mode === 'checkin') {
        return (
          (x as unknown as { CheckinAt?: string | null; checkinAt?: string | null }).CheckinAt != null ||
          (x as unknown as { CheckinAt?: string | null; checkinAt?: string | null }).checkinAt != null
        );
      }
      return (
        (x as unknown as { CheckoutAt?: string | null; checkoutAt?: string | null }).CheckoutAt != null ||
        (x as unknown as { CheckoutAt?: string | null; checkoutAt?: string | null }).checkoutAt != null
      );
    })
    .map((x) =>
      Number(
        (x as unknown as { MemberId?: number; memberId?: number }).MemberId ??
          (x as unknown as { MemberId?: number; memberId?: number }).memberId ??
          0,
      ),
    )
    .filter((id) => Number.isFinite(id) && id > 0);

  return Array.from(new Set(ids));
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
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);

  const currentMemberId = useMemo(() => {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { memberId?: number | string };
      const id = Number(parsed.memberId ?? 0);
      return Number.isFinite(id) && id > 0 ? id : null;
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

      // Ưu tiên: nếu buổi đang được ủy quyền cho chính currentMemberId
      // (tồn tại bất kỳ attendance có AttendanceByMemberId === currentMemberId)
      // thì filter theo currentMemberId.
      let ownerId: number | null = null;
      if (currentMemberId != null && currentMemberId > 0) {
        const attendances = (detail.Attendances ?? []) as Array<{
          MemberId?: number | string | null;
          memberId?: number | string | null;
          AttendanceByMemberId?: number | string | null;
          attendanceByMemberId?: number | string | null;
        }>;

        const delegatedToMe = attendances.some((a) => {
          const byId = Number(a.AttendanceByMemberId ?? a.attendanceByMemberId ?? 0);
          return Number.isFinite(byId) && byId > 0 && byId === currentMemberId;
        });

        // Nếu currentMemberId có attendance record và record đó chưa set AttendanceByMemberId rõ ràng
        // thì hiểu là tự xác nhận cho mình.
        const hasSelfRecord = attendances.some((a) => {
          const mId = Number(a.MemberId ?? a.memberId ?? 0);
          const byRaw = a.AttendanceByMemberId ?? a.attendanceByMemberId ?? null;
          const byId = byRaw == null ? 0 : Number(byRaw);
          return mId === currentMemberId && (!Number.isFinite(byId) || byId <= 0 || byId === currentMemberId);
        });

        if (delegatedToMe || hasSelfRecord) {
          ownerId = currentMemberId;
        }
      }

      // Fallback: lấy owner từ session (TL được ủy quyền) hoặc currentMemberId
      if (ownerId == null) {
        ownerId = ownerIdFromSession ?? currentMemberId;
      }

      setAttendanceByMemberIdForSession(ownerId);
      setAttendanceByMemberFullName('');
      return ownerId;
    },
    [currentMemberId],
  );

  const refreshAttendanceItems = useCallback(async () => {
    if (!activeSession) return;
    // Team leader luôn cần thấy toàn bộ member để có thể ủy quyền lại.
    // Chỉ lọc theo attendanceByMemberId ở chế độ check-in / check-out.
    const attendanceByMemberId = actionMode === 'delegate' ? null : (attendanceByMemberIdForSession ?? null);
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
  }, [activeSession, actionMode, attendanceByMemberIdForSession]);

  const openPanel = useCallback(
    async (row: TeamLeaderTimetableAssignmentRow, mode: Exclude<AttendanceActionMode, null>) => {
      setActiveSession(row);
      setActionMode(mode);
      setMemberNotes({});
      setMemberSearch('');
      setSelectedMemberIds([]);
      setAttendanceByMemberFullName('');
      setIsLoadingAttendance(true);

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
          // Nếu lỗi khi fetch request thì bỏ qua, không chặn mở panel xác nhận tham gia.
        }
      }

      const attendanceByMemberId = await resolveAttendanceOwner(detail);
      try {
        const loaded = await loadAttendanceItems(row.sessionId, mode === 'delegate' ? null : attendanceByMemberId);
        setAttendanceItems(loaded.items);
        setMembersById(loaded.membersById);
        if (mode === 'checkin' || mode === 'checkout') {
          setSelectedMemberIds(getSelectedIdsByMode(loaded.items, mode));
        }
      } finally {
        setIsLoadingAttendance(false);
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

  /** Đổi tab Check-in / Check-out / Ủy quyền trong panel — đồng bộ lựa chọn member với logic mở panel. */
  const switchActionMode = useCallback(
    (mode: Exclude<AttendanceActionMode, null>) => {
      setActionMode(mode);
      if (mode === 'checkin' || mode === 'checkout') {
        setSelectedMemberIds(getSelectedIdsByMode(attendanceItems, mode));
      } else {
        setSelectedMemberIds([]);
      }
    },
    [attendanceItems],
  );

  return {
    currentMemberId,
    actionMode,
    setActionMode,
    switchActionMode,
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
    isLoadingAttendance,
    openPanel,
    closePanel,
    saveAttendance,
    refreshAttendanceItems,
  };
}

