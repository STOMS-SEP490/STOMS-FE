import { useEffect, useState, useCallback } from 'react';
import { teamApi } from '../api/teamApi';
import type { TeamDetail } from '../team';

export const useTeamByMember = (memberId: number) => {
  const [data, setData] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!memberId) return;
    try {
      setLoading(true);
      const res = await teamApi.getTeamByMember(memberId);
      setData(res);
    } catch (err) {
      console.error('fetch team by member error:', err);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    if (memberId) refetch();
  }, [memberId, refetch]);

  return { data, loading, refetch };
};
