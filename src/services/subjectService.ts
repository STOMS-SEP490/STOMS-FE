import axiosInstance from '@/lib/axios';
import type { SubjectFilterParams } from '@/types/subject';


export const subjectService = {
  filter: async (params?: SubjectFilterParams) => {
    const res = await axiosInstance.get('/api/subjects/filter', {
      params,
    });
    return res.data;
  },

  getById: async (id: number) => {
    const res = await axiosInstance.get(`/api/subjects/${id}`);
    return res.data;
  },
};