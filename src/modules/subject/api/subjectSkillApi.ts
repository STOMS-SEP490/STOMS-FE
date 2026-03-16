import axiosClient from '@/shared/lib/axios'

export type SubjectSkillItem = {
  subjectId: number
  skillId: number
  isActive?: boolean
  createdAt?: string | null
  skillName?: string
}

const subjectSkillApi = {
  /** Lấy danh sách skill của môn học (GET api/subject-skills/filter?subjectId=...) */
  getBySubject: async (subjectId: number): Promise<SubjectSkillItem[]> => {
    const res = await axiosClient.get('/subject-skills/filter', {
      params: { subjectId, pageNumber: 1, pageSize: 500 },
    })
    const data = res as any
    return data?.items ?? []
  },

  /** Gán nhiều skill cho môn học (POST api/subject-skills/bulk). Chỉ thêm skill chưa có. */
  assignBulk: async (subjectId: number, skillIds: number[]) => {
    return axiosClient.post<SubjectSkillItem[]>('/subject-skills/bulk', { subjectId, skillIds })
  },

  /** Gỡ một hoặc nhiều skill khỏi môn học (DELETE api/subject-skills/subject/{subjectId}/skills) */
  removeMany: async (subjectId: number, skillIds: number[]) => {
    return axiosClient.delete(`/subject-skills/subject/${subjectId}/skills`, {
      data: { skillIds },
    })
  },

  /** Vô hiệu hóa 1 skill của môn học (PUT api/subject-skills/subject/{subjectId}/skill/{skillId}/deactivate) */
  deactivate: async (subjectId: number, skillId: number) => {
    return axiosClient.put(`/subject-skills/subject/${subjectId}/skill/${skillId}/deactivate`)
  },

  /** Kích hoạt 1 skill của môn học (PUT api/subject-skills/subject/{subjectId}/skill/{skillId}/activate) */
  activate: async (subjectId: number, skillId: number) => {
    return axiosClient.put(`/subject-skills/subject/${subjectId}/skill/${skillId}/activate`)
  },

   /** Vô hiệu hóa nhiều skill của môn học (PUT api/subject-skills/subject/{subjectId}/skills/deactivate) */
   deactivateMany: async (subjectId: number, skillIds: number[]) => {
     return axiosClient.put(`/subject-skills/subject/${subjectId}/skills/deactivate`, {
       skillIds,
     })
   },

   /** Kích hoạt nhiều skill của môn học (PUT api/subject-skills/subject/{subjectId}/skills/activate) */
   activateMany: async (subjectId: number, skillIds: number[]) => {
     return axiosClient.put(`/subject-skills/subject/${subjectId}/skills/activate`, {
       skillIds,
     })
   },
}

export default subjectSkillApi

