import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import sessionApi, { type PublishedTeamSession } from '@/modules/request/api/sessionApi';
import memberApi from '@/modules/request/api/memberApi';

export type TeamLeaderTimetableAssignmentRow = {
  sessionId: number;
  sessionNo?: number;
  requestId?: number;
  startAt?: string;
  endAt?: string;
  location?: string;
  status?: string;
  // Lấy từ `sessions/filter` response (SessionResponse.Assignments.StaffRole)
  roleLabel?: string;
  // Với session đã Completed: attendanceByMemberId sẽ chỉ 1 người điểm danh chung,
  // lấy từ attendance đầu tiên là đủ.
  attendanceByMemberId?: number | null;
  attendanceByMemberFullName?: string;

  // Dùng để hiển thị thời gian check-in/check-out (theo người đang điểm danh).
  checkinAt?: string | null;
  checkoutAt?: string | null;
};

function normalizeSessionsToRows(
  raw: PublishedTeamSession[],
  currentMemberId: number | null,
): TeamLeaderTimetableAssignmentRow[] {
  const getEarliestAttendanceTime = (
    attendances: PublishedTeamSession['attendances'],
    responsibleId: number | null,
    field: 'checkinAt' | 'checkoutAt',
  ): string | null => {
    if (!Array.isArray(attendances) || attendances.length === 0) return null;

    let bestTs = Number.POSITIVE_INFINITY;
    let bestValue: string | null = null;

    for (const a of attendances) {
      const byId = a.attendanceByMemberId ?? null;
      if (responsibleId != null) {
        if (byId == null || byId !== responsibleId) continue;
      }

      const v = a[field] ?? null;
      if (!v) continue;
      const ts = new Date(v).getTime();
      if (Number.isNaN(ts)) continue;
      if (ts < bestTs) {
        bestTs = ts;
        bestValue = v;
      }
    }

    return bestValue;
  };

  return (raw ?? [])
    .filter((s) => Number(s.sessionId) > 0)
    .map((s) => ({
      sessionId: s.sessionId,
      sessionNo: s.sessionNo,
      requestId: s.requestId,
      startAt: s.startAt,
      endAt: s.endAt,
      location: s.location,
      status: s.status,
      roleLabel: (() => {
        if (currentMemberId == null) return undefined;

        const matchedStaffRoles = (s.assignments ?? [])
          .filter((a) => (a.staffMemberId ?? null) === currentMemberId)
          .map((a) => a.staffRole ?? null)
          .filter((x): x is string => typeof x === 'string' && x.trim().length > 0);

        const labels = new Set<string>();
        for (const r of matchedStaffRoles) {
          const u = r.toUpperCase();
          if (u.includes('TEACHER') || u === '4') labels.add('Giảng viên');
          else if (u.includes('TA') || u === '5') labels.add('Trợ giảng');
        }

        const arr = Array.from(labels);
        return arr.length > 0 ? arr.join(', ') : undefined;
      })(),
      attendanceByMemberId:
        (s.attendances ?? [])[0]?.attendanceByMemberId ?? null,

      checkinAt: (() => {
        const responsibleId = (s.attendances ?? [])[0]?.attendanceByMemberId ?? null;
        return getEarliestAttendanceTime(s.attendances, responsibleId, 'checkinAt');
      })(),
      checkoutAt: (() => {
        const responsibleId = (s.attendances ?? [])[0]?.attendanceByMemberId ?? null;
        return getEarliestAttendanceTime(s.attendances, responsibleId, 'checkoutAt');
      })(),
    }));
}

export function useTeamLeaderTimetableAssignments(
  params?: { pageSize?: number; statuses?: string[]; todayOnly?: boolean; byMember?: boolean },
) {
  // Pagination sẽ làm từ BE: items/totalItems lấy trực tiếp từ response của `sessions/filter`.
  const [serverItems, setServerItems] = useState<TeamLeaderTimetableAssignmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const pageSize = params?.pageSize ?? 10;
  const statuses = params?.statuses ?? ['ASSIGNED', 'ONGOING', 'COMPLETED'];
  const todayOnly = params?.todayOnly ?? false;
  const byMember = params?.byMember ?? false;
  const statusesKey = statuses.join(',');
  // Stabilize derived array so `fetchData` doesn't refetch just because parent re-rendered
  // and created a new `statuses` array instance.
  const normalizedStatuses = useMemo(() => [...statuses].map((s) => String(s).toUpperCase()), [statusesKey]);
  const [totalItems, setTotalItems] = useState(0);

  // memberId & teamId gần như tĩnh theo user hiện tại.
  // Tránh gọi memberApi.getById mỗi lần pageNumber/search/status đổi.
  const leaderMemberId = useMemo(() => {
    const raw = localStorage.getItem('user') || '{}';
    try {
      const parsed = JSON.parse(raw) as { memberId?: number };
      const id = Number(parsed.memberId ?? 0);
      return id > 0 ? id : null;
    } catch {
      return null;
    }
  }, []);

  const [teamId, setTeamId] = useState<number | undefined>(undefined);
  const lastFetchKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (byMember) {
      setTeamId(undefined);
      return;
    }
    let cancelled = false;
    const run = async () => {
      if (!leaderMemberId) {
        setTeamId(undefined);
        return;
      }
      try {
        const me = await memberApi.getById(leaderMemberId);
        if (cancelled) return;
        setTeamId(me.teamId != null ? Number(me.teamId) : undefined);
      } catch {
        if (cancelled) return;
        setTeamId(undefined);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [leaderMemberId, byMember]);

  // Debounce để hạn chế gọi API khi user gõ search.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    try {
      if (!byMember && teamId == null) {
        setServerItems([]);
        setTotalItems(0);
        return;
      }

      // Tránh spam: cùng một bộ params chỉ fetch một lần (StrictMode/effect re-run).
      const fetchKey = `${byMember ? `member:${leaderMemberId ?? 0}` : `team:${teamId ?? 0}`}|${normalizedStatuses.join(',')}|${todayOnly}|${pageNumber}|${pageSize}`;
      if (lastFetchKeyRef.current === fetchKey) return;
      lastFetchKeyRef.current = fetchKey;

      setLoading(true);

      const res = await sessionApi.getFilter({
        teamId: byMember ? undefined : teamId,
        memberId: byMember ? leaderMemberId ?? undefined : undefined,
        statuses: normalizedStatuses,
        sessionId: undefined,
        requestId: undefined,
        pageNumber,
        pageSize,
      });

      let rows = normalizeSessionsToRows(res.items ?? [], leaderMemberId);

      // Tab điểm danh: backend chưa có filter theo ngày,
      // nên tạm filter client-side trên đúng page BE vừa lấy.
      if (todayOnly) {
        const tz = 'Asia/Ho_Chi_Minh';
        const dateKey = (d: Date) =>
          new Intl.DateTimeFormat('en-CA', {
            timeZone: tz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(d); // YYYY-MM-DD (ổn định trên Windows/macOS)
        const todayKey = dateKey(new Date());
        rows = rows.filter((r) => {
          if (!r.startAt) return false;
          const dt = new Date(r.startAt);
          if (Number.isNaN(dt.getTime())) return false;
          return dateKey(dt) === todayKey;
        });
      }

      // Sắp xếp ổn định để UI không nhảy (ưu tiên thời gian bắt đầu).
      const statusOrder = new Map<string, number>(
        normalizedStatuses.map((s, idx) => [String(s).toUpperCase(), idx]),
      );
      rows = [...rows].sort((a, b) => {
        const ta = a.startAt ? new Date(a.startAt).getTime() : 0;
        const tb = b.startAt ? new Date(b.startAt).getTime() : 0;
        // Phiên gần nhất (sớm hơn) hiển thị trước.
        if (ta !== tb) return ta - tb;

        const sa = String(a.status ?? '').toUpperCase();
        const sb = String(b.status ?? '').toUpperCase();
        const pa = statusOrder.get(sa) ?? 999;
        const pb = statusOrder.get(sb) ?? 999;
        if (pa !== pb) return pa - pb;

        return (a.sessionNo ?? 0) - (b.sessionNo ?? 0);
      });

      setServerItems(rows);
      // Nếu filter client-side (todayOnly/search) thì totalItems theo rows để UI không bị “có response nhưng rỗng”
      setTotalItems(todayOnly ? rows.length : Number(res.totalItems ?? 0));
    } catch (err) {
      console.error('fetch teamleader timetable assignments error', err);
      // Nếu bị lỗi, cho phép retry lại lần sau cho cùng key.
      if (lastFetchKeyRef.current != null) {
        lastFetchKeyRef.current = null;
      }
      setServerItems([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
    // Fetch lại theo các thay đổi ảnh hưởng tới paging:
    // teamId (sau khi resolve leader), tab/statuses, todayOnly, pageNumber/pageSize, và search.
  }, [byMember, leaderMemberId, teamId, todayOnly, pageNumber, pageSize, normalizedStatuses]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const items = useMemo(() => {
    const keyword = debouncedSearch.trim().toLowerCase();
    if (!keyword) return serverItems;

    return serverItems.filter((x) => {
      const k1 = `phiên ${x.sessionNo ?? ''}`.toLowerCase();
      const k2 = String(x.location ?? '').toLowerCase();
      const k3 = String(x.status ?? '').toLowerCase();
      const k4 = String(x.roleLabel ?? '').toLowerCase();
      return k1.includes(keyword) || k2.includes(keyword) || k3.includes(keyword) || k4.includes(keyword);
    });
  }, [serverItems, debouncedSearch]);

  const onlineCount = useMemo(
    () => items.filter((x) => (x.location ?? '').toLowerCase().includes('online')).length,
    [items],
  );
  const offlineCount = useMemo(() => items.length - onlineCount, [items, onlineCount]);

  return {
    items,
    loading,
    pageNumber,
    pageSize,
    totalItems,
    search,
    setSearch,
    setPageNumber,
    onlineCount,
    offlineCount,
    refetch: fetchData,
  };
}

