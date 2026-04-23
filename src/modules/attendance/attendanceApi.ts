// DEPRECATED: File này đã cũ, đang dùng file mới ở /api/attendanceApi.ts
// TODO: Migrate tất cả code sang file mới rồi xóa file này

import axiosClient from '@/shared/lib/axios';

import type {
  AttendanceBatchResponse,
  AttendanceCheckInPayload,
  AttendanceCheckOutPayload,
  AttendanceDelegatePayload,
  AttendanceFilterParams,
  AttendanceFilterResponse,
} from '@/modules/request/attendance';
import type { AttendanceResponse } from '@/modules/request/session.types';

const attendanceApi = {
  delegate: (payload: AttendanceDelegatePayload): Promise<void> => {
    return axiosClient.post<void, void>('/attendances/delegations', {
      sessionId: payload.sessionId,
      delegateToMemberId: payload.delegateToMemberId,
      previousAttendanceByMemberId: payload.previousAttendanceByMemberId ?? 0,
    });
  },
  checkIn: (payload: AttendanceCheckInPayload): Promise<AttendanceBatchResponse> => {
    return axiosClient.post<AttendanceBatchResponse, AttendanceBatchResponse>('/attendances/checkin', {
      SessionId: payload.sessionId,
      Items: payload.items.map((x) => ({
        MemberId: x.memberId,
        Note: x.note ?? null,
      })),
    });
  },
  checkInWithImages: (form: FormData): Promise<AttendanceBatchResponse> => {
    return axiosClient.post<AttendanceBatchResponse, AttendanceBatchResponse>('/attendances/checkin', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  checkOut: (payload: AttendanceCheckOutPayload): Promise<AttendanceBatchResponse> => {
    return axiosClient.post<AttendanceBatchResponse, AttendanceBatchResponse>('/attendances/checkout', {
      SessionId: payload.sessionId,
      Items: payload.items.map((x) => ({
        MemberId: x.memberId,
        Note: x.note ?? null,
      })),
    });
  },
  checkOutWithImages: (form: FormData): Promise<AttendanceBatchResponse> => {
    return axiosClient.post<AttendanceBatchResponse, AttendanceBatchResponse>('/attendances/checkout', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  reset: (attendanceId: number, payload: { isCheckIn: boolean; note?: string | null }): Promise<AttendanceResponse> => {
    return axiosClient.post<AttendanceResponse, AttendanceResponse>(`/attendances/${attendanceId}/reset`, {
      IsCheckIn: payload.isCheckIn,
      Note: payload.note ?? null,
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
