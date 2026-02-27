import axiosClient from '@/lib/axios';
import type { PaginationResponse } from '@/types/api';
import type { SubjectListItem, SubjectFilterParams } from '@/types/subject';

const subjectService = {
  getSubjects: async (
    params: SubjectFilterParams
  ): Promise<PaginationResponse<SubjectListItem>> => {
    return axiosClient.get('/subjects/filter', { params });
  },
};

export default subjectService;