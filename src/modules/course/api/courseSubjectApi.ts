import axiosClient from '@/shared/lib/axios'

export type CourseSubjectItem = {
  courseId: number
  subjectId: number
  createdAt?: string | null
}

const courseSubjectApi = {
  /** Gán nhiều môn học cho một khóa (POST api/course-subjects/bulk). Chỉ thêm subject chưa có. */
  assignBulk: async (courseId: number, subjectIds: number[]) => {
    return axiosClient.post<CourseSubjectItem[]>('/course-subjects/bulk', {
      courseId,
      subjectIds,
    })
  },

  /** Gỡ nhiều môn khỏi khóa (DELETE api/course-subjects/course/{courseId}/subjects) */
  removeMany: async (courseId: number, subjectIds: number[]) => {
    return axiosClient.delete(`/course-subjects/course/${courseId}/subjects`, {
      data: { subjectIds },
    })
  },

  activateMany: async (courseId: number, subjectIds: number[]) => {
    return axiosClient.put(`/course-subjects/course/${courseId}/subjects/activate`, {
      subjectIds,
    })
  },

  deactivateMany: async (courseId: number, subjectIds: number[]) => {
    return axiosClient.put(`/course-subjects/course/${courseId}/subjects/deactivate`, {
      subjectIds,
    })
  },
}

export default courseSubjectApi

