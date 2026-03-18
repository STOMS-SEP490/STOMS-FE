import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type {
  RequestFilterParams,
  RequestListItem,
  CreateRequestPayload,
} from '../request';

const requestApi = {
  getRequests: (params?: RequestFilterParams): Promise<PaginationResponse<RequestListItem>> => {
    return axiosClient.get('/requests/filter', { params });
  },

  getById: (id: number): Promise<RequestListItem> => {
    return axiosClient.get(`/requests/${id}`);
  },

  create: (data: CreateRequestPayload): Promise<void> => {
    return axiosClient.post('/requests', data);
  },

  approve: (id: number, payload: { approvedByMemberId?: number | null }): Promise<RequestListItem> => {
    return axiosClient.put(`/requests/${id}/approve`, {
      ApprovedByMemberId: payload.approvedByMemberId ?? null,
    });
  },

  reject: (id: number, payload: { reason: string; approvedByMemberId?: number | null }): Promise<RequestListItem> => {
    return axiosClient.put(`/requests/${id}/reject`, {
      Reason: payload.reason,
      ApprovedByMemberId: payload.approvedByMemberId ?? null,
    });
  },

  update: (id: number, data: Partial<CreateRequestPayload>): Promise<void> => {
    return axiosClient.put(`/requests/${id}`, data);
  },

  remove: (id: number): Promise<void> => {
    return axiosClient.delete(`/requests/${id}`);
  },
};

export default requestApi;