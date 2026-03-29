export type AttendanceDelegatePayload = {
  sessionId: number;
  delegateToMemberId: number;
};

export type AttendanceBatchItem = {
  memberId: number;
  note?: string | null;
};

export type AttendanceCheckInPayload = {
  sessionId: number;
  items: AttendanceBatchItem[];
};

export type AttendanceCheckOutPayload = {
  sessionId: number;
  items: AttendanceBatchItem[];
};

// DTO shapes match BE response fields (PascalCase) so API can `return axiosClient...` directly.
export type AttendanceItem = {
  AttendanceId: number;
  MemberId: number;
  SessionId: number;
  CheckinAt?: string | null;
  CheckoutAt?: string | null;
  AttendanceByMemberId?: number | null;
  Note?: string | null;
};

export type AttendanceFilterParams = {
  sessionId?: number;
  attendanceByMemberId?: number;
  memberId?: number;
  pageNumber?: number;
  pageSize?: number;
};

export type AttendanceFilterResponse = {
  PageNumber: number;
  PageSize: number;
  TotalItems: number;
  TotalPages: number;
  Items: AttendanceItem[];
};

export type AttendanceBatchResponse = {
  CheckedIn?: unknown[];
  CheckedOut?: unknown[];
  SkippedMemberIds?: number[];
  NotCheckedInMemberIds?: number[];
  Message?: string;
};
