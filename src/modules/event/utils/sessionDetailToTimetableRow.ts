import type { TeamLeaderTimetableAssignmentRow } from '@/modules/contract/hooks/useTeamLeaderTimetableAssignments';
import type { SessionDetail } from '@/modules/request/type';
import { getAttendanceOwnerId } from '@/shared/utils/attendanceOwner';

/** Map session từ API (chi tiết phiên) sang dòng dùng cho panel điểm danh. */
export function sessionDetailToTimetableRow(session: SessionDetail): TeamLeaderTimetableAssignmentRow {
  return {
    sessionId: session.SessionId,
    sessionNo: session.SessionNo,
    requestId: session.RequestId,
    startAt: session.StartAt,
    endAt: session.EndAt,
    location: session.Location,
    status: session.Status,
    attendanceByMemberId: getAttendanceOwnerId(session.Attendances ?? null),
  };
}
