import axiosClient from '@/shared/lib/axios'
import type { PaginationResponse } from '@/shared/types/api'
import type {
  BorrowingFilterParams,
  BorrowingListItem,
  BorrowingCreatePayload,
} from '../borrowing'

const borrowingApi = {
  async getBorrowings(
    params?: BorrowingFilterParams
  ): Promise<PaginationResponse<BorrowingListItem>> {
    // axios interceptor đã return response.data => res chính là body
    const res = await axiosClient.get<
      PaginationResponse<BorrowingListItem>,
      PaginationResponse<BorrowingListItem>
    >(
      '/borrowings/filter',
      { params }
    )
    return res
  },

  async getById(id: number): Promise<BorrowingListItem> {
    const res = await axiosClient.get<BorrowingListItem, BorrowingListItem>(
      `/borrowings/${id}`
    )
    return res
  },

  async create(data: BorrowingCreatePayload): Promise<BorrowingListItem> {
    const body = {
      description: data.description ?? '',
      note: data.note ?? '',
      sessionIds: data.sessionIds ?? [],
      borrowedByMemberId: data.borrowedByMemberId,
      returnedDueDate: data.returnedDueDate,
      equipmentItems: data.equipmentIds.map((id) => ({
        equipmentId: id,
      })),
    }

    const res = await axiosClient.post<BorrowingListItem, BorrowingListItem>(
      '/borrowings',
      body
    )
    return res
  },
}

export default borrowingApi
