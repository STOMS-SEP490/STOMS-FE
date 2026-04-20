import { useCallback, useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { message } from 'antd';
import {
  ASSIGNMENT_STATUS,
  getAssignmentStaffRoleAccent,
  getAssignmentStatusInfo,
} from '@/constants/status';
import { teamApi } from '@/modules/team/api/teamApi';
import type { Team } from '@/modules/team/team';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Button } from '@/shared/components/ui/button';
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
  /** Đang tải chi tiết buổi (GET /sessions/:id) */
  sessionDetailLoading?: boolean;
  reviewMode?: boolean;
  onApproveAssignment?: (assignment: AssignmentResponse) => void | Promise<void>;
  onRejectAssignment?: (assignment: AssignmentResponse) => void | Promise<void>;
  isApprovingAssignment?: (assignmentId: number) => boolean;
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

function normalizeBusyReason(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return trimmed.replace(/^(báo\s*bận|bao\s*ban)\s*:\s*/i, '').trim();
}

function assignmentHasDisplayStaff(a: AssignmentResponse): boolean {
  const sm = a.StaffMember;
  if (!sm) return false;
  const rawName = String(sm.FullName ?? '').trim();
  if (rawName && !NAME_PLACEHOLDERS.has(rawName.toLowerCase())) return true;
  const email = String(sm.Email ?? sm.User?.Email ?? '').trim();
  if (email) return true;
  return false;
}

function SessionAssignmentRow({
  assignment: a,
  reviewMode = false,
  selected = false,
  onToggleSelect,
  onRejectAssignment,
}: {
  assignment: AssignmentResponse;
  reviewMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (assignment: AssignmentResponse) => void;
  onRejectAssignment?: (assignment: AssignmentResponse) => void;
}) {
  const sm = a.StaffMember;
  const filled = assignmentHasDisplayStaff(a);
  const name = (sm?.FullName && String(sm.FullName).trim()) || '—';
  const avatarUrl = sm?.AvatarUrl && String(sm.AvatarUrl).trim() ? sm.AvatarUrl : null;
  const statusInfo = getAssignmentStatusInfo(a.Status);
  const showStatusBadge = statusInfo.code !== ASSIGNMENT_STATUS.PENDING || filled;
  const accent = getAssignmentStaffRoleAccent(isTeacherAssignmentRole(a.StaffRole));
  const reason = (a.Reason && String(a.Reason).trim()) || '';
  const busyReason = normalizeBusyReason(reason);
  const isRejected = statusInfo.code === ASSIGNMENT_STATUS.REJECTED;
  const isPending = statusInfo.code === ASSIGNMENT_STATUS.PENDING;
  const canReview = reviewMode && filled && isPending;
  const reasonLines =
    reason.length > 0 ? reason.split('\n').filter((line) => line.trim().length > 0) : [];
  const showReasonConnector = isRejected && reasonLines.length > 0;
  const rowStripe = isRejected ? 'border-l-[3px] border-l-rose-500 bg-rose-50/30' : accent.stripe;
  const avatarAccent = isRejected ? 'bg-rose-100 text-rose-800' : accent.avatar;

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
              'relative z-[1] flex items-center justify-between gap-3 rounded-xl py-2.5 pr-3 pl-2.5',
              rowStripe,
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold',
                  avatarAccent,
                )}
              >
                <span className="text-base font-semibold leading-none">?</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">Chưa có sinh viên</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                Chờ Trưởng nhóm xử lý
              </p>
              </div>
            </div>
            {showStatusBadge ? (
              <span
                className={`inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${statusInfo.className}`}
              >
                {statusInfo.label}
              </span>
            ) : null}
          </div>
          {isRejected ? (
            <div className="border-t border-slate-200/45 bg-rose-50/25 px-3 py-2.5">
              <div className="rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2.5">
                <p className="text-xs font-medium text-rose-900 mb-1.5">Lý do từ chối</p>
                {reasonLines.length > 0 ? (
                  <ul className="space-y-1 text-xs text-rose-950 leading-relaxed list-none pl-0">
                    {reasonLines.map((line, idx) => (
                      <li key={idx} className="pl-3 border-l-2 border-rose-300">
                        {`Từ chối lần ${idx + 1}: ${line}`}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-rose-700/85 italic">Chưa có lý do ghi nhận từ quản lý.</p>
                )}
              </div>
            </div>
          ) : busyReason ? (
            <div className="border-t border-rose-200/50 bg-rose-50/30 px-3 py-2.5">
              <div className="rounded-lg border border-red-200/90 bg-white/70 px-3 py-2">
                <p className="text-xs font-medium text-red-900 mb-1">Lý do:</p>
                <p className="text-xs text-red-950 leading-relaxed whitespace-pre-wrap">{busyReason}</p>
              </div>
            </div>
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
        <div
          className={cn(
            'relative z-[1] flex items-center justify-between gap-3 rounded-xl py-2.5 pr-3 pl-2.5',
            rowStripe,
          )}
        >
          <div className="flex min-w-0 flex-1 gap-3">
            <Avatar className="h-11 w-11 shrink-0">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
              <AvatarFallback className={cn('text-xs font-semibold', avatarAccent)}>
                {initialsFromName(name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-gray-900 truncate">{name}</p>
            {sm?.Email ? (
              <p className="text-[11px] text-slate-500 truncate mt-0.5">{sm.Email}</p>
            ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canReview ? (
              <>
                <button
                  type="button"
                  className="text-xs font-medium text-red-600 hover:text-red-700 underline-offset-2 hover:underline bg-transparent border-0 p-0 shadow-none cursor-pointer"
                  onClick={() => onRejectAssignment?.(a)}
                >
                  Từ chối
                </button>
                <button
                  type="button"
                  onClick={() => onToggleSelect?.(a)}
                  className={`text-xs font-medium bg-transparent border-0 p-0 shadow-none cursor-pointer underline-offset-2 ${
                    selected
                      ? 'text-emerald-600 hover:text-emerald-700'
                      : 'text-slate-600 hover:text-slate-900 hover:underline'
                  }`}
                >
                  {selected ? 'Đã chọn' : 'Chọn duyệt'}
                </button>
              </>
            ) : null}
            {showStatusBadge ? (
              <span
                className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold shrink-0 ${statusInfo.className}`}
              >
                {statusInfo.label}
              </span>
            ) : null}
          </div>
        </div>
        {isRejected ? (
          <div className="border-t border-slate-200/45 bg-rose-50/25 px-3 py-2.5">
            <div className="rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2.5">
              <p className="text-xs font-medium text-rose-900 mb-1.5">Lý do từ chối</p>
              {reasonLines.length > 0 ? (
                <ul className="space-y-1 text-xs text-rose-950 leading-relaxed list-none pl-0">
                  {reasonLines.map((line, idx) => (
                    <li key={idx} className="pl-3 border-l-2 border-rose-300">
                      {`Từ chối lần ${idx + 1}: ${line}`}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-rose-700/85 italic">Chưa có lý do ghi nhận từ quản lý.</p>
              )}
            </div>
          </div>
        ) : busyReason ? (
          <div className="border-t border-rose-200/50 bg-rose-50/30 px-3 py-2.5">
            <div className="rounded-lg border border-red-200/90 bg-white/70 px-3 py-2">
              <p className="text-xs font-medium text-red-900 mb-1">Lý do:</p>
              <p className="text-xs text-red-950 leading-relaxed whitespace-pre-wrap">{busyReason}</p>
            </div>
          </div>
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

type TeamSlotLists = { tas: AssignmentResponse[] };

function sortAssignmentsByDisplayOrder(list: AssignmentResponse[]) {
  return [...list].sort((x, y) => {
    const xs = getAssignmentStatusInfo(x.Status).code;
    const ys = getAssignmentStatusInfo(y.Status).code;
    const xCancelled = xs === ASSIGNMENT_STATUS.CANCELLED;
    const yCancelled = ys === ASSIGNMENT_STATUS.CANCELLED;
    // Match TL ordering: active assignments first, cancelled history last.
    if (xCancelled !== yCancelled) return xCancelled ? 1 : -1;
    // Within same group, newer assignment first.
    return Number(y.AssignmentId ?? 0) - Number(x.AssignmentId ?? 0);
  });
}

function TeamAssignmentsSection({
  tas,
  heading = 'Sinh viên',
  reviewMode = false,
  selectedAssignmentIds = [],
  onToggleSelect,
  onRejectAssignment,
}: {
  tas: AssignmentResponse[];
  heading?: string;
  reviewMode?: boolean;
  selectedAssignmentIds?: number[];
  onToggleSelect?: (assignment: AssignmentResponse) => void;
  onRejectAssignment?: (assignment: AssignmentResponse) => void;
}) {
  if (!tas.length) return null;
  return (
    <div className="space-y-2 border-t border-slate-200 px-3 pb-3 pt-2.5">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
        Nhân sự được phân công
      </p>
      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">{heading}</p>
        <ul className="space-y-2">
          {tas.map((a) => (
            <SessionAssignmentRow
              key={a.AssignmentId}
              assignment={a}
              reviewMode={reviewMode}
              selected={selectedAssignmentIds.includes(a.AssignmentId)}
              onToggleSelect={onToggleSelect}
              onRejectAssignment={onRejectAssignment}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function RequestDetailTeamSummary({
  session,
  assignedTeamIds,
  sessionTeamsEmbedded,
  sessionAssignments,
  sessionDetailLoading = false,
  reviewMode = false,
  onApproveAssignment,
  onRejectAssignment,
}: Props) {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<number[]>([]);
  const [bulkApproving, setBulkApproving] = useState(false);

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
              teamName: (ts.TeamName && String(ts.TeamName).trim()) || `Nhóm #${ts.TeamId}`,
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
            : 'Không tải được thông tin nhóm.';
        setError(msg);
        setTeams([]);
      } finally {
        setLoading(false);
      }
    };
    void fetchTeams();
  }, [assignedTeamIds, sessionTeamsEmbedded, sessionDetailLoading]);

  const { byTeamId, orphans, teachers } = useMemo(() => {
    const list = sessionAssignments ?? [];
    const byTeamId: Record<number, TeamSlotLists> = {};
    const orphans: TeamSlotLists = { tas: [] };
    const teachers: AssignmentResponse[] = [];

    for (const t of teams) {
      byTeamId[t.teamId] = { tas: [] };
    }

    for (const a of list) {
      const tid = getAssignmentTeamId(a);
      if (isTeacherAssignmentRole(a.StaffRole)) {
        teachers.push(a);
        continue;
      }
      if (tid != null && byTeamId[tid]) {
        byTeamId[tid].tas.push(a);
      } else {
        orphans.tas.push(a);
      }
    }

    for (const tid of Object.keys(byTeamId)) {
      const b = byTeamId[Number(tid)];
      b.tas = sortAssignmentsByDisplayOrder(b.tas);
    }
    const sortedTeachers = sortAssignmentsByDisplayOrder(teachers);
    orphans.tas = sortAssignmentsByDisplayOrder(orphans.tas);

    return { byTeamId, orphans, teachers: sortedTeachers };
  }, [sessionAssignments, teams]);

  const singleTeamMode = teams.length === 1;
  const taFallback = singleTeamMode ? (session.tasRequired ?? '—') : '—';

  const hasOrphans = orphans.tas.length > 0;

  const reviewableAssignments = useMemo(() => {
    if (!reviewMode) return [];
    const list = sessionAssignments ?? [];
    return list.filter((a) => {
      if (!assignmentHasDisplayStaff(a)) return false;
      const s = getAssignmentStatusInfo(a.Status);
      return s.code === ASSIGNMENT_STATUS.PENDING && Number(a.AssignmentId) > 0;
    });
  }, [reviewMode, sessionAssignments]);

  useEffect(() => {
    // Khi dữ liệu assignment thay đổi, loại bỏ lựa chọn không còn tồn tại.
    const valid = new Set(reviewableAssignments.map((a) => a.AssignmentId));
    setSelectedAssignmentIds((prev) => prev.filter((id) => valid.has(id)));
  }, [reviewableAssignments]);

  const toggleSelectAssignment = useCallback((a: AssignmentResponse) => {
    const id = Number(a.AssignmentId);
    if (!id) return;
    setSelectedAssignmentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const toggleSelectAllReviewable = useCallback(() => {
    const reviewableIds = reviewableAssignments.map((a) => a.AssignmentId);
    if (reviewableIds.length === 0) return;
    setSelectedAssignmentIds((prev) => {
      const allOn = reviewableIds.every((id) => prev.includes(id));
      return allOn ? prev.filter((id) => !reviewableIds.includes(id)) : Array.from(new Set([...prev, ...reviewableIds]));
    });
  }, [reviewableAssignments]);

  const handleApproveSelected = useCallback(async () => {
    if (!onApproveAssignment) return;
    if (selectedAssignmentIds.length === 0) {
      message.info('Vui lòng chọn ít nhất một phân công chờ duyệt.');
      return;
    }

    const byId = new Map((reviewableAssignments ?? []).map((a) => [a.AssignmentId, a] as const));
    const selectedRows = selectedAssignmentIds
      .map((id) => byId.get(id))
      .filter((x): x is AssignmentResponse => x != null);

    if (selectedRows.length === 0) {
      message.info('Không có phân công hợp lệ để duyệt.');
      return;
    }

    setBulkApproving(true);
    try {
      for (const row of selectedRows) {
        // Duyệt theo từng phân công (API hiện tại là duyệt đơn).
        // eslint-disable-next-line no-await-in-loop
        await onApproveAssignment(row);
      }
      setSelectedAssignmentIds([]);
    } finally {
      setBulkApproving(false);
    }
  }, [onApproveAssignment, reviewableAssignments, selectedAssignmentIds]);

  // Với manager flow mới, nếu chưa có team được gắn thì không render block "Nhóm phụ trách"
  // để tránh trùng/loãng thông tin với panel phân công phía dưới.
  // NHƯNG nếu đang ở reviewMode (duyệt phân công), luôn hiển thị để duyệt sinh viên
  if (!loading && !error && teams.length === 0 && !reviewMode) return null;

  return (
    <div className="border border-slate-200 bg-white">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-semibold text-gray-900 text-base">Nhóm phụ trách</h3>
        {reviewMode ? (
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none text-[11px] text-slate-600">
              <input
                type="checkbox"
                checked={
                  reviewableAssignments.length > 0 &&
                  reviewableAssignments.every((a) => selectedAssignmentIds.includes(a.AssignmentId))
                }
                onChange={toggleSelectAllReviewable}
                disabled={bulkApproving || reviewableAssignments.length === 0}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
              />
              <span>Chọn tất cả </span>
            </label>
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-full gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-3 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={bulkApproving || selectedAssignmentIds.length === 0 || !onApproveAssignment}
              onClick={() => void handleApproveSelected()}
              title={selectedAssignmentIds.length === 0 ? 'Vui lòng chọn ít nhất một phân công chờ duyệt' : undefined}
            >
              {bulkApproving ? 'Đang duyệt...' : 'Duyệt tất cả'}
            </Button>
          </div>
        ) : null}
      </div>
      <div className="px-4 py-3 space-y-3">
        {loading ? (
          <p className="text-xs text-gray-500">Đang tải thông tin nhóm...</p>
        ) : error ? (
          <p className="text-xs text-red-600">{error}</p>
        ) : teams.length === 0 ? (
          <p className="text-xs text-gray-500">Chưa có thông tin nhóm.</p>
        ) : (
          <>
            {teachers.length > 0 ? (
              <div className="border border-slate-200 bg-white">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                  <p className="text-sm font-semibold text-slate-900"></p>
                </div>
                <TeamAssignmentsSection
                  tas={teachers}
                  heading="Giảng viên"
                  reviewMode={reviewMode}
                  selectedAssignmentIds={selectedAssignmentIds}
                  onToggleSelect={toggleSelectAssignment}
                  onRejectAssignment={onRejectAssignment}
                />
              </div>
            ) : null}
            {teams.map((team) => {
              const slots = byTeamId[team.teamId] ?? { tas: [] };
              return (
                <div
                  key={team.teamId}
                  className="border border-slate-200 bg-white"
                >
                  <div className="flex items-center justify-between gap-3 text-sm text-gray-800 bg-slate-50 px-3 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-white text-slate-600 border border-slate-200">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{team.teamName}</p>
                        <p className="text-xs text-slate-500">Nhóm phụ trách</p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-600 shrink-0">
                      <p>
                        Sinh viên:{' '}
                        <span className="font-semibold text-slate-900">
                          {team.embedTas ?? taFallback}
                        </span>
                      </p>
                    </div>
                  </div>
                  <TeamAssignmentsSection
                    tas={slots.tas}
                    reviewMode={reviewMode}
                    selectedAssignmentIds={selectedAssignmentIds}
                    onToggleSelect={toggleSelectAssignment}
                    onRejectAssignment={onRejectAssignment}
                  />
                </div>
              );
            })}
            {hasOrphans ? (
              <div className="border border-dashed border-amber-300 bg-amber-50/30 overflow-hidden">
                <div className="px-3 py-2 border-b border-amber-200/80">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">Sinh viên chưa gắn nhóm</p>
                </div>
                <TeamAssignmentsSection
                  tas={orphans.tas}
                  reviewMode={reviewMode}
                  selectedAssignmentIds={selectedAssignmentIds}
                  onToggleSelect={toggleSelectAssignment}
                  onRejectAssignment={onRejectAssignment}
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
