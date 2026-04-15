import { useQuery } from '@tanstack/react-query';
import teamService from '../services/teamService';

export const useTeams = (pageNumber: number, pageSize: number, search: string) => {
  const q = search.trim();
  return useQuery({
    queryKey: ['teams', 'list', pageNumber, pageSize, q],
    queryFn: () =>
      teamService.getTeams({
        pageNumber,
        pageSize,
        ...(q ? { teamName: q } : {}),
      }),
    staleTime: 30_000,
    select: (res) => ({
      items: res.items ?? [],
      totalItems: res.totalItems ?? 0,
    }),
  });
};
