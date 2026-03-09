import axiosInstance from '@/shared/lib/axios';
import type { SubjectSessionFilterParams } from '@/shared/types/subjectSession';



export const subjectSessionService = {
  filter: async (params: SubjectSessionFilterParams) => {
    const res = await axiosInstance.get(
      '/api/subject-sessions/filter',
      { params }
    );
    return res.data;
  },
};