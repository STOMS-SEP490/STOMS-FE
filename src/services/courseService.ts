import axiosClient from '@/lib/axios';
import type { PaginationResponse } from '@/types/api';
import type { CourseListItem, CourseFilterParams } from '@/types/course';

const courseService = {
  getCourses: async (
    params: CourseFilterParams
  ): Promise<PaginationResponse<CourseListItem>> => {
    return axiosClient.get('/courses/filter', { params });
  },
};

export default courseService;