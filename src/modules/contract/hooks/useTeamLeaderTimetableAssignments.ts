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
};

function normalizeSessionsToRows(raw: PublishedTeamSession[]): TeamLeaderTimetableAssignmentRow[] {
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
    }));
}

export function useTeamLeaderTimetableAssignments(params?: { pageSize?: number; statuses?: string[] }) {
  const [items, setItems] = useState<TeamLeaderTimetableAssignmentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [search, setSearch] = useState('');
  const pageSize = params?.pageSize ?? 10;
  const statuses = params?.statuses ?? ['ASSIGNED', 'ONGOING', 'COMPLETED'];
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
  }, [pageNumber, pageSize, search, statusesKey]);

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

