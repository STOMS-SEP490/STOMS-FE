import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type { CourseListItem, CourseFilterParams } from '@/modules/course/course';

const courseService = {
  getCourses: async (
    params: CourseFilterParams
  ): Promise<PaginationResponse<CourseListItem>> => {
    return axiosClient.get('/courses/filter', { params });
  },
};

export default courseService;