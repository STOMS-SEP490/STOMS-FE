import axiosClient from '@/shared/lib/axios'

type SubjectSessionCreatePayload = {
  title: string
  description: string
  subjectId: number
  duration: string // TimeSpan format "hh:mm:ss"
  sessionNo: number
}

const subjectSessionApi = {
  create: (data: SubjectSessionCreatePayload) => {
    return axiosClient.post('/subject-sessions', data)
  },

  delete: (id: number) => {
    return axiosClient.delete(`/subject-sessions/${id}`)
  },
}

export default subjectSessionApi

