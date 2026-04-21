import axiosClient from '@/shared/lib/axios'

export type EventSessionCreatePayload = {
  title: string
  description: string
  eventId: number
  duration?: string // "HH:mm:ss"
  sessionNo?: number
}

export type EventSessionUpdatePayload = {
  title: string
  description: string
  duration?: string // "HH:mm:ss"
}

const eventSessionApi = {
  create: (data: EventSessionCreatePayload) => {
    return axiosClient.post('/event-sessions', {
      title: data.title,
      description: data.description,
      eventId: data.eventId,
      duration: data.duration,
      sessionNo: data.sessionNo,
    })
  },

  update: (id: number, data: EventSessionUpdatePayload) => {
    return axiosClient.put(`/event-sessions/${id}`, {
      title: data.title,
      description: data.description,
      duration: data.duration,
    })
  },

  remove: (id: number) => {
    return axiosClient.delete(`/event-sessions/${id}`)
  },
}

export default eventSessionApi

