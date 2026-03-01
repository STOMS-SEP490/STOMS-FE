import { teamApi, type TeamFilterParams } from '../api/teamApi';
import type { Team } from '../team';
import type { PaginationResponse } from '@/shared/types/api';

const teamService = {
  async getTeams(
    params?: TeamFilterParams
  ): Promise<PaginationResponse<Team>> {
    return teamApi.getTeams(params);
  },

  async getTeamById(id: number): Promise<Team> {
    return teamApi.getById(id);
  },

  async createTeam(data: Partial<Team>) {
    return teamApi.create(data);
  },

  async updateTeam(id: number, data: Partial<Team>) {
    return teamApi.update(id, data);
  },

  async deleteTeam(id: number) {
    return teamApi.remove(id);
  },
};

export default teamService;