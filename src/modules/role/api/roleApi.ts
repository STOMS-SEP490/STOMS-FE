import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type { RoleFilterParams, RoleListItem } from '../role';

const roleApi = {
  getRoles: (params?: RoleFilterParams): Promise<PaginationResponse<RoleListItem>> =>
    axiosClient.get('/roles/filter', { params }),

  getById: (id: number): Promise<RoleListItem> => axiosClient.get(`/roles/${id}`),

  create: (data: Partial<RoleListItem>): Promise<void> => axiosClient.post('/roles', data),

  update: (id: number, data: Partial<RoleListItem>): Promise<void> =>
    axiosClient.put(`/roles/${id}`, data),

  remove: (id: number): Promise<void> => axiosClient.delete(`/roles/${id}`),
};

export default roleApi;

