import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type { Team } from '../team';

export type TeamFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
};

export const teamApi = {
  getTeams: (
    params?: TeamFilterParams
  ): Promise<PaginationResponse<Team>> =>
    axiosClient.get('/teams/filter', { params }),

  getById: (id: number): Promise<Team> =>
    axiosClient.get(`/teams/${id}`),

  create: (data: Partial<Team>): Promise<void> =>
    axiosClient.post('/teams', data),

  update: (
    id: number,
    data: Partial<Team>
  ): Promise<void> =>
    axiosClient.put(`/teams/${id}`, data),

  remove: (id: number): Promise<void> =>
    axiosClient.delete(`/teams/${id}`),
};