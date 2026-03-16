import { useEffect, useState, useCallback } from 'react';
import teamService from '../services/teamService';
import type { Team } from '../team';

export const useTeams = (
  pageNumber: number,
  pageSize: number,
  search: string,
  refreshKey = 0
) => {
  const [data, setData] = useState<Team[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await teamService.getTeams({
        pageNumber,
        pageSize,
        ...(search.trim() ? { teamName: search.trim() } : {}),
      });
      setData(res.items ?? []);
      setTotalItems(res.totalItems ?? 0);
    } catch (err) {
      console.error('fetch teams error:', err);
    } finally {
      setLoading(false);
    }
  }, [pageNumber, pageSize, search]);

  useEffect(() => {
    refetch();
  }, [refetch, refreshKey]);

  return { data, totalItems, loading, refetch };
};