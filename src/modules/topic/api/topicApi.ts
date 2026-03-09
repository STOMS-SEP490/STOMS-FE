import axiosClient from '@/shared/lib/axios'
import type { PaginationResponse } from '@/shared/types/api'
import type {
  TopicFilterParams,
  TopicListItem,
} from '../topic'

const topicApi = {
  // GET PAGED + FILTER
  getTopics: (
    params?: TopicFilterParams
  ): Promise<PaginationResponse<TopicListItem>> =>
    axiosClient.get('/topics/filter', { params }),

  // GET BY ID
  getById: (id: number): Promise<TopicListItem> =>
    axiosClient.get(`/topics/${id}`),

  // CREATE
  create: (data: Partial<TopicListItem>): Promise<void> =>
    axiosClient.post('/topics', data),

  // UPDATE
  update: (
    id: number,
    data: Partial<TopicListItem>
  ): Promise<void> =>
    axiosClient.put(`/topics/${id}`, data),

  // ACTIVATE / DEACTIVATE
  activate: (id: number): Promise<TopicListItem> =>
    axiosClient.put(`/topics/${id}/activate`),

  deactivate: (id: number): Promise<TopicListItem> =>
    axiosClient.put(`/topics/${id}/deactivate`),

  // DELETE
  remove: (id: number): Promise<void> =>
    axiosClient.delete(`/topics/${id}`),
}

export default topicApi

