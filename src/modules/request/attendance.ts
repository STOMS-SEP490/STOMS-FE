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
  // BE hiện đang trả camelCase ở API filter, nhưng một số chỗ FE cũ đang dùng PascalCase.
  // Giữ cả 2 để tương thích dần.
  AttendanceId?: number;
  attendanceId?: number;

  MemberId?: number;
  memberId?: number;

  SessionId?: number;
  sessionId?: number;

  CheckinAt?: string | null;
  checkinAt?: string | null;

  CheckoutAt?: string | null;
  checkoutAt?: string | null;

  AttendanceByMemberId?: number | null;
  attendanceByMemberId?: number | null;

  Note?: string | null;
  note?: string | null;

  /** URL ảnh minh chứng check-in */
  ImgUrl?: string | null;
  imgcheckin?: string | null;
  imgCheckin?: string | null;
  imgCheckIn?: string | null;
  ImgCheckin?: string | null;
  ImgCheckIn?: string | null;
  /** URL ảnh minh chứng check-out */
  imgcheckout?: string | null;
  imgCheckout?: string | null;
  imgCheckOut?: string | null;
  ImgCheckout?: string | null;
  ImgCheckOut?: string | null;
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
