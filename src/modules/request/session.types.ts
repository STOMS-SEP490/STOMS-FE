// Session-related types must match BE shape (PascalCase).

export type PagedResponse<T> = {
  PageNumber: number;
  PageSize: number;
  TotalItems: number;
  TotalPages: number;
  Items: T[];

  // camelCase aliases (some environments)
  pageNumber?: number;
  pageSize?: number;
  totalItems?: number;
  totalPages?: number;
  items?: T[];
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
  Assignments?: any[] | null;
  Attendances?: any[] | null;
  Contracts?: any[] | null;
  TaskReports?: any[] | null;
  TeamSessions?: any[] | null;
  EventSessionSkill?: EventSessionSkillResponse[] | null;
  SubjectSkill?: SubjectSkillResponse[] | null;

  // Some environments serialize JSON in camelCase (Swagger / default .NET settings).
  // Keep these optional aliases to avoid losing data without adding mappers in API layer.
  sessionId?: number;
  requestId?: number;
  sessionNo?: number;
  startAt?: string;
  endAt?: string;
  notes?: string;
  status?: string;
  subjectSessionId?: number | null;
  eventSessionId?: number | null;
  teachersRequired?: number | null;
  tasRequired?: number | null;
  location?: string;
  isOnline?: boolean | null;
  borrowingId?: number | null;
  reservationId?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  assignments?: any[] | null;
  attendances?: any[] | null;
  contracts?: any[] | null;
  taskReports?: any[] | null;
  teamSessions?: any[] | null;
  eventSessionSkill?: Array<{ skillId: number; skillName: string; isActive?: boolean }> | null;
  subjectSkill?: Array<{ skillId: number; skillName: string; isActive?: boolean }> | null;
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

  // camelCase aliases for existing call-sites
  sessionId?: number;
  requestId?: number;
  sessionNo?: number;
  statuses?: (string | number)[];
  subjectSessionId?: number;
  eventSessionId?: number;
  location?: string;
  isOnline?: boolean;
  borrowingId?: number;
  reservationId?: number;
  teamId?: number;
  memberId?: number;
  hasContract?: boolean;
  startAt?: string;
  endAt?: string;
  pageNumber?: number;
  pageSize?: number;
};

