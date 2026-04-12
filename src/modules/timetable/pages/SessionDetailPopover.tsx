import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, MapPin, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SessionDetail } from '@/modules/request/type';
import { Badge } from '@/shared/components/ui/badge';
import { useSessionDetailPopover } from '@/modules/event/hooks/useSessionDetailPopover';
import { useCurrentUser } from '@/shared/hooks/useCurrentUser';
import { getSessionStatusLabel } from '@/constants/status';
import requestApi from '@/modules/request/api/requestApi';
import type { RequestListItem, RequestSessionSummary } from '@/modules/request/request';
import TeamLeaderSessionDetailPanel from '@/modules/request/pages/TeamLeaderSessionDetailPanel';
import { getAttendanceOwnerId } from '@/shared/utils/attendanceOwner';
import { resolveSessionTopicTitleFromSessionLike } from '@/modules/event/utils/sessionTopicTitle';

type Props = {
  open: boolean;
  anchorRect: DOMRect | null;
  onClose: () => void;
  session: SessionDetail | null;
  eventMeta?: {
    title?: string;
    sessionTitle?: string;
    requestCode?: string;
    requestName?: string;
    sessionNo?: number | null;
  } | null;
  /** Mở panel điểm danh (check-in) — do trang cha giữ state panel. */
  onOpenAttendancePanel?: () => void;
};

function formatTimeRange(start?: string, end?: string) {
  if (!start || !end) return '—';
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) =>
    d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return `${fmt(s)} - ${fmt(e)}`;
}

function statusBadgeClass(status?: string) {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (normalized === 'completed') {
    return 'bg-emerald-100 text-emerald-700';
  }
  if (normalized === 'ongoing') {
    return 'bg-amber-100 text-amber-800';
  }
  return 'bg-gray-100 text-gray-700';
}

export default function SessionDetailPopover({
  open,
  anchorRect,
  onClose,
  session,
  eventMeta,
  onOpenAttendancePanel,
}: Props) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 12, top: 12 });

  const { requestCode, requestName, staff } = useSessionDetailPopover(open, session);
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const isTeamLeader = currentUser?.role === 'Trưởng nhóm';
  const isTeacher = (role?: string) => role === 'TE' || role === 'TEACHER';
  const isAssistant = (role?: string) => role === 'TA';

  const teachers = staff.filter((s) => isTeacher(s.role));
  const tas = staff.filter((s) => isAssistant(s.role));
  const topicTitle = resolveSessionTopicTitleFromSessionLike(session);
  const resolvedRequestName = (requestName || eventMeta?.requestName || '').trim();
  const resolvedRequestCode = (requestCode || eventMeta?.requestCode || '').trim();
  const resolvedSessionNo = session?.SessionNo ?? eventMeta?.sessionNo ?? null;
  /** Giống lịch teacher/TL: ưu tiên tên request, sau đó mã, rồi tiêu đề buổi (Event/Subject theo quy tắc null). */
  const primaryHeadline =
    resolvedRequestName ||
    resolvedRequestCode ||
    (eventMeta?.sessionTitle ?? '').trim() ||
    topicTitle ||
    (session?.Notes ?? '').trim() ||
    'Phiên học';
  const secondarySubtitle =
    resolvedRequestName || resolvedRequestCode
      ? `${topicTitle ? `${topicTitle} · ` : ''}Buổi ${resolvedSessionNo ?? '—'}`
      : `Buổi ${resolvedSessionNo ?? '—'}`;

  // Chỉ hiển thị nút "Điểm danh" khi token user đúng là người được ủy quyền của phiên.
  const memberId = Number(JSON.parse(localStorage.getItem('user') || '{}')?.memberId || 0) || 0;
  const ownerIdFromSession = getAttendanceOwnerId(session?.Attendances ?? null);
  const canSeeAttendanceButton = ownerIdFromSession != null && ownerIdFromSession === memberId;

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailRequest, setDetailRequest] = useState<RequestListItem | null>(null);
  const [detailSession, setDetailSession] = useState<
    (RequestSessionSummary & { reservationId?: number | null; teamAssigned?: boolean }) | null
  >(null);
  const detailFetchSeq = useRef(0);
  const detailSessionTitle =
    (eventMeta?.sessionTitle ?? '').trim() ||
    resolveSessionTopicTitleFromSessionLike(session) ||
    ((detailSession as { eventSession?: { title?: string | null } | null } | null)?.eventSession?.title ?? '').trim() ||
    ((detailSession as { subjectSession?: { title?: string | null } | null } | null)?.subjectSession?.title ?? '').trim() ||
    `Phiên ${detailSession?.sessionNo ?? resolvedSessionNo ?? '—'}`;
  const detailSessionNotes = String((detailSession as { notes?: string | null } | null)?.notes ?? '').trim();
  const detailIsOnline =
    ((detailSession as { isOnline?: boolean | null } | null)?.isOnline ?? null) ??
    session?.IsOnline ??
    null;

  const closeDetail = () => {
    // invalidate in-flight fetch
    detailFetchSeq.current += 1;
    setDetailOpen(false);
    setDetailLoading(false);
    setDetailError(null);
    setDetailRequest(null);
    setDetailSession(null);
  };

  const openDetail = async () => {
    if (!session) return;
    if (detailOpen) return;

    detailFetchSeq.current += 1;
    const seq = detailFetchSeq.current;

    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailRequest(null);
    setDetailSession(null);

    try {
      const requestDetail = await requestApi.getById(session.RequestId);
      if (seq !== detailFetchSeq.current) return;

      const rawSession = (requestDetail.sessions ?? []).find(
        (s) => Number(s.sessionId) === session.SessionId,
      ) as (RequestSessionSummary & Record<string, unknown>) | undefined;

      if (!rawSession) {
        throw new Error('Không tìm thấy phiên trong yêu cầu.');
      }

      const anySession = rawSession as Record<string, unknown> & {
        reservationId?: number | string | null;
        ReservationId?: number | string | null;
        teamSessions?: unknown[];
        TeamSessions?: unknown[];
        teamId?: number | null;
        TeamId?: number | null;
        status?: string;
        notes?: string;
      };

      const rawReservationId = anySession.reservationId ?? anySession.ReservationId ?? null;
      const parsed = rawReservationId != null ? Number(rawReservationId) : NaN;
      const reservationId = !Number.isNaN(parsed) && parsed > 0 ? parsed : null;

      const fromSessions = (anySession.teamSessions ?? anySession.TeamSessions ?? []) as Array<any>;
      const backendTeamIds = Array.isArray(fromSessions)
        ? fromSessions
            .map((ts) => ts?.teamId ?? ts?.TeamId)
            .filter((id): id is number => typeof id === 'number' && id > 0)
        : [];

      const singleTeamId = anySession.teamId ?? anySession.TeamId;
      const assignedTeamIds =
        backendTeamIds.length > 0
          ? backendTeamIds
          : typeof singleTeamId === 'number' && singleTeamId > 0
            ? [singleTeamId]
            : [];

      const statusStr = String(anySession.status ?? '').toLowerCase();
      const teamAssigned =
        assignedTeamIds.length > 0 ||
        statusStr === 'approved' ||
        statusStr === 'assigned' ||
        statusStr === 'ongoing' ||
        statusStr === 'completed';

      if (seq !== detailFetchSeq.current) return;
      setDetailRequest(requestDetail);
      setDetailSession({
        ...(rawSession as RequestSessionSummary),
        reservationId,
        teamAssigned,
      });
    } catch (err: unknown) {
      if (seq !== detailFetchSeq.current) return;
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Không tải được chi tiết phiên.';
      setDetailError(msg);
    } finally {
      if (seq !== detailFetchSeq.current) return;
      setDetailLoading(false);
    }
  };

  const width = 360;
  const gap = 12;
  const margin = 12;

  useLayoutEffect(() => {
    if (!open || !session) return;

    const update = () => {
      const el = popoverRef.current;
      const h = el?.getBoundingClientRect().height ?? 440;
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      if (!anchorRect) {
        const left = Math.max(margin, Math.min((viewportW - width) / 2, viewportW - width - margin));
        let top = Math.max(margin, (viewportH - h) / 2);
        if (top + h > viewportH - margin) top = Math.max(margin, viewportH - margin - h);
        setPos({ left, top });
        return;
      }

      const preferRight = anchorRect.right + gap;
      const preferLeft = anchorRect.left - gap - width;
      const left =
        preferRight + width <= viewportW - margin
          ? preferRight
          : preferLeft >= margin
            ? preferLeft
            : Math.max(margin, Math.min(preferRight, viewportW - width - margin));

      // Canh giữa theo chiều dọc của viewport (ưu tiên theo tâm của event)
      let top = anchorRect.top + anchorRect.height / 2 - h / 2;
      if (top + h > viewportH - margin) top = viewportH - margin - h;
      if (top < margin) top = margin;

      setPos({ left, top });
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [open, anchorRect, width, session]);

  if (!open || !session) return null;

  return createPortal(
    <>
      {!detailOpen && <div className="fixed inset-0 z-[70]" onClick={onClose} aria-hidden />}

      {detailOpen && (
        <div className="fixed inset-0 isolate z-[75] pointer-events-auto">
          <div
            className="absolute inset-0 animate-in fade-in-0 duration-300 bg-slate-900/30 backdrop-blur-sm"
            onClick={() => {
              closeDetail();
              onClose();
            }}
            aria-hidden
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-[640px] flex-col overflow-hidden border-l border-slate-200 bg-white text-black shadow-2xl animate-in slide-in-from-right fade-in-0 duration-300 ease-out">
            <div className="flex items-start justify-between border-b border-gray-100 p-6 pb-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Chi tiết phiên</p>
                <h2 className="text-lg font-bold text-slate-900">
                  {detailSessionTitle}
                </h2>
                {(detailSessionNotes || detailIsOnline === true) && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {detailSessionNotes && (
                      <span className="text-xs text-gray-500">{detailSessionNotes}</span>
                    )}
                    {detailIsOnline === true && (
                      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                        Online
                      </span>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  closeDetail();
                  onClose();
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                aria-label="Đóng chi tiết phiên"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-6 py-2">
              {detailLoading && <p className="text-xs text-gray-500">Đang tải chi tiết phiên...</p>}

              {detailError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl">{detailError}</p>
              )}

              {detailRequest && detailSession && !detailLoading && !detailError && (
                <TeamLeaderSessionDetailPanel
                  session={detailSession}
                  requestCode={detailRequest.requestCode ?? ''}
                  requestName={detailRequest.requestName ?? ''}
                />
              )}
            </div>
          </aside>
        </div>
      )}

      {!detailOpen && (
        <div
          className="fixed z-[72] bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col"
          ref={popoverRef}
          style={{ left: pos.left, top: pos.top, width, maxHeight: 'calc(100vh - 24px)' }}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative px-4 pt-4 pb-2">
          <button
            type="button"
            onClick={() => {
              closeDetail();
              onClose();
            }}
            className="absolute right-2 top-2 rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>

          <div className="pr-12">
            <div className="text-base font-semibold text-gray-900 truncate">
              {primaryHeadline}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {secondarySubtitle}
            </div>
            <div className="text-xs font-semibold text-gray-800 mt-2">
              {formatTimeRange(session.StartAt, session.EndAt)}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-700">
              <MapPin size={16} className="text-gray-500" />
              <span className="break-words whitespace-normal">{session.Location || '—'}</span>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 flex-1 overflow-y-auto no-scrollbar">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold text-gray-800">Giảng viên/Trợ giảng:</div>
            {session && canSeeAttendanceButton && (
              <button
                type="button"
                  className="shrink-0 inline-flex items-center justify-center rounded-lg border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700 text-[11px] font-semibold px-2 py-1 transition"
                onClick={() => {
                  if (onOpenAttendancePanel) {
                    onOpenAttendancePanel();
                    return;
                  }
                  navigate(`/tl/attendance/${session.SessionId}`);
                }}
              >
                Điểm danh
              </button>
            )}
          </div>

          <div className="space-y-2">
            {staff.length > 0 && !staff.every((s) => !s.name || s.name === '—') && (
              <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-violet-100 text-violet-700">
                    GV:
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    {teachers.length > 0 ? (
                      teachers.map((s) => (
                        <div key={s.assignmentId} className="flex items-start gap-2">
                          <img
                            src={s.avatarUrl || '/img/ava.png'}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/img/ava.png';
                            }}
                            className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                            alt="avatar"
                          />
                          <div className="min-w-0">
                            <div className="text-[12px] font-medium text-gray-900 truncate">{s.name}</div>
                            {s.email && <div className="text-[10px] text-gray-500 truncate">{s.email}</div>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500">—</div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="shrink-0 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-yellow-100 text-yellow-800">
                    TG:
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    {tas.length > 0 ? (
                      tas.map((s) => (
                        <div key={s.assignmentId} className="flex items-start gap-2">
                          <img
                            src={s.avatarUrl || '/img/ava.png'}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/img/ava.png';
                            }}
                            className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                            alt="avatar"
                          />
                          <div className="min-w-0">
                            <div className="text-[12px] font-medium text-gray-900 truncate">{s.name}</div>
                            {s.email && <div className="text-[10px] text-gray-500 truncate">{s.email}</div>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500">—</div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {(staff.length === 0 || staff.every((s) => !s.name || s.name === '—')) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 flex items-center justify-between gap-3">
                <div className="text-xs text-amber-800">
                  Phiên này hiện <span className="font-semibold">chưa có phân công</span> giảng viên/trợ giảng.
                </div>
                {isTeamLeader && (
                  <button
                    type="button"
                    className="shrink-0 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1"
                    onClick={() => navigate('/tl/assignments')}
                  >
                    Nhấn để phân công
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-gray-600 font-medium">Trạng thái:</span>
              <Badge
                className={`${statusBadgeClass(session.Status)} text-[10px] leading-none px-2 py-0.5`}
              >
                {getSessionStatusLabel(session.Status)}
              </Badge>
            </div>

            <button
              type="button"
              onClick={() => void openDetail()}
              disabled={detailLoading}
              className="inline-flex items-center gap-px text-[11px] font-semibold text-sky-700 hover:underline underline-offset-2 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Xem chi tiết
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
            </button>
          </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}

