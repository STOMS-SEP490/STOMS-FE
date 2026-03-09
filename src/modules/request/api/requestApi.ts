import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type {
  RequestFilterParams,
  RequestListItem,
  CreateRequestPayload,
} from '../request';

export const requestApi = {
  getRequests: (
    params?: RequestFilterParams
  ): Promise<PaginationResponse<RequestListItem>> =>
    axiosClient.get('/requests/filter', { params }),

  getById: (id: number): Promise<RequestListItem> =>
    axiosClient.get(`/requests/${id}`),

  create: (data: CreateRequestPayload): Promise<void> =>
    axiosClient.post('/requests', data),

  update: (
    id: number,
    data: Partial<CreateRequestPayload>
  ): Promise<void> =>
    axiosClient.put(`/requests/${id}`, data),

  remove: (id: number): Promise<void> =>
    axiosClient.delete(`/requests/${id}`),
};