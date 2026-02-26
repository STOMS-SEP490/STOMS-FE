import axiosClient from '@/lib/axios';
import type { PaginationResponse } from '@/types/api';
import type { Team } from '@/types/team';

export type TeamFilterParams = {
  pageNumber?: number;
  pageSize?: number;
};

const teamService = {
  getTeams: async (params: TeamFilterParams): Promise<PaginationResponse<Team>> => {
    return axiosClient.get('/teams/filter', { params });
  },

  getTeamById: async (teamId: number): Promise<Team> => {
    return axiosClient.get(`/teams/${teamId}`);
  },

  createTeam: async (payload: { teamName: string; leaderMemberId?: number }) => {
    return axiosClient.post('/teams', payload);
  },

  updateTeam: async (
    teamId: number,
    payload: {
      teamName?: string;
      leaderMemberId?: number;
    }
  ) => {
    return axiosClient.put(`/teams/${teamId}`, payload);
  },

  deleteTeam: async (teamId: number) => {
    return axiosClient.delete(`/teams/${teamId}`);
  },
};

export default teamService;
