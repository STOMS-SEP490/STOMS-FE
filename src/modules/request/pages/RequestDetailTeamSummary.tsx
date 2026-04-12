import { useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import {
  ASSIGNMENT_STATUS,
  getAssignmentStaffRoleAccent,
  getAssignmentStatusInfo,
} from '@/constants/status';
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

function getAssignmentTeamId(a: AssignmentResponse): number | null {
  const top = a.TeamId != null ? Number(a.TeamId) : 0;
  if (top > 0) return top;
  const sm = a.StaffMember;
  if (!sm) return null;
  const fromMember = sm.TeamId != null ? Number(sm.TeamId) : 0;
  return fromMember > 0 ? fromMember : null;
}

const NAME_PLACEHOLDERS = new Set(['—', '-', '–', 'n/a', 'na']);

function assignmentHasDisplayStaff(a: AssignmentResponse): boolean {
  const sm = a.StaffMember;
  if (!sm) return false;
  const rawName = String(sm.FullName ?? '').trim();
  if (rawName && !NAME_PLACEHOLDERS.has(rawName.toLowerCase())) return true;
  const email = String(sm.Email ?? sm.User?.Email ?? '').trim();
  if (email) return true;
  return false;
}

function SessionAssignmentRow({ assignment: a }: { assignment: AssignmentResponse }) {
  const sm = a.StaffMember;
  const filled = assignmentHasDisplayStaff(a);
  const name = (sm?.FullName && String(sm.FullName).trim()) || '—';
  const avatarUrl = sm?.AvatarUrl && String(sm.AvatarUrl).trim() ? sm.AvatarUrl : null;
  const statusInfo = getAssignmentStatusInfo(a.Status);
  const showStatusBadge = statusInfo.code !== ASSIGNMENT_STATUS.PENDING || filled;
  const accent = getAssignmentStaffRoleAccent(isTeacherAssignmentRole(a.StaffRole));
  const reason = (a.Reason && String(a.Reason).trim()) || '';
  const showReasonConnector = Boolean(reason);

  if (!filled) {
    return (
      <li className="flex flex-col">
        <div
          className={cn(
            'relative rounded-xl',
            showReasonConnector &&
              'before:pointer-events-none before:absolute before:left-0 before:top-2.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-rose-300/50 before:content-[""]',
          )}
        >
          <div
            className={cn(
              'relative z-[1] flex items-center gap-3 rounded-xl py-2.5 pr-3 pl-2.5',
              accent.stripe,
            )}
          >
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold',
                accent.avatar,
              )}
            >
              <span className="text-base font-semibold leading-none">?</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 gap-y-1">
                <p className="truncate text-sm font-semibold text-slate-900">Chưa có nhân sự</p>
                {showStatusBadge ? (
                  <span
                    className={`inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${statusInfo.className}`}
                  >
                    {statusInfo.label}
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                Slot trống — chờ Team Leader xử lý
              </p>
            </div>
          </div>
          {reason ? (
            <p className="relative z-[1] pl-3.5 pr-1 pb-1 pt-0.5 text-[11px] leading-snug text-rose-700 whitespace-pre-wrap">
              {reason}
            </p>
          ) : null}
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-col">
      <div
        className={cn(
          'relative rounded-xl',
          showReasonConnector &&
            'before:pointer-events-none before:absolute before:left-0 before:top-2.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-rose-300/50 before:content-[""]',
        )}
      >
        <div className={cn('relative z-[1] flex gap-3 rounded-xl py-2.5 pr-3 pl-2.5', accent.stripe)}>
          <Avatar className="h-11 w-11 shrink-0">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback className={cn('text-xs font-semibold', accent.avatar)}>
              {initialsFromName(name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 gap-y-1">
              <p className="font-semibold text-sm text-gray-900 truncate">{name}</p>
              {showStatusBadge ? (
                <span
                  className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold shrink-0 ${statusInfo.className}`}
                >
                  {statusInfo.label}
                </span>
              ) : null}
            </div>
            {sm?.Email ? (
              <p className="text-[11px] text-slate-500 truncate mt-0.5">{sm.Email}</p>
            ) : null}
          </div>
        </div>
        {reason ? (
          <p className="relative z-[1] pl-3.5 pr-1 pb-1 pt-0.5 text-[11px] text-rose-700 leading-snug whitespace-pre-wrap">
            {reason}
          </p>
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

type TeamSlotLists = { teachers: AssignmentResponse[]; tas: AssignmentResponse[] };

function sortAssignmentsById(list: AssignmentResponse[]) {
  return [...list].sort((x, y) => x.AssignmentId - y.AssignmentId);
}

function TeamAssignmentsSection({ teachers, tas }: TeamSlotLists) {
  if (!teachers.length && !tas.length) return null;
  return (
    <div className="px-3 pb-3 pt-2.5 bg-white/80 space-y-3 border-t border-slate-100/90">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
        Nhân sự được phân công
      </p>
      {teachers.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Giảng viên</p>
          <ul className="space-y-2">
            {teachers.map((a) => (
              <SessionAssignmentRow key={a.AssignmentId} assignment={a} />
            ))}
          </ul>
        </div>
      ) : null}
      {tas.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Trợ giảng</p>
          <ul className="space-y-2">
            {tas.map((a) => (
              <SessionAssignmentRow key={a.AssignmentId} assignment={a} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
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
        .map(
          (ts) =>
            ({
              teamId: Number(ts.TeamId),
              teamName: (ts.TeamName && String(ts.TeamName).trim()) || `Đội #${ts.TeamId}`,
              embedTeachers: ts.TeachersRequired ?? null,
              embedTas: ts.TasRequired ?? null,
            }) as TeamRow,
        );
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
        const list = await Promise.all(assignedTeamIds.map((id) => teamApi.getById(id).catch(() => null)));
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

  const { byTeamId, orphans } = useMemo(() => {
    const list = sessionAssignments ?? [];
    const byTeamId: Record<number, TeamSlotLists> = {};
    const orphans: TeamSlotLists = { teachers: [], tas: [] };

    for (const t of teams) {
      byTeamId[t.teamId] = { teachers: [], tas: [] };
    }

    for (const a of list) {
      const tid = getAssignmentTeamId(a);
      const slot = isTeacherAssignmentRole(a.StaffRole) ? 'teachers' : 'tas';
      if (tid != null && byTeamId[tid]) {
        byTeamId[tid][slot].push(a);
      } else {
        orphans[slot].push(a);
      }
    }

    for (const tid of Object.keys(byTeamId)) {
      const b = byTeamId[Number(tid)];
      b.teachers = sortAssignmentsById(b.teachers);
      b.tas = sortAssignmentsById(b.tas);
    }
    orphans.teachers = sortAssignmentsById(orphans.teachers);
    orphans.tas = sortAssignmentsById(orphans.tas);

    return { byTeamId, orphans };
  }, [sessionAssignments, teams]);

  const singleTeamMode = teams.length === 1;
  const gvFallback = singleTeamMode ? (session.teachersRequired ?? '—') : '—';
  const taFallback = singleTeamMode ? (session.tasRequired ?? '—') : '—';

  const hasOrphans = orphans.teachers.length > 0 || orphans.tas.length > 0;

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
            {teams.map((team) => {
              const slots = byTeamId[team.teamId] ?? { teachers: [], tas: [] };
              return (
                <div
                  key={team.teamId}
                  className="rounded-xl border border-slate-200/80 overflow-hidden bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3 text-sm text-gray-800 bg-gradient-to-r from-slate-50/90 to-sky-50/30 px-3 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/80 text-sky-600 shadow-sm">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-black truncate">{team.teamName}</p>
                        <p className="text-xs text-gray-500">Đội đã gắn</p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-600 shrink-0">
                      <p>
                        Giảng viên:{' '}
                        <span className="font-semibold text-black">
                          {team.embedTeachers ?? gvFallback}
                        </span>
                      </p>
                      <p>
                        Trợ giảng:{' '}
                        <span className="font-semibold text-black">
                          {team.embedTas ?? taFallback}
                        </span>
                      </p>
                    </div>
                  </div>
                  <TeamAssignmentsSection teachers={slots.teachers} tas={slots.tas} />
                </div>
              );
            })}
            {hasOrphans ? (
              <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/20 overflow-hidden">
                
                <TeamAssignmentsSection teachers={orphans.teachers} tas={orphans.tas} />
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
