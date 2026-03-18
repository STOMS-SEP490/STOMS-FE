import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type {
  TeachingHistoryItem,
  TeachingScheduleItem,
  TeachingHistoryFilterParams,
  MemberSessionsFilterParams,
  TeachingScheduleFilterParams,
} from '../teachingHistory';

const teachingHistoryApi = {
  /** GET /api/dashboard/users/{memberId}/teaching-history */
  getTeachingHistory: async (
    memberId: number,
    params: TeachingHistoryFilterParams,
  ): Promise<PaginationResponse<TeachingHistoryItem>> => {
    return axiosClient.get(`/dashboard/users/${memberId}/teaching-history`, { params });
  },

  /** GET /api/assignments/members/{memberId}/sessions */
  getSessionsByMember: async (
    memberId: number,
    params: MemberSessionsFilterParams,
  ): Promise<PaginationResponse<TeachingHistoryItem>> => {
    return axiosClient.get(`/assignments/members/${memberId}/sessions`, { params });
  },

  /** GET /api/members/{memberId}/teaching-schedule */
  getTeachingSchedule: async (
    memberId: number,
    params?: TeachingScheduleFilterParams,
  ): Promise<PaginationResponse<TeachingScheduleItem>> => {
    return axiosClient.get(`/members/${memberId}/teaching-schedule`, { params });
  },
};

export default teachingHistoryApi;
