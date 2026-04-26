import axiosClient from '@/shared/lib/axios'
import type { PaginationResponse } from '@/shared/types/api'
import type {
  SkillFilterParams,
  SkillListItem,
  SkillUpsertPayload,
} from '../skill'

const skillApi = {
  getSkills: (
    params?: SkillFilterParams
  ): Promise<PaginationResponse<SkillListItem>> =>
    axiosClient.get('/skills/filter', { params }),

  getById: (id: number): Promise<SkillListItem> =>
    axiosClient.get(`/skills/${id}`),

  create: (data: SkillUpsertPayload): Promise<SkillListItem> =>
    axiosClient.post('/skills', data),

  update: (
    id: number,
    data: SkillUpsertPayload
  ): Promise<SkillListItem> =>
    axiosClient.put(`/skills/${id}`, data),

  activate: (id: number): Promise<SkillListItem> =>
    axiosClient.put(`/skills/${id}/activate`),

  deactivate: (id: number): Promise<SkillListItem> =>
    axiosClient.put(`/skills/${id}/deactivate`),

  remove: (id: number): Promise<void> =>
    axiosClient.delete(`/skills/${id}`),
}

export default skillApi

