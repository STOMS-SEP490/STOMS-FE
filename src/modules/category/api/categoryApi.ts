import axiosClient from '@/shared/lib/axios'
import type { PaginationResponse } from '@/shared/types/api'
import type {
  CategoryFilterParams,
  CategoryListItem,
} from '../category'

const categoryApi = {
  getCategories: (
    params?: CategoryFilterParams
  ): Promise<PaginationResponse<CategoryListItem>> =>
    axiosClient.get('/categories/filter', { params }),

  getById: (id: number): Promise<CategoryListItem> =>
    axiosClient.get(`/categories/${id}`),

  create: (data: Partial<CategoryListItem>): Promise<void> =>
    axiosClient.post('/categories', data),

  update: (
    id: number,
    data: Partial<CategoryListItem>
  ): Promise<void> =>
    axiosClient.put(`/categories/${id}`, data),

  remove: (id: number): Promise<void> =>
    axiosClient.delete(`/categories/${id}`),
}

export default categoryApi

