import axiosClient from '@/shared/lib/axios'

const eventSessionSkillApi = {
  /** Gán skill cho buổi (POST api/event-session-skills). Nếu đã tồn tại nhưng inactive thì gọi reactivate. */
  assign: async (eventSessionId: number, skillId: number) => {
    try {
      return await axiosClient.post('/event-session-skills', { eventSessionId, skillId })
    } catch {
      // best-effort: nếu đã tồn tại thì reactivate
      return axiosClient.patch(
        `/event-session-skills/event-session/${eventSessionId}/skill/${skillId}/reactivate`,
      )
    }
  },

  /** Gỡ skill khỏi buổi (soft delete) */
  remove: (eventSessionId: number, skillId: number) => {
    return axiosClient.delete(`/event-session-skills/${eventSessionId}`, { params: { skillId } })
  },

  /** Gán nhiều skill cho 1 buổi (bulk). */
  assignBulk: (eventSessionId: number, skillIds: number[]) => {
    return axiosClient.post(`/event-session-skills/event-session/${eventSessionId}/skills/bulk`, {
      SkillIds: skillIds,
    })
  },

  activateMany: (eventSessionId: number, skillIds: number[]) => {
    return axiosClient.put(`/event-session-skills/event-session/${eventSessionId}/skills/activate`, {
      SkillIds: skillIds,
    })
  },

  deactivateMany: (eventSessionId: number, skillIds: number[]) => {
    return axiosClient.put(`/event-session-skills/event-session/${eventSessionId}/skills/deactivate`, {
      SkillIds: skillIds,
    })
  },
}

export default eventSessionSkillApi

