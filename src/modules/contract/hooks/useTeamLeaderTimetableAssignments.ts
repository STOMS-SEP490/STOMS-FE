import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import sessionApi from '@/modules/request/api/sessionApi';
import memberApi from '@/modules/request/api/memberApi';
import type { SessionResponse } from '@/modules/request/session.types';

export type TeamLeaderTimetableAssignmentRow = {
  sessionId: number;
  sessionNo?: number;
  requestId?: number;
  startAt?: string;
  endAt?: string;
  location?: string;
  status?: string;
  roleLabel?: string;
  attendanceByMemberId?: number | null;
  attendanceByMemberFullName?: string;
  checkinAt?: string | null;
  checkoutAt?: string | null;
};

function normalizeSessionsToRows(
  raw: SessionResponse[],
  currentMemberId: number | null,
): TeamLeaderTimetableAssignmentRow[] {
  const getEarliestAttendanceTime = (
    attendances: SessionResponse['Attendances'],
    responsibleId: number | null,
    field: 'CheckinAt' | 'CheckoutAt',
  ): string | null => {
    if (!Array.isArray(attendances) || attendances.length === 0) return null;

    let bestTs = Number.POSITIVE_INFINITY;
    let bestValue: string | null = null;

    for (const a of attendances) {
      const byId = a.AttendanceByMemberId ?? null;
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
    .filter((s) => Number(s.SessionId) > 0)
    .map((s) => ({
      sessionId: s.SessionId,
      sessionNo: s.SessionNo,
      requestId: s.RequestId,
      startAt: s.StartAt,
      endAt: s.EndAt,
      location: s.Location,
      status: s.Status,
      roleLabel: (() => {
        if (currentMemberId == null) return undefined;

        const matchedStaffRoles = (s.Assignments ?? [])
          .filter((a) => (a.StaffMemberId ?? null) === currentMemberId)
          .map((a) => a.StaffRole ?? null)
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
      attendanceByMemberId: (s.Attendances ?? [])[0]?.AttendanceByMemberId ?? null,

      checkinAt: (() => {
        const responsibleId = (s.Attendances ?? [])[0]?.AttendanceByMemberId ?? null;
        return getEarliestAttendanceTime(s.Attendances, responsibleId, 'CheckinAt');
      })(),
      checkoutAt: (() => {
        const responsibleId = (s.Attendances ?? [])[0]?.AttendanceByMemberId ?? null;
        return getEarliestAttendanceTime(s.Attendances, responsibleId, 'CheckoutAt');
      })(),
    }));
}

export function useTeamLeaderTimetableAssignments(
  params?: { pageSize?: number; statuses?: string[]; todayOnly?: boolean; byMember?: boolean },
) {
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
  const normalizedStatuses = useMemo(() => [...statuses].map((s) => String(s).toUpperCase()), [statusesKey]);
  const [totalItems, setTotalItems] = useState(0);

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

      const fetchKey = `${byMember ? `member:${leaderMemberId ?? 0}` : `team:${teamId ?? 0}`}|${normalizedStatuses.join(',')}|${todayOnly}|${pageNumber}|${pageSize}`;
      if (lastFetchKeyRef.current === fetchKey) return;
      lastFetchKeyRef.current = fetchKey;

      setLoading(true);

      const res = await sessionApi.getFilter({
        TeamId: byMember ? undefined : teamId,
        MemberId: byMember ? leaderMemberId ?? undefined : undefined,
        Statuses: normalizedStatuses,
        PageNumber: pageNumber,
        PageSize: pageSize,
      });

      const publishedItems: SessionResponse[] = res.Items ?? [];
      let rows = normalizeSessionsToRows(publishedItems, leaderMemberId);

      if (todayOnly) {
        const tz = 'Asia/Ho_Chi_Minh';
        const dateKey = (d: Date) =>
          new Intl.DateTimeFormat('en-CA', {
            timeZone: tz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(d);
        const todayKey = dateKey(new Date());
        rows = rows.filter((r) => {
          if (!r.startAt) return false;
          const dt = new Date(r.startAt);
          if (Number.isNaN(dt.getTime())) return false;
          return dateKey(dt) === todayKey;
        });
      }

      const statusOrder = new Map<string, number>(
        normalizedStatuses.map((s, idx) => [String(s).toUpperCase(), idx]),
      );
      rows = [...rows].sort((a, b) => {
        const ta = a.startAt ? new Date(a.startAt).getTime() : 0;
        const tb = b.startAt ? new Date(b.startAt).getTime() : 0;
        if (ta !== tb) return ta - tb;

        const sa = String(a.status ?? '').toUpperCase();
        const sb = String(b.status ?? '').toUpperCase();
        const pa = statusOrder.get(sa) ?? 999;
        const pb = statusOrder.get(sb) ?? 999;
        if (pa !== pb) return pa - pb;

        return (a.sessionNo ?? 0) - (b.sessionNo ?? 0);
      });

      setServerItems(rows);
      setTotalItems(todayOnly ? rows.length : Number(res.TotalItems ?? 0));
    } catch (err) {
      console.error('fetch teamleader timetable assignments error', err);
      if (lastFetchKeyRef.current != null) {
        lastFetchKeyRef.current = null;
      }
      setServerItems([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [byMember, leaderMemberId, teamId, todayOnly, pageNumber, pageSize, normalizedStatuses]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filteredItems = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return serverItems;
    const match = (text?: string | null) => (text ? text.toLowerCase().includes(q) : false);
    return serverItems.filter(
      (r) =>
        match(r.location ?? '') ||
        match(r.requestId?.toString() ?? '') ||
        match(r.sessionNo?.toString() ?? '') ||
        match(r.roleLabel ?? ''),
    );
  }, [serverItems, debouncedSearch]);

  return {
    items: filteredItems,
    totalItems,
    pageNumber,
    setPageNumber,
    pageSize,
    loading,
    search,
    setSearch,
    refetch: fetchData,
  };
}
