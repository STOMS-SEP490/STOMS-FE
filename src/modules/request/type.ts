export type {
  CheckAvailabilityRequest,
  ReservationCreateRequest,
  ReservationUpdateRequest,
  ReservationResponse,
  ReservationDetail,
  ReservationFilterRequest,
  ReservationListItem,
  CreateByUserReservationResponse,
  EquipmentItemResponse,
  EquipmentReservationItemResponse,
  SessionReservationResponse,
  EquipmentResponse,
  PagedReservationResponse,
  PagedEquipmentResponse,
} from '../reservation/reservation.types';

export type {
  AssignmentResponse,
  AttendanceResponse,
  PagedResponse,
  SessionDetail,
  SessionResponse,
  SessionFilterRequest,
  SessionStaffMemberResponse,
  EventSessionSkillResponse,
  SubjectSkillResponse,
  TeamSessionResponse,
} from './session.types';

export type AssignmentDetail = {
  assignmentId: number;
  sessionId: number;
  staffMemberId: number;
  staffRole: string;
  status: string;
  reason?: string | null;
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
