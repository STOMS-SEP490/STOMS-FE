import axiosClient from '@/shared/lib/axios'
import type { PaginationResponse } from '@/shared/types/api'
import type {
  SkillFilterParams,
  SkillListItem,
  SkillUpsertPayload,
} from '../skill'

const skillApi = {
  // GET PAGED + FILTER
  getSkills: (
    params?: SkillFilterParams
  ): Promise<PaginationResponse<SkillListItem>> =>
    axiosClient.get('/skills/filter', { params }),

  // GET BY ID
  getById: (id: number): Promise<SkillListItem> =>
    axiosClient.get(`/skills/${id}`),

  // CREATE
  create: (data: SkillUpsertPayload): Promise<SkillListItem> =>
    axiosClient.post('/skills', data),

  // UPDATE
  update: (
    id: number,
    data: SkillUpsertPayload
  ): Promise<SkillListItem> =>
    axiosClient.put(`/skills/${id}`, data),

  // ACTIVATE / DEACTIVATE
  activate: (id: number): Promise<SkillListItem> =>
    axiosClient.put(`/skills/${id}/activate`),

  deactivate: (id: number): Promise<SkillListItem> =>
    axiosClient.put(`/skills/${id}/deactivate`),

  // DELETE
  remove: (id: number): Promise<void> =>
    axiosClient.delete(`/skills/${id}`),
}

export default skillApi

