import axiosClient from '@/shared/lib/axios'

const eventSessionTopicApi = {
  /** Gán topic cho buổi (POST api/event-session-topics). Nếu đã tồn tại nhưng inactive thì gọi reactivate. */
  assign: async (eventSessionId: number, topicId: number) => {
    try {
      return await axiosClient.post('/event-session-topics', { eventSessionId, topicId })
    } catch {
      return axiosClient.patch(
        `/event-session-topics/event-session/${eventSessionId}/topic/${topicId}/reactivate`,
      )
    }
  },

  /** Gỡ topic khỏi buổi (soft delete) */
  remove: (eventSessionId: number, topicId: number) => {
    return axiosClient.delete(`/event-session-topics/${eventSessionId}`, { params: { topicId } })
  },

  /** Gán nhiều topic cho 1 buổi (bulk). */
  assignBulk: (eventSessionId: number, topicIds: number[]) => {
    return axiosClient.post(`/event-session-topics/event-session/${eventSessionId}/topics/bulk`, {
      TopicIds: topicIds,
    })
  },

  activateMany: (eventSessionId: number, topicIds: number[]) => {
    return axiosClient.put(`/event-session-topics/event-session/${eventSessionId}/topics/activate`, {
      TopicIds: topicIds,
    })
  },

  deactivateMany: (eventSessionId: number, topicIds: number[]) => {
    return axiosClient.put(`/event-session-topics/event-session/${eventSessionId}/topics/deactivate`, {
      TopicIds: topicIds,
    })
  },
}

export default eventSessionTopicApi

