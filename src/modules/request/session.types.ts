// Session-related types — match BE (PascalCase).

export type PagedResponse<T> = {
  PageNumber: number;
  PageSize: number;
  TotalItems: number;
  TotalPages: number;
  Items: T[];
};

export type EventSessionSkillResponse = {
  EventSessionId: number;
  SkillId: number;
  SkillName: string;
  IsActive: boolean;
  CreatedAt?: string | null;
};

export type SubjectSkillResponse = {
  SubjectId: number;
  SkillId: number;
  SkillName: string;
  IsActive: boolean;
  CreatedAt?: string | null;
};

/** StaffMember nested trong Assignment (BE MemberResponse rút gọn cho session detail). */
export type SessionStaffMemberResponse = {
  MemberId: number;
  FullName?: string | null;
  AvatarUrl?: string | null;
  Email?: string | null;
  User?: { Email?: string | null } | null;
};

export type AssignmentResponse = {
  AssignmentId: number;
  SessionId: number;
  StaffMemberId: number;
  StaffRole: string;
  Status: string;
  AssignedByMemberId: number;
  AssignedAt?: string | null;
  Reason?: string | null;
  ApprovedAt?: string | null;
  ApprovedByMemberId?: number | null;
  StaffMember?: SessionStaffMemberResponse | null;
};

export type AttendanceResponse = {
  AttendanceId: number;
  MemberId: number;
  SessionId: number;
  CheckinAt?: string | null;
  CheckoutAt?: string | null;
  AttendanceByMemberId?: number | null;
  Note?: string | null;
};

export type TeamSessionResponse = {
  TeamId?: number;
  TeamName?: string | null;
  TeachersRequired?: number | null;
  TasRequired?: number | null;
};

export type SessionTopicRef = {
  SubjectSessionId?: number | null;
  EventSessionId?: number | null;
  Title?: string | null;
  Description?: string | null;
  /** Thời lượng buổi (vd. "02:00:00") — BE có thể trả kèm subjectSession/eventSession */
  Duration?: string | null;
};

export type SessionResponse = {
  SessionId: number;
  RequestId: number;
  SessionNo: number;
  StartAt: string;
  EndAt: string;
  Notes: string;
  Status: string;
  SubjectSessionId?: number | null;
  EventSessionId?: number | null;
  TeachersRequired?: number | null;
  TasRequired?: number | null;
  Location: string;
  IsOnline?: boolean | null;
  BorrowingId?: number | null;
  ReservationId?: number | null;
  CreatedAt?: string | null;
  UpdatedAt?: string | null;
  Assignments?: AssignmentResponse[] | null;
  Attendances?: AttendanceResponse[] | null;
  Contracts?: unknown[] | null;
  TaskReports?: unknown[] | null;
  TeamSessions?: TeamSessionResponse[] | null;
  SubjectSession?: SessionTopicRef | null;
  EventSession?: SessionTopicRef | null;
  /** BE session/filter có thể kèm Request rút gọn (RequestName / RequestCode). */
  Request?: { RequestName?: string | null; RequestCode?: string | null } | null;
  EventSessionSkill?: EventSessionSkillResponse[] | null;
  SubjectSkill?: SubjectSkillResponse[] | null;
};

export type SessionFilterRequest = {
  SessionId?: number;
  RequestId?: number;
  SessionNo?: number;
  Statuses?: (string | number)[];
  SubjectSessionId?: number;
  EventSessionId?: number;
  Location?: string;
  IsOnline?: boolean;
  BorrowingId?: number;
  ReservationId?: number;
  TeamId?: number;
  MemberId?: number;
  HasContract?: boolean;
  StartAt?: string;
  EndAt?: string;
  PageNumber?: number;
  PageSize?: number;
};

/** Alias thống nhất cho UI/hook: cùng shape BE. */
export type SessionDetail = SessionResponse;
