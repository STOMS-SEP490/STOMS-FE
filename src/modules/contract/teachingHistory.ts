// ─── Types for GET /assignments/members/{id}/sessions
// ─── và GET /dashboard/users/{id}/teaching-history
// ─── (BE: DashboardTeachingHistoryItemResponse)

export type TeachingHistoryRequest = {
  requestId: number;
  requestCode: string;
  requestName: string;
};

export type TeachingHistoryContract = {
  contractId: number;
  createdByMemberId: number;
  sessionId: number;
  amount: number | null;
  contractCode: string;
  isPaid: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type TeachingHistoryItem = {
  sessionId: number;
  sessionNo: number;
  sessionTitle: string;
  startAt: string;
  endAt: string;
  location: string;
  isOnline: boolean | null;
  role: string;
  status: string;
  request?: TeachingHistoryRequest | null;
  contract?: TeachingHistoryContract | null;
};

// ─── Types for GET /members/{id}/teaching-schedule
// ─── (BE: MemberTeachingScheduleResponse)

export type ScheduleRequestInfo = {
  requestId: number;
  requestCode: string;
  requestName: string;
  startDate: string;
  note: string;
  status: string;
};

export type ScheduleMemberInfo = {
  memberId: number;
  userId: number;
  email: string;
  teamId: number | null;
  avatarUrl: string;
  fullName: string;
  phone: string;
  staffRole: string;
  teamName: string;
};

export type TeachingScheduleItem = {
  sessionId: number;
  sessionNo: number;
  sessionTitle: string;
  startAt: string;
  endAt: string;
  location: string;
  isOnline: boolean | null;
  notes: string;
  status: string;
  request?: ScheduleRequestInfo | null;
  members?: ScheduleMemberInfo[];
};

// ─── Filter params

export type TeachingHistoryFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  keyword?: string;
  from?: string;
  toExclusive?: string;
  sessionStatus?: string;
  staffRole?: string;
  isOnline?: boolean;
};

export type MemberSessionsFilterParams = {
  hasContract?: boolean;
  pageNumber?: number;
  pageSize?: number;
};

export type TeachingScheduleFilterParams = {
  fromDate?: string;
  toDate?: string;
  keyword?: string;
  status?: string;
  /** Session.status — ví dụ 6 = ASSIGNED (MemberTeachingScheduleRequest.Status). */
  Status?: number | number[];
  pageNumber?: number;
  pageSize?: number;
};

// ─── Helpers

/** Tạo tên hiển thị cho phiên dạy (fallback nếu sessionTitle trống). */
export function sessionDisplayName(item: { sessionTitle?: string; sessionNo?: number }): string {
  const title = (item.sessionTitle ?? '').trim();
  if (title) return title;
  if (item.sessionNo != null) return `Buổi ${item.sessionNo}`;
  return 'Buổi dạy';
}
