import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type { Team } from '../team';

export type TeamFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  teamId?: number;
  teamName?: string;
  leaderMemberId?: number;
};

export type TeamCreatePayload = {
  teamName: string;
  leaderMemberId?: number;
};

export type TeamUpdatePayload = {
  teamName: string;
  leaderMemberId?: number;
};

export const teamApi = {
  /** GET api/teams/filter */
  getTeams: (
    params?: TeamFilterParams
  ): Promise<PaginationResponse<Team>> =>
    axiosClient.get('/teams/filter', { params }),

  /** GET api/teams/:id */
  getById: (id: number): Promise<Team> =>
    axiosClient.get(`/teams/${id}`),

  /** POST api/teams */
  create: (data: TeamCreatePayload): Promise<Team> =>
    axiosClient.post('/teams', data),

  /** PUT api/teams/:id */
  update: (id: number, data: TeamUpdatePayload): Promise<Team> =>
    axiosClient.put(`/teams/${id}`, data),

  /** DELETE api/teams/:id */
  remove: (id: number): Promise<void> =>
    axiosClient.delete(`/teams/${id}`),

  /** PUT api/teams/:id/leader - Gán trưởng nhóm */
  assignLeader: (teamId: number, leaderMemberId: number): Promise<Team> =>
    axiosClient.put(`/teams/${teamId}/leader`, { leaderMemberId }),

  /** POST api/team-members - Thêm thành viên vào nhóm */
  addMembers: (teamId: number, memberIds: number[]): Promise<void> =>
    axiosClient.post('/team-members', { teamId, memberIds }),
};
