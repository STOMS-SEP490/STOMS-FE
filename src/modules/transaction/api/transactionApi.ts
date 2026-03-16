import axiosClient from '@/shared/lib/axios'
import type { PaginationResponse } from '@/shared/types/api'
import type {
  TransactionFilterParams,
  TransactionListItem,
} from '../transaction'

const transactionApi = {
  // GET PAGED + FILTER
  getTransactions: (
    params?: TransactionFilterParams
  ): Promise<PaginationResponse<TransactionListItem>> =>
    axiosClient.get('/transactions/filter', { params }),

  // GET BY ID
  getById: (id: number): Promise<TransactionListItem> =>
    axiosClient.get(`/transactions/${id}`),

  // CREATE
  create: (data: Partial<TransactionListItem>): Promise<void> =>
    axiosClient.post('/transactions', data),

  // UPDATE
  update: (
    id: number,
    data: Partial<TransactionListItem>
  ): Promise<void> =>
    axiosClient.put(`/transactions/${id}`, data),

  // DELETE
  remove: (id: number): Promise<void> =>
    axiosClient.delete(`/transactions/${id}`),
}

export default transactionApi

