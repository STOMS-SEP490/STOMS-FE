import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type {
  Team,
  TeamDetail,
  TeamFilterParams,
  TeamCreatePayload,
  TeamUpdatePayload,
} from '../team';

export const teamApi = {
  getTeams: async (params?: TeamFilterParams): Promise<PaginationResponse<Team>> => {
    return axiosClient.get('/teams/filter', { params });
  },

  getById: async (id: number): Promise<Team> => {
    return axiosClient.get(`/teams/${id}`);
  },

  create: async (data: TeamCreatePayload): Promise<Team> => {
    return axiosClient.post('/teams', data);
  },

  update: async (id: number, data: TeamUpdatePayload): Promise<Team> => {
    return axiosClient.put(`/teams/${id}`, data);
  },

  remove: async (id: number): Promise<void> => {
    await axiosClient.delete(`/teams/${id}`);
  },

  assignLeader: async (teamId: number, leaderMemberId: number): Promise<Team> => {
    return axiosClient.put(`/teams/${teamId}/leader`, { leaderMemberId });
  },

  addMembers: async (teamId: number, memberIds: number[]): Promise<void> => {
    await axiosClient.post('/team-members', { teamId, memberIds });
  },

  removeMembers: async (memberIds: number[]): Promise<void> => {
    await axiosClient.delete('/team-members', { data: { memberIds } });
  },

  addTopicsBulk: async (teamId: number, topicIds: number[]): Promise<void> => {
    await axiosClient.post('/team-topics/bulk', { teamId, topicIds });
  },

  removeTopicsBulk: async (teamId: number, topicIds: number[]): Promise<void> => {
    await axiosClient.delete(`/team-topics/team/${teamId}/topics`, { data: { topicIds } });
  },

  activateTopicsMany: async (teamId: number, topicIds: number[]): Promise<void> => {
    await axiosClient.put(`/team-topics/team/${teamId}/topics/activate`, { topicIds });
  },

  deactivateTopicsMany: async (teamId: number, topicIds: number[]): Promise<void> => {
    await axiosClient.put(`/team-topics/team/${teamId}/topics/deactivate`, { topicIds });
  },

  getTeamByMember: async (memberId: number): Promise<TeamDetail> => {
    return axiosClient.get(`/teams/member/${memberId}`);
  },
};
