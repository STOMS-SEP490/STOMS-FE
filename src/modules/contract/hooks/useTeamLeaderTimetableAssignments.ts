import { useCallback, useEffect, useMemo, useState } from 'react';
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
  // Với session đã Completed: attendanceByMemberId sẽ chỉ 1 người điểm danh chung,
  // lấy từ attendance đầu tiên là đủ.
  attendanceByMemberId?: number | null;
  attendanceByMemberFullName?: string;

  // Dùng để hiển thị thời gian check-in/check-out (theo người đang điểm danh).
  checkinAt?: string | null;
  checkoutAt?: string | null;
};

function normalizeSessionsToRows(raw: PublishedTeamSession[]): TeamLeaderTimetableAssignmentRow[] {
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
  params?: { pageSize?: number; statuses?: string[]; todayOnly?: boolean },
) {
  const [items, setItems] = useState<TeamLeaderTimetableAssignmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [search, setSearch] = useState('');
  const pageSize = params?.pageSize ?? 10;
  const statuses = params?.statuses ?? ['ASSIGNED', 'ONGOING', 'COMPLETED'];
  const todayOnly = params?.todayOnly ?? false;
  const statusesKey = statuses.join(',');
  const [totalItems, setTotalItems] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const memberId =
        Number(JSON.parse(localStorage.getItem('user') || '{}')?.memberId || 0) ||
        undefined;
      let teamId: number | undefined;
      if (memberId) {
        try {
          const me = await memberApi.getById(memberId);
          teamId = me.teamId != null ? Number(me.teamId) : undefined;
        } catch {
          teamId = undefined;
        }
      }

      const res = await sessionApi.getFilter({
        teamId,
        statuses,
        pageNumber: 1,
        pageSize: 500,
      });

      let rows = normalizeSessionsToRows(res.items ?? []);

      const keyword = search.trim().toLowerCase();
      if (keyword) {
        rows = rows.filter((x) => {
          const k1 = `phiên ${x.sessionNo ?? ''}`.toLowerCase();
          const k2 = String(x.location ?? '').toLowerCase();
          const k3 = String(x.status ?? '').toLowerCase();
          return k1.includes(keyword) || k2.includes(keyword) || k3.includes(keyword);
        });
      }

      // Nếu là tab điểm danh: chỉ hiển thị phiên diễn ra/sắp tới trong "ngày hôm nay".
      if (todayOnly) {
        const tz = 'Asia/Ho_Chi_Minh';
        const todayKey = new Date().toLocaleDateString('vi-VN', { timeZone: tz });
        rows = rows.filter((r) => {
          if (!r.startAt) return false;
          const key = new Date(r.startAt).toLocaleDateString('vi-VN', { timeZone: tz });
          return key === todayKey;
        });
      }

      // Sắp xếp theo thứ tự trạng thái (tùy tab) rồi tới thời gian bắt đầu.
      // Mục tiêu: hiển thị lịch trình rõ ràng hơn (thay vì theo CreatedAt).
      const statusOrder = new Map<string, number>(
        (statuses ?? []).map((s, idx) => [String(s).toUpperCase(), idx]),
      );
      rows = rows.sort((a, b) => {
        const sa = String(a.status ?? '').toUpperCase();
        const sb = String(b.status ?? '').toUpperCase();
        const pa = statusOrder.get(sa) ?? 999;
        const pb = statusOrder.get(sb) ?? 999;
        if (pa !== pb) return pa - pb;

        const ta = a.startAt ? new Date(a.startAt).getTime() : 0;
        const tb = b.startAt ? new Date(b.startAt).getTime() : 0;
        return ta - tb;
      });

      // Enrich "người điểm danh" cho session Completed
      const shouldShowAttendanceTaker = statuses.some((s) => String(s).toUpperCase().includes('COMPLETED'));
      setTotalItems(rows.length);
      const start = (pageNumber - 1) * pageSize;
      let pageRows = rows.slice(start, start + pageSize);

      if (shouldShowAttendanceTaker) {
        const ids = Array.from(
          new Set(
            pageRows
              .map((r) => r.attendanceByMemberId)
              .filter((x): x is number => x != null && x > 0),
          ),
        );
        const byNameMap = new Map<number, string>();
        await Promise.all(
          ids.map(async (id) => {
            try {
              const detail = await memberApi.getById(id);
              byNameMap.set(id, detail.fullName || detail.userEmail || '');
            } catch {
              // Ignore
            }
          }),
        );
        pageRows = pageRows.map((r) => ({
          ...r,
          attendanceByMemberFullName:
            r.attendanceByMemberId != null ? byNameMap.get(r.attendanceByMemberId) : undefined,
        }));
      }

      setItems(pageRows);
    } catch (err) {
      console.error('fetch teamleader timetable assignments error', err);
      setItems([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [pageNumber, pageSize, search, statusesKey, todayOnly]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

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

