import axiosClient from '@/shared/lib/axios'
import type { PaginationResponse } from '@/shared/types/api'
import type {
  SubjectFilterParams,
  SubjectListItem,
  SubjectUpsertPayload,
} from '../subject'

const subjectApi = {
  // GET PAGED + FILTER
  getSubjects: (
    params?: SubjectFilterParams
  ): Promise<PaginationResponse<SubjectListItem>> => {
    return axiosClient.get('/subjects/filter', { params })
  },

  // GET BY ID
  getById: (id: number): Promise<SubjectListItem> => {
    return axiosClient.get(`/subjects/${id}`)
  },

  // CREATE
  create: (data: SubjectUpsertPayload): Promise<SubjectListItem> => {
    return axiosClient.post('/subjects', data)
  },

  // UPDATE
  update: (
    id: number,
    data: SubjectUpsertPayload
  ): Promise<SubjectListItem> => {
    return axiosClient.put(`/subjects/${id}`, data)
  },

  // ACTIVATE / DEACTIVATE
  activate: (id: number): Promise<SubjectListItem> =>
    axiosClient.put(`/subjects/${id}/activate`),

  deactivate: (id: number): Promise<SubjectListItem> =>
    axiosClient.put(`/subjects/${id}/deactivate`),

  // DELETE
  remove: (id: number): Promise<void> => {
    return axiosClient.delete(`/subjects/${id}`)
  },
}

export default subjectApi