import axiosClient from '@/shared/lib/axios';

import type {
  AttendanceBatchResponse,
  AttendanceCheckInPayload,
  AttendanceCheckOutPayload,
  AttendanceDelegatePayload,
  AttendanceFilterParams,
  AttendanceFilterResponse,
  AttendanceItem,
} from './type';

const mapAttendanceItem = (raw: Record<string, unknown>): AttendanceItem => ({
  attendanceId: Number(raw['attendanceId'] ?? raw['AttendanceId'] ?? 0),
  memberId: Number(raw['memberId'] ?? raw['MemberId'] ?? 0),
  sessionId: Number(raw['sessionId'] ?? raw['SessionId'] ?? 0),
  checkinAt: (raw['checkinAt'] ?? raw['CheckinAt']) != null ? String(raw['checkinAt'] ?? raw['CheckinAt']) : null,
  checkoutAt: (raw['checkoutAt'] ?? raw['CheckoutAt']) != null ? String(raw['checkoutAt'] ?? raw['CheckoutAt']) : null,
  attendanceByMemberId: Number(raw['attendanceByMemberId'] ?? raw['AttendanceByMemberId'] ?? 0) || null,
  note: raw['note'] != null ? String(raw['note']) : raw['Note'] != null ? String(raw['Note']) : null,
});

const attendanceApi = {
  delegate: async (payload: AttendanceDelegatePayload): Promise<void> => {
    await axiosClient.post('/attendance/delegations', payload);
  },
  checkIn: async (payload: AttendanceCheckInPayload): Promise<AttendanceBatchResponse> => {
    return axiosClient.post('/attendance/checkin', payload);
  },
  checkOut: async (payload: AttendanceCheckOutPayload): Promise<AttendanceBatchResponse> => {
    return axiosClient.post('/attendance/checkout', payload);
  },
  getFilter: async (params: AttendanceFilterParams): Promise<AttendanceFilterResponse> => {
    const res = await axiosClient.get('/attendances/filter', { params });
    const raw = (res as unknown as Record<string, unknown>) ?? {};
    const itemsRaw = (raw['items'] ?? raw['Items'] ?? []) as Record<string, unknown>[];
    return {
      pageNumber: Number(raw['pageNumber'] ?? raw['PageNumber'] ?? 1),
      pageSize: Number(raw['pageSize'] ?? raw['PageSize'] ?? itemsRaw.length),
      totalItems: Number(raw['totalItems'] ?? raw['TotalItems'] ?? itemsRaw.length),
      totalPages: Number(raw['totalPages'] ?? raw['TotalPages'] ?? 1),
      items: itemsRaw.map(mapAttendanceItem),
    };
  },
};

export default attendanceApi;
