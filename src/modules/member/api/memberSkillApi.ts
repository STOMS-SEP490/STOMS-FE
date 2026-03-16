import axiosClient from '@/shared/lib/axios'

export type MemberSkillItem = {
  memberId: number
  skillId: number
  isActive?: boolean
  createdAt?: string | null
  skillName?: string
}

const memberSkillApi = {
  /** Lấy danh sách skill của member (GET api/member-skills/filter?memberId=...) */
  getByMember: async (memberId: number): Promise<MemberSkillItem[]> => {
    const res = await axiosClient.get('/member-skills/filter', {
      params: { memberId, pageNumber: 1, pageSize: 500 },
    })
    const data = res as any
    return data?.items ?? []
  },

  /** Gán nhiều skill cho member (POST api/member-skills/bulk). */
  assignBulk: async (memberId: number, skillIds: number[]) => {
    return axiosClient.post<MemberSkillItem[]>('/member-skills/bulk', { memberId, skillIds })
  },

  /** Gỡ một skill khỏi member (DELETE api/member-skills/{memberId}/{skillId}). */
  remove: async (memberId: number, skillId: number) => {
    return axiosClient.delete(`/member-skills/${memberId}/${skillId}`)
  },

  deactivateMany: async (memberId: number, skillIds: number[]) => {
    return axiosClient.put(`/member-skills/member/${memberId}/skills/deactivate`, {
      skillIds,
    })
  },

  activateMany: async (memberId: number, skillIds: number[]) => {
    return axiosClient.put(`/member-skills/member/${memberId}/skills/activate`, {
      skillIds,
    })
  },
}

export default memberSkillApi
