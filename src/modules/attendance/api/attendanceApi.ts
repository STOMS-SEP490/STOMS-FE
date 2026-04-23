import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
import type {
  Attendance,
  AttendanceCheckInBatchResult,
  AttendanceCheckOutBatchResult,
  AttendanceHistoryItem,
} from '../attendance';

const attendanceApi = {
  getBySession: (sessionId: number): Promise<PaginationResponse<Attendance>> =>
    axiosClient.get<PaginationResponse<Attendance>, PaginationResponse<Attendance>>(
      '/attendances/filter',
      {
        params: { SessionId: sessionId, PageNumber: 1, PageSize: 200 },
      },
    ),

  delegateAttendance: (
    sessionId: number,
    delegateToMemberId: number,
    previousAttendanceByMemberId?: number | null,
  ): Promise<void> => {
    const payload = {
      sessionId: sessionId,
      delegateToMemberId: delegateToMemberId,
      previousAttendanceByMemberId: previousAttendanceByMemberId ?? 0,
    };
    console.log('🔥 delegateAttendance payload:', payload);
    return axiosClient.post<void, void>('/attendances/delegations', payload);
  },

  checkInBatch: (
    sessionId: number,
    items: Array<{ MemberId: number; Note?: string | null }>,
  ): Promise<AttendanceCheckInBatchResult> =>
    axiosClient.post<AttendanceCheckInBatchResult, AttendanceCheckInBatchResult>(
      '/attendances/checkin',
      {
        SessionId: sessionId,
        Items: items,
      },
    ),

  checkOutBatch: (
    sessionId: number,
    items: Array<{ MemberId: number; Note?: string | null }>,
  ): Promise<AttendanceCheckOutBatchResult> =>
    axiosClient.post<AttendanceCheckOutBatchResult, AttendanceCheckOutBatchResult>(
      '/attendances/checkout',
      {
        SessionId: sessionId,
        Items: items,
      },
    ),

  getHistoryByMember: (
    memberId: number,
    params: { pageNumber?: number; pageSize?: number } = {},
  ): Promise<PaginationResponse<AttendanceHistoryItem>> =>
    axiosClient.get<
      PaginationResponse<AttendanceHistoryItem>,
      PaginationResponse<AttendanceHistoryItem>
    >(`/dashboard/users/${memberId}/attendance-history`, {
      params: {
        pageNumber: params.pageNumber,
        pageSize: params.pageSize,
      },
    }),
};

export default attendanceApi;
