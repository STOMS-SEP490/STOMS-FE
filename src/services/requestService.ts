import axiosClient from '@/lib/axios';
import type { PaginationResponse } from '@/types/api';
import type { CreateRequestPayload, RequestListItem } from '@/types/request';

export type RequestFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  requestId?: number;
  status?: string;
};

const requestService = {
  // GET /requests/filter
  getRequests: async (
    params: RequestFilterParams
  ): Promise<PaginationResponse<RequestListItem>> => {
    return axiosClient.get('/requests/filter', { params });
  },

  // GET /requests/{id}
  getById: async (id: number): Promise<RequestListItem> => {
    return axiosClient.get(`/requests/${id}`);
  },

  // POST /requests
  create: async (payload: CreateRequestPayload): Promise<RequestListItem> => {
    return axiosClient.post('/requests', payload);
  },

  // PUT /requests/{id}
  update: async (
    id: number,
    payload: Partial<CreateRequestPayload>
  ): Promise<Request> => {
    return axiosClient.put(`/requests/${id}`, payload);
  },

  // DELETE /requests/{id}
  delete: async (id: number): Promise<void> => {
    return axiosClient.delete(`/requests/${id}`);
  },
};

export default requestService;