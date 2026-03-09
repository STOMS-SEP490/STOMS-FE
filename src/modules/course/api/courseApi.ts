import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type {
  CourseFilterParams,
  CourseListItem,
} from '../courseType';

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
  create: (data: Partial<CourseListItem>): Promise<void> => {
    return axiosClient.post('/courses', data);
  },

  // UPDATE
  update: (
    id: number,
    data: Partial<CourseListItem>
  ): Promise<void> => {
    return axiosClient.put(`/courses/${id}`, data);
  },

  // DELETE
  remove: (id: number): Promise<void> => {
    return axiosClient.delete(`/courses/${id}`);
  },
};

export default courseApi;