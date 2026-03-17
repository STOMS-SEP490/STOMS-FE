import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type { ContractFilterParams, ContractListItem } from '../contract';

const contractApi = {
  /** GET /api/contracts/filter */
  getContracts: async (
    params?: ContractFilterParams,
  ): Promise<PaginationResponse<ContractListItem>> => {
    return axiosClient.get('/contracts/filter', { params });
  },

  /** GET /api/contracts/{id} */
  getById: async (id: number): Promise<ContractListItem> => {
    return axiosClient.get(`/contracts/${id}`);
  },

  /** POST /api/contracts */
  create: async (data: Partial<ContractListItem>): Promise<void> => {
    return axiosClient.post('/contracts', data);
  },

  /** PUT /api/contracts/{id} */
  update: async (id: number, data: Partial<ContractListItem>): Promise<void> => {
    return axiosClient.put(`/contracts/${id}`, data);
  },

  /** PUT /api/contracts/{id}/contract-status */
  markAsPaid: async (id: number): Promise<ContractListItem> => {
    return axiosClient.put(`/contracts/${id}/contract-status`);
  },
};

export default contractApi;
