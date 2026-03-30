/**
 * DTO shapes cho JSON response — mặc định BE ASP.NET thường serialize camelCase.
 * (Query/body gửi đi có thể vẫn dùng PascalCase tùy endpoint; khai báo trong `attendanceApi`.)
 */

export type AttendanceMemberEmbed = {
  fullName?: string | null;
  avatarUrl?: string | null;
  email?: string | null;
};

export type Attendance = {
  attendanceId: number;
  memberId: number;
  sessionId: number;
  checkinAt?: string | null;
  checkoutAt?: string | null;
  attendanceByMemberId?: number | null;
  note?: string | null;
  member?: AttendanceMemberEmbed | null;
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

export type AttendanceHistoryRequest = {
  requestId: number;
  requestCode: string;
  requestName: string;
};

export type AttendanceHistorySession = {
  sessionId: number;
  sessionNo: number;
  sessionTitle: string;
  startAt: string;
  endAt: string;
  location: string;
  isOnline: boolean | null;
  status: string;
};

export type AttendanceHistoryItem = {
  attendanceId: number;
  checkinAt: string | null;
  checkoutAt: string | null;
  note: string;
  request?: AttendanceHistoryRequest | null;
  session: AttendanceHistorySession;
};
