import { useEffect, useState } from 'react';
import teamService from '../services/teamService';
import type { Team } from '../team';

export const useTeams = (
  pageNumber: number,
  pageSize: number,
  search: string
) => {
  const [data, setData] = useState<Team[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);

        const res = await teamService.getTeams({
          pageNumber,
          pageSize,
          search,
        });

        setData(res.items ?? []);
        setTotalItems(res.totalItems ?? 0);
      } catch (err) {
        console.error('fetch teams error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, [pageNumber, pageSize, search]);

  return { data, totalItems, loading };
};