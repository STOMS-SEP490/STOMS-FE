import axiosClient from '@/shared/lib/axios';

import type {
  AttendanceBatchResponse,
  AttendanceCheckInPayload,
  AttendanceCheckOutPayload,
  AttendanceDelegatePayload,
  AttendanceFilterParams,
  AttendanceFilterResponse,
} from '../attendance';

const attendanceApi = {
  delegate: (payload: AttendanceDelegatePayload): Promise<void> => {
    return axiosClient.post<void, void>('/attendance/delegations', {
      SessionId: payload.sessionId,
      DelegateToMemberId: payload.delegateToMemberId,
    });
  },
  checkIn: (payload: AttendanceCheckInPayload): Promise<AttendanceBatchResponse> => {
    return axiosClient.post<AttendanceBatchResponse, AttendanceBatchResponse>('/attendance/checkin', {
      SessionId: payload.sessionId,
      Items: payload.items.map((x) => ({
        MemberId: x.memberId,
        Note: x.note ?? null,
      })),
    });
  },
  checkOut: (payload: AttendanceCheckOutPayload): Promise<AttendanceBatchResponse> => {
    return axiosClient.post<AttendanceBatchResponse, AttendanceBatchResponse>('/attendance/checkout', {
      SessionId: payload.sessionId,
      Items: payload.items.map((x) => ({
        MemberId: x.memberId,
        Note: x.note ?? null,
      })),
    });
  },
  getFilter: (params: AttendanceFilterParams = {}): Promise<AttendanceFilterResponse> => {
    return axiosClient.get<AttendanceFilterResponse, AttendanceFilterResponse>('/attendances/filter', {
      params: {
        SessionId: params.sessionId,
        AttendanceByMemberId: params.attendanceByMemberId,
        MemberId: params.memberId,
        PageNumber: params.pageNumber,
        PageSize: params.pageSize,
      },
    });
  },
};

export default attendanceApi;
