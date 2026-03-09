import axiosClient from '@/shared/lib/axios'

export type SubjectSkillItem = {
  subjectId: number
  skillId: number
  isActive?: boolean
  createdAt?: string | null
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
}

export default subjectSkillApi

