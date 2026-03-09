import axiosClient from '@/shared/lib/axios'
import type { PaginationResponse } from '@/shared/types/api'
import type {
  SubjectFilterParams,
  SubjectListItem,
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
  create: (data: Partial<SubjectListItem>): Promise<void> => {
    return axiosClient.post('/subjects', data)
  },

  // UPDATE
  update: (
    id: number,
    data: Partial<SubjectListItem>
  ): Promise<void> => {
    return axiosClient.put(`/subjects/${id}`, data)
  },

  // DELETE
  remove: (id: number): Promise<void> => {
    return axiosClient.delete(`/subjects/${id}`)
  },
}

export default subjectApi