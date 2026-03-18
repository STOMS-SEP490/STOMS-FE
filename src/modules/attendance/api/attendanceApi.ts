import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';

export type Attendance = {
  attendanceId: number;
  memberId: number;
  sessionId: number;
  checkinAt: string | null;
  checkoutAt: string | null;
  attendanceByMemberId: number | null;
  note: string;
};

export type AttendanceCheckInBatchResult = {
  checkedIn: Attendance[];
  skippedMemberIds: number[];
};

export type AttendanceCheckOutBatchResult = {
  checkedOut: Attendance[];
  notCheckedInMemberIds: number[];
  message: string;
};

export type AttendanceHistoryItem = {
  attendanceId: number;
  checkinAt: string | null;
  checkoutAt: string | null;
  note: string;
  request?: {
    requestId: number;
    requestCode: string;
    requestName: string;
  } | null;
  session: {
    sessionId: number;
    sessionNo: number;
    sessionTitle: string;
    startAt: string;
    endAt: string;
    location: string;
    isOnline: boolean | null;
    status: string;
  };
};

function mapAttendanceFromApi(raw: Record<string, unknown>): Attendance {
  return {
    attendanceId: Number(raw['attendanceId'] ?? raw['AttendanceId'] ?? 0),
    memberId: Number(raw['memberId'] ?? raw['MemberId'] ?? 0),
    sessionId: Number(raw['sessionId'] ?? raw['SessionId'] ?? 0),
    checkinAt: (raw['checkinAt'] ?? raw['CheckinAt'] ?? null) as string | null,
    checkoutAt: (raw['checkoutAt'] ?? raw['CheckoutAt'] ?? null) as string | null,
    attendanceByMemberId:
      (raw['attendanceByMemberId'] ?? raw['AttendanceByMemberId'] ?? null) as number | null,
    note: String(raw['note'] ?? raw['Note'] ?? ''),
  };
}

function mapPagedFromApi<T>(
  raw: Record<string, unknown>,
  mapItem: (x: Record<string, unknown>) => T
): PaginationResponse<T> {
  const items = ((raw['items'] ?? raw['Items']) as unknown[] | undefined) ?? [];
  return {
    pageNumber: Number(raw['pageNumber'] ?? raw['PageNumber'] ?? 1),
    pageSize: Number(raw['pageSize'] ?? raw['PageSize'] ?? 10),
    totalItems: Number(raw['totalItems'] ?? raw['TotalItems'] ?? 0),
    totalPages: Number(raw['totalPages'] ?? raw['TotalPages'] ?? 0),
    items: items.map((x) => mapItem((x ?? {}) as Record<string, unknown>)),
  };
}

export const attendanceApi = {
  /** GET api/attendances/filter?SessionId=... */
  async getBySession(sessionId: number): Promise<PaginationResponse<Attendance>> {
    const res = await axiosClient.get<Record<string, unknown>, Record<string, unknown>>(
      '/attendances/filter',
      {
        params: { SessionId: sessionId, PageNumber: 1, PageSize: 200 },
      }
    );
    return mapPagedFromApi(res ?? {}, mapAttendanceFromApi);
  },

  /** POST /api/attendance/delegations */
  async delegateAttendance(sessionId: number, delegateToMemberId: number): Promise<void> {
    await axiosClient.post('/attendance/delegations', {
      SessionId: sessionId,
      DelegateToMemberId: delegateToMemberId,
    });
  },

  /** POST /api/attendance/checkin */
  async checkInBatch(
    sessionId: number,
    items: { memberId: number; note?: string | null }[]
  ): Promise<AttendanceCheckInBatchResult> {
    const body = {
      SessionId: sessionId,
      Items: items.map((x) => ({
        MemberId: x.memberId,
        Note: x.note ?? null,
      })),
    };
    const res = await axiosClient.post<Record<string, unknown>, Record<string, unknown>>(
      '/attendance/checkin',
      body
    );
    const raw = (res ?? {}) as Record<string, unknown>;
    const checkedInRaw =
      ((raw['checkedIn'] ?? raw['CheckedIn']) as unknown[] | undefined) ?? [];
    const skippedRaw =
      ((raw['skippedMemberIds'] ?? raw['SkippedMemberIds']) as unknown[] | undefined) ?? [];
    return {
      checkedIn: checkedInRaw.map((x) => mapAttendanceFromApi((x ?? {}) as Record<string, unknown>)),
      skippedMemberIds: skippedRaw.map((x) => Number(x)),
    };
  },

  /** POST /api/attendance/checkout */
  async checkOutBatch(
    sessionId: number,
    items: { memberId: number; note?: string | null }[]
  ): Promise<AttendanceCheckOutBatchResult> {
    const body = {
      SessionId: sessionId,
      Items: items.map((x) => ({
        MemberId: x.memberId,
        Note: x.note ?? null,
      })),
    };
    const res = await axiosClient.post<Record<string, unknown>, Record<string, unknown>>(
      '/attendance/checkout',
      body
    );
    const raw = (res ?? {}) as Record<string, unknown>;
    const checkedOutRaw =
      ((raw['checkedOut'] ?? raw['CheckedOut']) as unknown[] | undefined) ?? [];
    const notCheckedRaw =
      ((raw['notCheckedInMemberIds'] ?? raw['NotCheckedInMemberIds']) as unknown[] | undefined) ??
      [];
    const message = String(raw['message'] ?? raw['Message'] ?? '');
    return {
      checkedOut: checkedOutRaw.map((x) =>
        mapAttendanceFromApi((x ?? {}) as Record<string, unknown>)
      ),
      notCheckedInMemberIds: notCheckedRaw.map((x) => Number(x)),
      message,
    };
  },

  /** GET /api/dashboard/users/{memberId}/attendance-history */
  async getHistoryByMember(
    memberId: number,
    params: { pageNumber?: number; pageSize?: number } = {},
  ): Promise<PaginationResponse<AttendanceHistoryItem>> {
    const res = await axiosClient.get<Record<string, unknown>, Record<string, unknown>>(
      `/dashboard/users/${memberId}/attendance-history`,
      {
        params: {
          pageNumber: params.pageNumber,
          pageSize: params.pageSize,
        },
      },
    );
    const raw = (res ?? {}) as Record<string, unknown>;
    return mapPagedFromApi(raw, (x) => {
      const sessionRaw = (x['session'] ?? x['Session'] ?? {}) as Record<string, unknown>;
      const requestRaw = (x['request'] ?? x['Request'] ?? null) as
        | Record<string, unknown>
        | null;
      return {
        attendanceId: Number(x['attendanceId'] ?? x['AttendanceId'] ?? 0),
        checkinAt: (x['checkinAt'] ?? x['CheckinAt'] ?? null) as string | null,
        checkoutAt: (x['checkoutAt'] ?? x['CheckoutAt'] ?? null) as string | null,
        note: String(x['note'] ?? x['Note'] ?? ''),
        request: requestRaw
          ? {
              requestId: Number(requestRaw['requestId'] ?? requestRaw['RequestId'] ?? 0),
              requestCode: String(
                requestRaw['requestCode'] ?? requestRaw['RequestCode'] ?? '',
              ),
              requestName: String(
                requestRaw['requestName'] ?? requestRaw['RequestName'] ?? '',
              ),
            }
          : null,
        session: {
          sessionId: Number(sessionRaw['sessionId'] ?? sessionRaw['SessionId'] ?? 0),
          sessionNo: Number(sessionRaw['sessionNo'] ?? sessionRaw['SessionNo'] ?? 0),
          sessionTitle: String(sessionRaw['sessionTitle'] ?? sessionRaw['SessionTitle'] ?? ''),
          startAt: String(sessionRaw['startAt'] ?? sessionRaw['StartAt'] ?? ''),
          endAt: String(sessionRaw['endAt'] ?? sessionRaw['EndAt'] ?? ''),
          location: String(sessionRaw['location'] ?? sessionRaw['Location'] ?? ''),
          isOnline:
            (sessionRaw['isOnline'] ?? sessionRaw['IsOnline'] ?? null) === null
              ? null
              : Boolean(sessionRaw['isOnline'] ?? sessionRaw['IsOnline']),
          status: String(sessionRaw['status'] ?? sessionRaw['Status'] ?? ''),
        },
      };
    });
  },
};

