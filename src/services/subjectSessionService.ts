import axiosInstance from '@/lib/axios';
import type { SubjectSessionFilterParams } from '@/types/subjectSession';



export const subjectSessionService = {
  filter: async (params: SubjectSessionFilterParams) => {
    const res = await axiosInstance.get(
      '/api/subject-sessions/filter',
      { params }
    );
    return res.data;
  },
};