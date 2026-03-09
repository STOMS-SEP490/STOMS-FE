import {
  teamApi,
  type TeamFilterParams,
  type TeamCreatePayload,
  type TeamUpdatePayload,
} from '../api/teamApi';
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

  async createTeam(data: TeamCreatePayload): Promise<Team> {
    return teamApi.create(data);
  },

  async updateTeam(id: number, data: TeamUpdatePayload): Promise<Team> {
    return teamApi.update(id, data);
  },

  async deleteTeam(id: number): Promise<void> {
    return teamApi.remove(id);
  },

  async assignLeader(teamId: number, leaderMemberId: number): Promise<Team> {
    return teamApi.assignLeader(teamId, leaderMemberId);
  },

  async addMembers(teamId: number, memberIds: number[]): Promise<void> {
    return teamApi.addMembers(teamId, memberIds);
  },
};

export default teamService;