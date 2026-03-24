import type { SessionDetail } from '@/modules/request/api/type';

export type TeamLeaderAssignmentsTab = 'assigning' | 'rejected';

export type RoleKey = 'TE' | 'TA';

export type AssignMemberPayload = {
  assignmentId: number;
  staffMemberId: number;
};

export type SessionMap = Record<number, SessionDetail>;

export type TeamSessionLite = {
  sessionId: number;
  requestId: number;
  sessionNo: number;
  startAt: string;
  endAt: string;
  location: string;
  status: string;
};

export type TeamRequestItem = {
  requestId: number;
  requestCode: string;
  requestName: string;
  customerName?: string | null;
  subjectId?: number | null;
  courseId?: number | null;
  eventId?: number | null;
  status: string;
  startDate?: string;
  sessions: TeamSessionLite[];
};
