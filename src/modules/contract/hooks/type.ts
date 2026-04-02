import type { SessionTopicInfo } from '@/modules/request/request';
import type { SessionDetail } from '@/modules/request/type';

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
  /** Đồng bộ hiển thị tiêu đề phiên với màn chi tiết / duyệt manager. */
  subjectSession?: SessionTopicInfo | null;
  eventSession?: SessionTopicInfo | null;
  notes?: string | null;
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
  /** Lý do / ghi chú từ API request (vd. từ chối phân công). */
  reason?: string | null;
  startDate?: string;
  sessions: TeamSessionLite[];
};
