import axiosClient from '@/shared/lib/axios'
import type { PaginationResponse } from '@/shared/types/api'
import type { BorrowingFilterParams, BorrowingListItem } from '../borrowing'

const borrowingApi = {
  getBorrowings: (
    params?: BorrowingFilterParams
  ): Promise<PaginationResponse<BorrowingListItem>> =>
    axiosClient.get('/borrowings/filter', { params }),

  getById: (id: number): Promise<BorrowingListItem> =>
    axiosClient.get(`/borrowings/${id}`),
}

export default borrowingApi
