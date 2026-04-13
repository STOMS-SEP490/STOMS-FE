import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type { CourseFilterParams, CourseListItem } from '../courseType';

const courseApi = {
  // GET PAGED + FILTER
  getCourses: (
    params?: CourseFilterParams
  ): Promise<PaginationResponse<CourseListItem>> => {
    return axiosClient.get('/courses/filter', { params });
  },

  // GET BY ID
  getById: (id: number): Promise<CourseListItem> => {
    return axiosClient.get(`/courses/${id}`);
  },

  // CREATE
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

  // UPDATE (basic fields)
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

  // ACTIVATE / DEACTIVATE
  activate: (id: number): Promise<CourseListItem> =>
    axiosClient.put(`/courses/${id}/activate`),

  deactivate: (id: number): Promise<CourseListItem> =>
    axiosClient.put(`/courses/${id}/deactivate`),

  // DELETE
  remove: (id: number): Promise<void> => {
    return axiosClient.delete(`/courses/${id}`);
  },
};

export default courseApi;