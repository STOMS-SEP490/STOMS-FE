import axiosInstance from '@/lib/axios';
import type { CreateRequestPayload } from '@/types/request';


export const requestService = {
  create: async (payload: CreateRequestPayload) => {
    const res = await axiosInstance.post(
      '/api/requests',
      payload
    );
    return res.data;
  },

  getById: async (id: number) => {
    const res = await axiosInstance.get(`/requests/${id}`);
    return res.data;
  },

  filter: async (params?: {
    pageNumber?: number;
    pageSize?: number;
    search?: string;
  }) => {
    const res = await axiosInstance.get('/requests/filter', {
      params,
    });
    return res.data;
  },
};