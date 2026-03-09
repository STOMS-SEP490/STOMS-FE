import axiosClient from '@/shared/lib/axios'
import type { PaginationResponse } from '@/shared/types/api'
import type {
  ContractFilterParams,
  ContractListItem,
} from '../contract'

const contractApi = {
  // GET PAGED + FILTER
  getContracts: (
    params?: ContractFilterParams
  ): Promise<PaginationResponse<ContractListItem>> =>
    axiosClient.get('/contracts/filter', { params }),

  // GET BY ID
  getById: (id: number): Promise<ContractListItem> =>
    axiosClient.get(`/contracts/${id}`),

  // CREATE
  create: (data: Partial<ContractListItem>): Promise<void> =>
    axiosClient.post('/contracts', data),

  // UPDATE INFO
  update: (
    id: number,
    data: Partial<ContractListItem>
  ): Promise<void> =>
    axiosClient.put(`/contracts/${id}`, data),

  // MARK AS PAID
  markAsPaid: (id: number): Promise<ContractListItem> =>
    axiosClient.put(`/contracts/${id}/contract-status`),
}

export default contractApi

