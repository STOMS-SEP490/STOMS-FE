import { useCallback, useEffect, useMemo, useState } from 'react';
import teachingHistoryApi from '@/modules/contract/api/teachingHistoryApi';
import type { TeachingHistoryItem } from '@/modules/contract/teachingHistory';
import { sessionDisplayName } from '@/modules/contract/teachingHistory';
import { taskReportApi } from '@/modules/task-report/api/taskReportApi';
import type { TaskReport } from '@/modules/task-report/taskReport';

export function useTeacherTeachingHistory(params?: { pageSize?: number }) {
  const memberId = useMemo(() => {
    try {
      return Number(JSON.parse(localStorage.getItem('user') || '{}')?.memberId || 0) || 0;
    } catch {
      return 0;
    }
  }, []);

  const [items, setItems] = useState<TeachingHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = params?.pageSize ?? 8;
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [hasContract, setHasContract] = useState<'all' | 'yes' | 'no'>('all');
  const [hasReport, setHasReport] = useState<'all' | 'yes' | 'no'>('all');
  const [reportsBySession, setReportsBySession] = useState<Record<number, TaskReport[]>>({});

  const fetchData = useCallback(async () => {
    if (!memberId) return;
    try {
      setLoading(true);
      const res = await teachingHistoryApi.getSessionsByMember(memberId, {
        hasContract: hasContract === 'all' ? undefined : hasContract === 'yes',
        pageNumber,
        pageSize,
      });
      let rows = res.items ?? [];
      const q = search.trim().toLowerCase();
      if (q) {
        rows = rows.filter((x) => sessionDisplayName(x).toLowerCase().includes(q));
      }

      // fetch reports trước để có thể filter theo hasReport
      const sessionIds = rows.map((x) => x.sessionId).filter((id): id is number => !!id);
      const bySession: Record<number, TaskReport[]> = {};
      if (sessionIds.length) {
        const sessionIdSet = new Set(sessionIds);
        const reportRes = await taskReportApi.getAll({
          pageNumber: 1,
          pageSize: 500,
          sessionId: undefined,
          MemberId: memberId,
        });
        (reportRes.items ?? []).forEach((r) => {
          if (!r.sessionId) return;
          if (!sessionIdSet.has(r.sessionId)) return;
          if (!bySession[r.sessionId]) bySession[r.sessionId] = [];
          bySession[r.sessionId].push(r);
        });
      }

      if (hasReport !== 'all') {
        rows = rows.filter((x) => {
          const reported = !!(bySession[x.sessionId]?.length);
          return hasReport === 'yes' ? reported : !reported;
        });
      }

      setItems(rows);
      setTotalItems(rows.length);

      setReportsBySession(bySession);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [hasContract, hasReport, memberId, pageNumber, pageSize, search]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return {
    memberId,
    items,
    loading,
    pageNumber,
    pageSize,
    totalItems,
    search,
    hasContract,
    hasReport,
    reportsBySession,
    setPageNumber,
    setSearch,
    setHasContract,
    setHasReport,
    refetch: fetchData,
  };
}

