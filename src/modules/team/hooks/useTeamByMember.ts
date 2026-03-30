import { useEffect, useState, useCallback } from 'react';
import { teamApi } from '../api/teamApi';
import type { TeamDetail } from '../team';

export const useTeamByMember = (memberId: number) => {
  const [data, setData] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!memberId) {
      setData(null);
      return;
    }
    try {
      setLoading(true);

      // GET /api/teams/filter -> lấy teamId theo leader hiện tại
      const paged = await teamApi.getTeams({
        leaderMemberId: memberId,
        pageNumber: 1,
        pageSize: 10,
      });

      const teamId = paged.items?.[0]?.teamId;
      if (!teamId) {
        setData(null);
        return;
      }

      // GET /api/teams/{teamId} -> trả về TeamDetailResponse (có members)
      const team = await teamApi.getById(teamId);
      setData(team as unknown as TeamDetail);
    } catch (err) {
      console.error('fetch team by member error:', err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    if (memberId) refetch();
  }, [memberId, refetch]);

  return { data, loading, refetch };
};
