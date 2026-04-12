import type {
  AssignmentResponse,
  PagedResponse,
  SessionResponse,
  SessionStaffMemberResponse,
  TeamSessionResponse,
} from '../session.types';

const pick = <T>(obj: Record<string, unknown>, pascal: string, camel: string): T | undefined =>
  (obj[pascal] as T | undefined) ?? (obj[camel] as T | undefined);

function pickPositiveId(raw: unknown): number {
  if (raw == null || raw === '') return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function normalizeStaffMember(raw: unknown): SessionStaffMemberResponse | null | undefined {
  if (raw == null) return null;
  const s = raw as Record<string, unknown>;
  const teamIdNum = pickPositiveId(pick(s, 'TeamId', 'teamId'));
  return {
    MemberId: Number(pick(s, 'MemberId', 'memberId') ?? 0),
    TeamId: teamIdNum > 0 ? teamIdNum : null,
    FullName: (pick(s, 'FullName', 'fullName') as string | null | undefined) ?? null,
    AvatarUrl: (pick(s, 'AvatarUrl', 'avatarUrl') as string | null | undefined) ?? null,
    Email: (pick(s, 'Email', 'email') as string | null | undefined) ?? null,
    User: (pick(s, 'User', 'user') as SessionStaffMemberResponse['User']) ?? null,
  };
}

function normalizeAssignment(raw: unknown): AssignmentResponse {
  const a = raw as Record<string, unknown>;
  const assignTeamNum = pickPositiveId(pick(a, 'TeamId', 'teamId'));
  return {
    AssignmentId: Number(pick(a, 'AssignmentId', 'assignmentId') ?? 0),
    SessionId: Number(pick(a, 'SessionId', 'sessionId') ?? 0),
    TeamId: assignTeamNum > 0 ? assignTeamNum : null,
    StaffMemberId: Number(pick(a, 'StaffMemberId', 'staffMemberId') ?? 0),
    StaffRole: String(pick(a, 'StaffRole', 'staffRole') ?? ''),
    Status: String(pick(a, 'Status', 'status') ?? ''),
    AssignedByMemberId: Number(pick(a, 'AssignedByMemberId', 'assignedByMemberId') ?? 0),
    AssignedAt: (pick(a, 'AssignedAt', 'assignedAt') as string | null | undefined) ?? null,
    Reason: (pick(a, 'Reason', 'reason') as string | null | undefined) ?? null,
    ApprovedAt: (pick(a, 'ApprovedAt', 'approvedAt') as string | null | undefined) ?? null,
    ApprovedByMemberId:
      (pick(a, 'ApprovedByMemberId', 'approvedByMemberId') as number | null | undefined) ?? null,
    StaffMember: normalizeStaffMember(pick(a, 'StaffMember', 'staffMember')) ?? null,
  };
}

function normalizeTeamSession(raw: unknown): TeamSessionResponse {
  const ts = raw as Record<string, unknown>;
  const teamObj = pick(ts, 'Team', 'team') as Record<string, unknown> | null | undefined;
  const teamIdTop = pick(ts, 'TeamId', 'teamId') as number | undefined;
  const teamIdNested =
    teamObj && typeof teamObj === 'object'
      ? (pick(teamObj, 'TeamId', 'teamId') as number | undefined)
      : undefined;
  const teamNameTop = (pick(ts, 'TeamName', 'teamName') as string | null | undefined) ?? null;
  const teamNameNested =
    teamObj && typeof teamObj === 'object'
      ? ((pick(teamObj, 'TeamName', 'teamName') as string | null | undefined) ?? null)
      : null;
  return {
    TeamId: teamIdTop ?? teamIdNested,
    TeamName: teamNameTop || teamNameNested || null,
    TeachersRequired: pick(ts, 'TeachersRequired', 'teachersRequired') as number | null | undefined,
    TasRequired: pick(ts, 'TasRequired', 'tasRequired') as number | null | undefined,
  };
}

function normalizeSessionTopicRef(raw: unknown): SessionResponse['SubjectSession'] {
  if (raw == null || typeof raw !== 'object') return null;
  const t = raw as Record<string, unknown>;
  return {
    SubjectSessionId:
      (pick(t, 'SubjectSessionId', 'subjectSessionId') as number | null | undefined) ?? null,
    EventSessionId:
      (pick(t, 'EventSessionId', 'eventSessionId') as number | null | undefined) ?? null,
    Title: (pick(t, 'Title', 'title') as string | null | undefined) ?? null,
    Description: (pick(t, 'Description', 'description') as string | null | undefined) ?? null,
    Duration: (pick(t, 'Duration', 'duration') as string | null | undefined) ?? null,
  };
}

function normalizeRequestLite(raw: unknown): SessionResponse['Request'] {
  if (raw == null || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  return {
    RequestName: (pick(r, 'RequestName', 'requestName') as string | null | undefined) ?? null,
    RequestCode: (pick(r, 'RequestCode', 'requestCode') as string | null | undefined) ?? null,
  };
}

export function normalizeSessionResponse(raw: SessionResponse | Record<string, unknown>): SessionResponse {
  const r = raw as Record<string, unknown>;
  const assignmentsRaw = (pick(r, 'Assignments', 'assignments') as unknown[] | null | undefined) ?? [];
  const teamSessionsRaw = (pick(r, 'TeamSessions', 'teamSessions') as unknown[] | null | undefined) ?? [];

  return {
    SessionId: Number(pick(r, 'SessionId', 'sessionId') ?? 0),
    RequestId: Number(pick(r, 'RequestId', 'requestId') ?? 0),
    SessionNo: Number(pick(r, 'SessionNo', 'sessionNo') ?? 0),
    StartAt: String(pick(r, 'StartAt', 'startAt') ?? ''),
    EndAt: String(pick(r, 'EndAt', 'endAt') ?? ''),
    Notes: String(pick(r, 'Notes', 'notes') ?? ''),
    Status: String(pick(r, 'Status', 'status') ?? ''),
    SubjectSessionId: (pick(r, 'SubjectSessionId', 'subjectSessionId') as number | null | undefined) ?? null,
    EventSessionId: (pick(r, 'EventSessionId', 'eventSessionId') as number | null | undefined) ?? null,
    TeachersRequired: pick(r, 'TeachersRequired', 'teachersRequired') as number | null | undefined,
    TasRequired: pick(r, 'TasRequired', 'tasRequired') as number | null | undefined,
    Location: String(pick(r, 'Location', 'location') ?? ''),
    IsOnline: (pick(r, 'IsOnline', 'isOnline') as boolean | null | undefined) ?? null,
    BorrowingId: (pick(r, 'BorrowingId', 'borrowingId') as number | null | undefined) ?? null,
    ReservationId: (pick(r, 'ReservationId', 'reservationId') as number | null | undefined) ?? null,
    CreatedAt: (pick(r, 'CreatedAt', 'createdAt') as string | null | undefined) ?? null,
    UpdatedAt: (pick(r, 'UpdatedAt', 'updatedAt') as string | null | undefined) ?? null,
    Assignments: assignmentsRaw.map(normalizeAssignment),
    Attendances: (pick(r, 'Attendances', 'attendances') as SessionResponse['Attendances']) ?? null,
    Contracts: (pick(r, 'Contracts', 'contracts') as SessionResponse['Contracts']) ?? null,
    TaskReports: (pick(r, 'TaskReports', 'taskReports') as SessionResponse['TaskReports']) ?? null,
    TeamSessions: teamSessionsRaw.map(normalizeTeamSession),
    SubjectSession: normalizeSessionTopicRef(pick(r, 'SubjectSession', 'subjectSession')),
    EventSession: normalizeSessionTopicRef(pick(r, 'EventSession', 'eventSession')),
    Request: normalizeRequestLite(pick(r, 'Request', 'request')),
    EventSessionSkill: (pick(r, 'EventSessionSkill', 'eventSessionSkill') as SessionResponse['EventSessionSkill']) ?? null,
    SubjectSkill: (pick(r, 'SubjectSkill', 'subjectSkill') as SessionResponse['SubjectSkill']) ?? null,
  };
}

export function normalizeSessionPagedResponse(
  raw: PagedResponse<SessionResponse> | Record<string, unknown>,
): PagedResponse<SessionResponse> {
  const r = raw as Record<string, unknown>;
  const itemsRaw =
    (pick(r, 'Items', 'items') as unknown[] | null | undefined) ??
    (r.Items as unknown[]) ??
    (r.items as unknown[]) ??
    [];
  return {
    PageNumber: Number(pick(r, 'PageNumber', 'pageNumber') ?? 0),
    PageSize: Number(pick(r, 'PageSize', 'pageSize') ?? 0),
    TotalItems: Number(pick(r, 'TotalItems', 'totalItems') ?? 0),
    TotalPages: Number(pick(r, 'TotalPages', 'totalPages') ?? 0),
    Items: itemsRaw.map((item) => normalizeSessionResponse(item as SessionResponse)),
  };
}
