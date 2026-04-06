import { useCallback, useEffect, useMemo, useState } from 'react';
import { teamApi } from '../api/teamApi';
import type { TeamDetail } from '../team';

export function useMyTeam() {
  const memberId = useMemo(() => {
    try {
      const id = Number(JSON.parse(localStorage.getItem('user') || '{}')?.memberId ?? 0);
      return id > 0 ? id : 0;
    } catch {
      return 0;
    }
  }, []);

  const [data, setData] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!memberId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await teamApi.loadMyTeamDetail(memberId);
      setData(res);
    } catch (e) {
      console.error('load my team error', e);
      setData(null);
      setError('Không tải được dữ liệu nhóm. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch, memberId };
}
