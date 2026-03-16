import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type { RoleFilterParams, RoleListItem } from '../role';

const roleApi = {
  // GET PAGED + FILTER
  getRoles: (params?: RoleFilterParams): Promise<PaginationResponse<RoleListItem>> =>
    axiosClient.get('/roles/filter', { params }),

  // GET BY ID
  getById: (id: number): Promise<RoleListItem> => axiosClient.get(`/roles/${id}`),

  // CREATE
  create: (data: Partial<RoleListItem>): Promise<void> => axiosClient.post('/roles', data),

  // UPDATE
  update: (id: number, data: Partial<RoleListItem>): Promise<void> =>
    axiosClient.put(`/roles/${id}`, data),

  // DELETE
  remove: (id: number): Promise<void> => axiosClient.delete(`/roles/${id}`),
};

export default roleApi;

