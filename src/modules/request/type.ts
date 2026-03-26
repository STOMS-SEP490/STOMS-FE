export type CheckAvailabilityParams = {
  startAt: string;
  endAt: string;
  categoryIds?: number[];
  equipmentName?: string;
  equipmentCode?: string;
  pageNumber?: number;
  pageSize?: number;
};

export type ReservationCreatePayload = {
  sessionIds: number[];
  startAt: string;
  endAt: string;
  equipment: { equipmentId: number }[];
};

export type {
  ReservationEquipmentItem,
  EquipmentReservationItem,
  SessionReservationItem,
  CreatedByUserReservationResponse,
  ReservationResponse,
  ReservationDetail,
  ReservationFilterParams,
  ReservationListItem,
  ReservedEquipmentItem,
} from './reservation.types';

export type SessionDetail = {
  sessionId: number;
  requestId: number;
  sessionNo: number;
  startAt: string;
  endAt: string;
  notes: string;
  status: string;
  location: string;
  isOnline: boolean | null;
  teachersRequired?: number | null;
  tasRequired?: number | null;
  assignments?: {
    assignmentId: number;
    staffRole: string;
    status?: string;
    staffMemberId: number;
    staffMember?: {
      memberId: number;
      fullName: string;
      avatarUrl: string;
      userEmail?: string;
    } | null;
  }[] | null;
  attendances?: {
    attendanceByMemberId?: number | null;
  }[];
};

export type AssignmentDetail = {
  assignmentId: number;
  sessionId: number;
  staffMemberId: number;
  staffRole: string;
  status: string;
  staffMember?: {
    memberId: number;
    fullName: string;
    avatarUrl: string;
    userEmail?: string;
  } | null;
};

export type SuggestedStaffSkill = {
  skillId: number;
  skillName: string;
};

export type SuggestedStaff = {
  memberId: number;
  userId: number;
  fullName: string;
  roleName: string;
  email?: string;
  avatarUrl: string;
  skills?: SuggestedStaffSkill[];
  skillMatchCount: number;
  assignmentCountIn30Days: number;
};

export type MemberDetail = {
  memberId: number;
  teamId?: number | null;
  fullName: string;
  avatarUrl?: string | null;
  phone?: string;
  userEmail?: string;
};

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

export type AttendanceItem = {
  attendanceId: number;
  memberId: number;
  sessionId: number;
  checkinAt?: string | null;
  checkoutAt?: string | null;
  attendanceByMemberId?: number | null;
  note?: string | null;
};

export type AttendanceFilterParams = {
  sessionId?: number;
  attendanceByMemberId?: number;
  memberId?: number;
  pageNumber?: number;
  pageSize?: number;
};

export type AttendanceFilterResponse = {
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  items: AttendanceItem[];
};

export type AttendanceBatchResponse = {
  checkedIn?: unknown[];
  checkedOut?: unknown[];
  skippedMemberIds?: number[];
  notCheckedInMemberIds?: number[];
  message?: string;
};
