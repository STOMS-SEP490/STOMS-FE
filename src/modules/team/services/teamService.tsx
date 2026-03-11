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

  async removeMembers(memberIds: number[]): Promise<void> {
    return teamApi.removeMembers(memberIds);
  },

  async addTopicsBulk(teamId: number, topicIds: number[]): Promise<void> {
    return teamApi.addTopicsBulk(teamId, topicIds);
  },

  async removeTopicsBulk(teamId: number, topicIds: number[]): Promise<void> {
    return teamApi.removeTopicsBulk(teamId, topicIds);
  },

  async activateTopicsMany(teamId: number, topicIds: number[]): Promise<void> {
    return teamApi.activateTopicsMany(teamId, topicIds);
  },

  async deactivateTopicsMany(teamId: number, topicIds: number[]): Promise<void> {
    return teamApi.deactivateTopicsMany(teamId, topicIds);
  },
};

export default teamService;