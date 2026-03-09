import axiosClient from '@/shared/lib/axios';
import type { Team } from '@/modules/team/team';

export const sessionApi = {
  // Gợi ý đội cho phiên: GET /api/sessions/suggest-team?sessionId=...
  suggestTeams: (sessionId: number): Promise<Team[]> =>
    axiosClient.get('/sessions/suggest-team', {
      params: { sessionId },
    }),
};

