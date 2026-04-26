import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type { CourseFilterParams, CourseListItem } from '../courseType';

const courseApi = {
  getCourses: (
    params?: CourseFilterParams
  ): Promise<PaginationResponse<CourseListItem>> => {
    return axiosClient.get('/courses/filter', { params });
  },

  getById: (id: number): Promise<CourseListItem> => {
    return axiosClient.get(`/courses/${id}`);
  },

  create: (data: {
    courseCode: string;
    courseName: string;
    description: string;
    courseSubjects: { subjectId: number }[];
  }): Promise<CourseListItem> => {
    return axiosClient.post('/courses', {
      courseCode: data.courseCode,
      courseName: data.courseName,
      description: data.description ?? '',
      courseSubjects: data.courseSubjects ?? [],
    });
  },

  update: (
    id: number,
    data: { courseCode: string; courseName: string; description?: string }
  ): Promise<void> => {
    return axiosClient.put(`/courses/${id}`, {
      courseCode: data.courseCode,
      courseName: data.courseName,
      description: data.description ?? '',
    });
  },

  activate: (id: number): Promise<CourseListItem> =>
    axiosClient.put(`/courses/${id}/activate`),

  deactivate: (id: number): Promise<CourseListItem> =>
    axiosClient.put(`/courses/${id}/deactivate`),

  remove: (id: number): Promise<void> => {
    return axiosClient.delete(`/courses/${id}`);
  },
};

export default courseApi;