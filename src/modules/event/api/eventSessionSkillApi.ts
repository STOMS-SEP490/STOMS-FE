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
}

export default eventSessionSkillApi

