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

  approve: (id: number, payload: { approvedByMemberId?: number | null }): Promise<RequestListItem> =>
    axiosClient.put(`/requests/${id}/approve`, {
      ApprovedByMemberId: payload.approvedByMemberId ?? null,
    }),

  reject: (
    id: number,
    payload: { reason: string; approvedByMemberId?: number | null }
  ): Promise<RequestListItem> =>
    axiosClient.put(`/requests/${id}/reject`, {
      Reason: payload.reason,
      ApprovedByMemberId: payload.approvedByMemberId ?? null,
    }),

  update: (
    id: number,
    data: Partial<CreateRequestPayload>
  ): Promise<void> =>
    axiosClient.put(`/requests/${id}`, data),

  remove: (id: number): Promise<void> =>
    axiosClient.delete(`/requests/${id}`),
};