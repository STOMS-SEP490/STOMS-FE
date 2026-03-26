export type CheckAvailabilityParams = {
  startAt: string;
  endAt: string;
  search?: string;
  pageNumber?: number;
  pageSize?: number;
};

export type ReservationCreatePayload = {
  createdByMemberId: number;
  sessionIds?: number[];
  sessionId?: number | null;
  startAt: string;
  endAt: string;
  equipment: { equipmentId: number }[];
};

export type ReservedEquipmentItem = {
  equipmentId: number;
  equipmentName: string;
  equipmentCode: string;
  categoryName: string;
  categoryId?: number;
  status: string;
  imgLink: string | null;
};

export type ReservationCreatedByUser = {
  memberId?: number;
  userId?: number;
  avatarUrl?: string;
  fullName: string;
  phone?: string;
};

export type ReservationSessionItem = {
  sessionId: number;
  sessionNo: number;
  startAt: string;
  endAt: string;
  notes: string;
  status: string;
  location: string;
  isOnline: boolean | null;
};

export type ReservationEquipmentReservationItem = {
  equipmentId: number;
  isTemporarilyCancelled?: boolean | null;
  createdAt?: string | null;
  equipment: ReservedEquipmentItem | null;
};

export type ReservationDetail = {
  reservationId: number;
  createdByMemberId?: number | null;
  startAt: string | null;
  endAt: string | null;
  createdAt?: string | null;
  createdByUser?: ReservationCreatedByUser | null;
  isTemporarilyCancelled?: boolean | null;
  /** Convenience flat list used by older screens (e.g. RequestSessionDetailPanel) */
  equipment: ReservedEquipmentItem[];
  equipmentReservations: ReservationEquipmentReservationItem[];
  sessions: ReservationSessionItem[];
};

export type ReservationFilterParams = {
  reservationId?: number;
  isTemporarilyCancelled?: boolean;
  createdByMemberId?: number;
  startAt?: string;
  endAt?: string;
  pageNumber?: number;
  pageSize?: number;
};

export type ReservationListItem = {
  reservationId: number;
  startAt: string | null;
  endAt: string | null;
  equipmentCount: number;
  isTemporarilyCancelled?: boolean | null;
  createdByUser?: ReservationCreatedByUser | null;
};

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
  // Một số API session có thể trả danh sách attendances kèm attendanceByMemberId.
  // Dùng để lấy đúng "người điểm danh" chung cho session (không lấy từ JWT).
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
