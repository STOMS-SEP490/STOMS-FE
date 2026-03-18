import axiosClient from '@/shared/lib/axios';
import type { Team } from '@/modules/team/team';
import type { SessionDetail } from './type';

const sessionApi = {
  // SUGGEST TEAMS
  suggestTeams: (sessionId: number): Promise<Team[]> => {
    return axiosClient.get(`/sessions/${sessionId}/team-suggestions`);
  },

  // GET BY ID
  getById: (id: number): Promise<SessionDetail> => {
    return axiosClient.get(`/sessions/${id}`);
  },
};

export default sessionApi;

