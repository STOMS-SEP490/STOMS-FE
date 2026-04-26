import axiosClient from '@/shared/lib/axios'
import type { PaginationResponse } from '@/shared/types/api'
import type {
  SubjectFilterParams,
  SubjectListItem,
  SubjectUpsertPayload,
} from '../subject'

const subjectApi = {
  getSubjects: (
    params?: SubjectFilterParams
  ): Promise<PaginationResponse<SubjectListItem>> => {
    return axiosClient.get('/subjects/filter', { params })
  },

  getById: (id: number): Promise<SubjectListItem> => {
    return axiosClient.get(`/subjects/${id}`)
  },

  create: (data: SubjectUpsertPayload): Promise<SubjectListItem> => {
    return axiosClient.post('/subjects', data)
  },

  update: (
    id: number,
    data: SubjectUpsertPayload
  ): Promise<SubjectListItem> => {
    return axiosClient.put(`/subjects/${id}`, data)
  },

  activate: (id: number): Promise<SubjectListItem> =>
    axiosClient.put(`/subjects/${id}/activate`),

  deactivate: (id: number): Promise<SubjectListItem> =>
    axiosClient.put(`/subjects/${id}/deactivate`),

  remove: (id: number): Promise<void> => {
    return axiosClient.delete(`/subjects/${id}`)
  },

  /** Gán chủ đề cho môn học (PUT api/subjects/{id}/topic). topicId = null để gỡ chủ đề. */
  assignTopic: (id: number, topicId: number | null): Promise<SubjectListItem> => {
    return axiosClient.put(`/subjects/${id}/topic`, { topicId })
  },
}

export default subjectApi