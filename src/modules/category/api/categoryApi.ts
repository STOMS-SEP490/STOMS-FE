import axiosClient from '@/shared/lib/axios'
import type { PaginationResponse } from '@/shared/types/api'
import type {
  CategoryFilterParams,
  CategoryListItem,
} from '../category'

const categoryApi = {
  // GET PAGED + FILTER
  getCategories: (
    params?: CategoryFilterParams
  ): Promise<PaginationResponse<CategoryListItem>> =>
    axiosClient.get('/categories/filter', { params }),

  // GET BY ID
  getById: (id: number): Promise<CategoryListItem> =>
    axiosClient.get(`/categories/${id}`),

  // CREATE
  create: (data: Partial<CategoryListItem>): Promise<void> =>
    axiosClient.post('/categories', data),

  // UPDATE
  update: (
    id: number,
    data: Partial<CategoryListItem>
  ): Promise<void> =>
    axiosClient.put(`/categories/${id}`, data),
}

export default categoryApi

