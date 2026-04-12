import { useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { getAssignmentStaffRoleAccent, getAssignmentStatusInfo } from '@/constants/status';
import { teamApi } from '@/modules/team/api/teamApi';
import type { Team } from '@/modules/team/team';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { cn } from '@/shared/lib/utils';
import type { RequestSessionSummary } from '../request';
import type { AssignmentResponse, TeamSessionResponse } from '../session.types';

type SessionWithOptional = RequestSessionSummary & {
  teamAssigned?: boolean;
  teachersRequired?: number | null;
  tasRequired?: number | null;
};

type TeamRow = Team & {
  embedTeachers?: number | null;
  embedTas?: number | null;
};

type Props = {
  session: SessionWithOptional;
  assignedTeamIds: number[];
  /** Từ GET /sessions/:id — nếu có thì không gọi GET /teams/:id */
  sessionTeamsEmbedded?: TeamSessionResponse[];
  /** Assignments kèm StaffMember từ GET /sessions/:id (đã normalize) */
  sessionAssignments?: AssignmentResponse[];
  /** Đang tải chi tiết phiên (GET /sessions/:id) */
  sessionDetailLoading?: boolean;
};

function assignmentRoleOrder(role: string): number {
  const r = role.toLowerCase().trim();
  if (r === 'teacher') return 0;
  if (r === 'ta') return 1;
  return 2;
}

function isTeacherAssignmentRole(role: string): boolean {
  return assignmentRoleOrder(role) === 0;
}

function SessionAssignmentRow({ assignment: a }: { assignment: AssignmentResponse }) {
  const sm = a.StaffMember;
  const name = (sm?.FullName && String(sm.FullName).trim()) || '—';
  const avatarUrl = sm?.AvatarUrl && String(sm.AvatarUrl).trim() ? sm.AvatarUrl : null;
  const statusInfo = getAssignmentStatusInfo(a.Status);
  const accent = getAssignmentStaffRoleAccent(isTeacherAssignmentRole(a.StaffRole));
  const reason = (a.Reason && String(a.Reason).trim()) || '';

  return (
    <li className={cn('flex gap-3 rounded-xl py-2.5 pr-3 pl-2.5', accent.stripe)}>
      <Avatar className="h-11 w-11 shrink-0">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
        <AvatarFallback className={cn('text-xs font-semibold', accent.avatar)}>
          {initialsFromName(name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 gap-y-1">
          <p className="font-semibold text-sm text-gray-900 truncate">{name}</p>
          <span
            className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold shrink-0 ${statusInfo.className}`}
          >
            {statusInfo.label}
          </span>
        </div>
        {sm?.Email ? (
          <p className="text-[11px] text-slate-500 truncate mt-0.5">{sm.Email}</p>
        ) : null}
        {reason ? (
          <p className="text-[11px] text-rose-700 mt-1.5 leading-snug whitespace-pre-wrap">{reason}</p>
        ) : null}
      </div>
    </li>
  );
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function RequestDetailTeamSummary({
  session,
  assignedTeamIds,
  sessionTeamsEmbedded,
  sessionAssignments,
  sessionDetailLoading = false,
}: Props) {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionDetailLoading) {
      setLoading(true);
      setError(null);
      return;
    }

    if (sessionTeamsEmbedded !== undefined) {
      setLoading(false);
      setError(null);
      const rows = sessionTeamsEmbedded
        .filter((ts) => ts.TeamId != null && Number(ts.TeamId) > 0)
        .filter(
          (ts) =>
            assignedTeamIds.length === 0 || assignedTeamIds.includes(Number(ts.TeamId)),
        )
        .map((ts) => ({
          teamId: Number(ts.TeamId),
          teamName: (ts.TeamName && String(ts.TeamName).trim()) || `Đội #${ts.TeamId}`,
          embedTeachers: ts.TeachersRequired ?? null,
          embedTas: ts.TasRequired ?? null,
        } as TeamRow));
      setTeams(rows);
      return;
    }

    if (!assignedTeamIds.length) {
      setTeams([]);
      setLoading(false);
      return;
    }
    const fetchTeams = async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await Promise.all(
          assignedTeamIds.map((id) =>
            teamApi.getById(id).catch(() => null)
          )
        );
        setTeams(list.filter((t): t is TeamRow => t != null));
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Không tải được thông tin đội.';
        setError(msg);
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchTeams();
  }, [assignedTeamIds, sessionTeamsEmbedded, sessionDetailLoading]);

  const { teacherAssignments, taAssignments } = useMemo(() => {
    const list = sessionAssignments ?? [];
    const teachers = list.filter((a) => isTeacherAssignmentRole(a.StaffRole));
    const tas = list.filter((a) => !isTeacherAssignmentRole(a.StaffRole));
    const byId = (x: AssignmentResponse, y: AssignmentResponse) => x.AssignmentId - y.AssignmentId;
    teachers.sort(byId);
    tas.sort(byId);
    return { teacherAssignments: teachers, taAssignments: tas };
  }, [sessionAssignments]);

  const hasAssignments = teacherAssignments.length > 0 || taAssignments.length > 0;

  const totalStaff =
    (session.teachersRequired ?? 1) + (session.tasRequired ?? 1);

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50/70">
        <h3 className="font-semibold text-gray-900 text-sm">Đội phụ trách</h3>
      </div>
      <div className="px-4 py-3 space-y-3">
        {loading ? (
          <p className="text-xs text-gray-500">Đang tải thông tin đội...</p>
        ) : error ? (
          <p className="text-xs text-red-600">{error}</p>
        ) : teams.length === 0 ? (
          <p className="text-xs text-gray-500">Chưa có thông tin đội.</p>
        ) : (
          <>
            {teams.map((team) => (
              <div
                key={team.teamId}
                className="flex items-center justify-between gap-3 text-sm text-gray-800 rounded-xl bg-gradient-to-r from-slate-50/90 to-sky-50/30 px-3 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/80 text-sky-600 shadow-sm">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-black truncate">{team.teamName}</p>
                    <p className="text-xs text-gray-500">
                      Đội đã gắn
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-600 shrink-0">
                  <p>
                    Giảng viên:{' '}
                    <span className="font-semibold text-black">
                      {team.embedTeachers ?? session.teachersRequired ?? '—'}
                    </span>
                  </p>
                  <p>
                    Trợ giảng:{' '}
                    <span className="font-semibold text-black">
                      {team.embedTas ?? session.tasRequired ?? '—'}
                    </span>
                  </p>
                  <p className="mt-0.5">
                    Tổng nhân sự:{' '}
                    <span className="font-semibold text-sky-600">
                      {totalStaff}
                    </span>
                  </p>
                </div>
              </div>
            ))}
            {hasAssignments ? (
              <div className="border-t border-slate-100 pt-3 mt-1 space-y-4">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  Nhân sự được phân công
                </p>
                {teacherAssignments.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                      GIẢNG VIÊN
                    </p>
                    <ul className="space-y-2.5">
                      {teacherAssignments.map((a) => (
                        <SessionAssignmentRow key={a.AssignmentId} assignment={a} />
                      ))}
                    </ul>
                  </div>
                ) : null}
                {taAssignments.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                      TRỢ GIẢNG
                    </p>
                    <ul className="space-y-2.5">
                      {taAssignments.map((a) => (
                        <SessionAssignmentRow key={a.AssignmentId} assignment={a} />
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
