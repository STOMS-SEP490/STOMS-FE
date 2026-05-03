import type { RequestListItem, RequestSessionSummary, SessionTopicInfo } from '../request';
import type { SessionResponse } from '../session.types';
import type { SessionWithFlags, SessionAssignmentRow } from '../requestDetail.types';

/**
 * Utility functions để map session data
 * Tách các mapper functions ra khỏi hook
 */

export function mapSessionAssignments(detail: any): SessionAssignmentRow[] {
  const rawAssignments = detail?.Assignments ?? detail?.assignments ?? [];
  return (rawAssignments as any[])
    .filter((a) => a && (a.assignmentId || a.AssignmentId))
    .map((a) => {
      const staff = a.staffMember ?? a.StaffMember ?? null;
      const staffUser = staff?.user ?? staff?.User ?? null;
      return {
        assignmentId: Number(a.assignmentId ?? a.AssignmentId ?? 0),
        staffMemberId: Number(a.staffMemberId ?? a.StaffMemberId ?? 0),
        staffRole: String(a.staffRole ?? a.StaffRole ?? '').toUpperCase(),
        status: String(a.status ?? a.Status ?? ''),
        reason: String(a.reason ?? a.Reason ?? '').trim() || undefined,
        fullName: staff?.fullName || staff?.FullName || '—',
        email: staff?.userEmail || staff?.email || staff?.Email || staffUser?.email || staffUser?.Email || '',
        avatarUrl: staff?.avatarUrl || staff?.AvatarUrl || '',
      } satisfies SessionAssignmentRow;
    });
}

export function mapSessionsWithFlags(detail: RequestListItem) {
  const nextUiAssigned: Record<number, number[]> = {};
  const mappedSessions: SessionWithFlags[] =
    detail.sessions?.map((s) => {
      const anyS = s as RequestSessionSummary & {
        reservationId?: number | null;
        ReservationId?: number | null;
        teamId?: number | null;
        TeamId?: number | null;
        teamSessions?: { teamId?: number | null; TeamId?: number | null }[];
        TeamSessions?: { teamId?: number | null; TeamId?: number | null }[];
        subjectSkill?: any[];
        SubjectSkill?: any[];
        eventSessionSkill?: any[];
        EventSessionSkill?: any[];
      };
      const rawReservationId = anyS.reservationId ?? anyS.ReservationId ?? null;

      const parsed = rawReservationId != null ? Number(rawReservationId) : NaN;
      const reservationId = !Number.isNaN(parsed) && parsed > 0 ? parsed : null;
      const fromSessions = anyS.teamSessions ?? anyS.TeamSessions ?? [];
      const backendTeamIds = fromSessions
        .map((ts) => ts.teamId ?? ts.TeamId)
        .filter((id): id is number => typeof id === 'number' && id > 0);
      const singleTeamId = anyS.teamId ?? anyS.TeamId;
      const initialTeamIds =
        backendTeamIds.length > 0
          ? backendTeamIds
          : typeof singleTeamId === 'number' && singleTeamId > 0
            ? [singleTeamId]
            : [];

      const statusStr = (s.status ?? '').toString().toLowerCase();
      const teamAssigned =
        initialTeamIds.length > 0 ||
        statusStr === 'approved' ||
        statusStr === 'assigned' ||
        statusStr === 'ongoing' ||
        statusStr === 'completed';

      if (initialTeamIds.length > 0) nextUiAssigned[s.sessionId] = initialTeamIds;

      // Collect skills from subjectSkill or eventSessionSkill
      const sessionSkills = collectSessionSkills(anyS as any);

      return {
        ...s,
        reservationId,
        teamAssigned,
        equipmentReserved: reservationId != null,
        sessionSkills,
      };
    }) ?? [];

  return { mappedSessions, nextUiAssigned };
}

function mapTopicFromRef(ref: SessionResponse['SubjectSession']): SessionTopicInfo | null {
  if (!ref) return null;
  const duration = ref.Duration != null && String(ref.Duration).trim() ? String(ref.Duration).trim() : null;
  const title = ref.Title?.trim() ? ref.Title.trim() : null;
  const description = ref.Description?.trim() ? ref.Description.trim() : null;
  if (!title && !description && !duration) return null;
  return { title, description, duration };
}

function collectSessionSkills(raw: SessionResponse): string[] {
  const fromSubject = (raw.SubjectSkill ?? [])
    .filter((s) => s.IsActive !== false)
    .map((s) => String(s.SkillName ?? '').trim())
    .filter(Boolean);
  const fromEvent = (raw.EventSessionSkill ?? [])
    .filter((s) => s.IsActive !== false)
    .map((s) => String(s.SkillName ?? '').trim())
    .filter(Boolean);
  return Array.from(new Set([...fromSubject, ...fromEvent]));
}

export function mapSessionFromFilterItem(raw: SessionResponse): SessionWithFlags {
  const fromSessions = raw.TeamSessions ?? [];
  const backendTeamIds = fromSessions
    .map((ts) => ts.TeamId)
    .filter((id): id is number => typeof id === 'number' && id > 0);
  const rawReservationId = raw.ReservationId ?? null;
  const reservationNum = rawReservationId != null ? Number(rawReservationId) : NaN;
  const reservationId = !Number.isNaN(reservationNum) && reservationNum > 0 ? reservationNum : null;
  const statusText = String(raw.Status ?? '').toLowerCase();
  const teamAssigned =
    backendTeamIds.length > 0 ||
    statusText === 'approved' ||
    statusText === 'assigned' ||
    statusText === 'ongoing' ||
    statusText === 'completed';

  return {
    sessionId: Number(raw.SessionId ?? 0),
    requestId: Number(raw.RequestId ?? 0),
    sessionNo: Number(raw.SessionNo ?? 0),
    startAt: String(raw.StartAt ?? ''),
    endAt: String(raw.EndAt ?? ''),
    location: String(raw.Location ?? ''),
    status: String(raw.Status ?? ''),
    notes: String(raw.Notes ?? ''),
    teachersRequired: raw.TeachersRequired ?? null,
    tasRequired: raw.TasRequired ?? null,
    subjectSession: mapTopicFromRef(raw.SubjectSession ?? null),
    eventSession: mapTopicFromRef(raw.EventSession ?? null),
    sessionSkills: collectSessionSkills(raw),
    reservationId,
    teamAssigned,
    assignedTeamIds: backendTeamIds,
    equipmentReserved: reservationId != null,
  } as SessionWithFlags;
}
