import type { SessionResponse } from './session.types';

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

export type {
  PagedResponse,
  SessionResponse,
  SessionFilterRequest,
  EventSessionSkillResponse,
  SubjectSkillResponse,
} from './session.types';

type SessionAssignmentStaff = {
  memberId: number;
  fullName: string;
  avatarUrl: string;
  userEmail?: string;
};

type SessionAssignment = {
  assignmentId: number;
  sessionId: number;
  staffMemberId: number;
  staffRole: string;
  status: string;
  staffMember?: SessionAssignmentStaff | null;
};

type SessionAttendance = {
  attendanceId?: number;
  memberId?: number;
  attendanceByMemberId?: number | null;
  checkinAt?: string | null;
  checkoutAt?: string | null;
  note?: string | null;
};

export type SessionDetail = Omit<
  SessionResponse,
  'Assignments' | 'Attendances' | 'assignments' | 'attendances'
> & {
  // Canonical camelCase fields that UI currently consumes.
  sessionId: number;
  requestId: number;
  sessionNo: number;
  startAt: string;
  endAt: string;
  status: string;
  location: string;
  notes?: string;
  assignments?: SessionAssignment[] | null;
  attendances?: SessionAttendance[] | null;
  // Keep PascalCase aliases for direct BE responses in some flows.
  Assignments?: SessionAssignment[] | null;
  Attendances?: SessionAttendance[] | null;
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
    email?: string;
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

export type {
  AttendanceBatchItem,
  AttendanceBatchResponse,
  AttendanceCheckInPayload,
  AttendanceCheckOutPayload,
  AttendanceDelegatePayload,
  AttendanceFilterParams,
  AttendanceFilterResponse,
  AttendanceItem,
} from './attendance';
