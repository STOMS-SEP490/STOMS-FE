import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import type { SessionDetail } from '@/modules/request/type';
import { Badge } from '@/shared/components/ui/badge';
import { useSessionDetailPopover } from '@/modules/event/hooks/useSessionDetailPopover';
import { useCurrentUser } from '@/shared/hooks/useCurrentUser';
import { getSessionStatusLabel } from '@/constants/status';
import sessionApi from '@/modules/request/api/sessionApi';
import type { SessionResponse } from '@/modules/request/session.types';
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
  onOpenAttendancePanel?: () => void;
};

function formatTimeRange(start?: string, end?: string) {
  if (!start || !end) return '—';
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) => d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return `${fmt(s)} – ${fmt(e)}`;
}

function formatDate(date?: string) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function statusBadgeClass(status?: string) {
  const n = String(status ?? '').trim().toLowerCase();
  if (n === 'completed') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (n === 'ongoing') return 'bg-amber-50 text-amber-800 border border-amber-200';
  return 'bg-slate-100 text-slate-600 border border-slate-200';
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
  const location = useLocation();
  const currentUser = useCurrentUser();

  const isTeamLeader = useMemo(() => {
    const r = (currentUser?.role ?? '').trim().toLowerCase();
    if (!r) return false;
    if (r.includes('trưởng nhóm') || r.includes('team leader')) return true;
    if (r === 'tl' || r === 'teamleader' || r === 'team_leader') return true;
    return false;
  }, [currentUser?.role]);

  const isTeamLeaderRoute = location.pathname.startsWith('/tl');
  const isTeacher = (role?: string) => role === 'TE' || role === 'TEACHER';
  const isAssistant = (role?: string) => role === 'TA';

  const teachers = staff.filter((s) => isTeacher(s.role));
  const tas = staff.filter((s) => isAssistant(s.role));
  const topicTitle = resolveSessionTopicTitleFromSessionLike(session);
  const resolvedRequestName = (requestName || eventMeta?.requestName || '').trim();
  const resolvedRequestCode = (requestCode || eventMeta?.requestCode || '').trim();
  const resolvedSessionNo = session?.SessionNo ?? eventMeta?.sessionNo ?? null;

  const primaryHeadline =
    resolvedRequestName ||
    resolvedRequestCode ||
    (eventMeta?.sessionTitle ?? '').trim() ||
    topicTitle ||
    (session?.Notes ?? '').trim() ||
    'Buổi học';

  const memberId = Number(JSON.parse(localStorage.getItem('user') || '{}')?.memberId || 0) || 0;
  const ownerIdFromSession = getAttendanceOwnerId(session?.Attendances ?? null);
  const canSeeAttendanceButton =
    isTeamLeaderRoute || isTeamLeader || (ownerIdFromSession != null && ownerIdFromSession === memberId);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailSession, setDetailSession] = useState<SessionResponse | null>(null);
  const detailFetchSeq = useRef(0);

  const detailSessionTitle =
    (eventMeta?.sessionTitle ?? '').trim() ||
    resolveSessionTopicTitleFromSessionLike(session) ||
    (detailSession?.EventSession?.Title ?? '').trim() ||
    (detailSession?.SubjectSession?.Title ?? '').trim() ||
    `Buổi ${detailSession?.SessionNo ?? resolvedSessionNo ?? '—'}`;

  const closeDetail = () => {
    detailFetchSeq.current += 1;
    setDetailOpen(false);
    setDetailLoading(false);
    setDetailError(null);
    setDetailSession(null);
  };

  const openDetail = async () => {
    if (!session || detailOpen) return;
    detailFetchSeq.current += 1;
    const seq = detailFetchSeq.current;
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailSession(null);

    try {
      const sessionDetail = await sessionApi.getById(session.SessionId);
      if (seq !== detailFetchSeq.current) return;
      setDetailSession(sessionDetail);
    } catch (err: unknown) {
      if (seq !== detailFetchSeq.current) return;
      const msg = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: unknown }).message)
        : 'Không tải được chi tiết buổi.';
      setDetailError(msg);
    } finally {
      if (seq !== detailFetchSeq.current) return;
      setDetailLoading(false);
    }
  };

  const width = 340;
  const gap = 12;
  const margin = 12;

  useLayoutEffect(() => {
    if (!open || !session) return;
    const update = () => {
      const el = popoverRef.current;
      const h = el?.getBoundingClientRect().height ?? 420;
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
        preferRight + width <= viewportW - margin ? preferRight
          : preferLeft >= margin ? preferLeft
            : Math.max(margin, Math.min(preferRight, viewportW - width - margin));

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

      {/* Full-panel detail */}
      {detailOpen && (
        <div className="fixed inset-0 isolate z-[75] pointer-events-auto">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
            onClick={() => { closeDetail(); onClose(); }}
            aria-hidden
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-[600px] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-xl">
            {/* Detail header */}
            <div className="shrink-0 border-b border-gray-100 px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Chi tiết buổi</p>
                  <h2 className="text-lg font-bold text-slate-900 leading-snug">
                    {detailSessionTitle}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 tabular-nums">
                    <span>Buổi {session.SessionNo}</span>
                    <span className="text-slate-300">{' · '}</span>
                    <span className="font-semibold text-[#2197C0]">
                      {dayjs(session.StartAt).format('HH:mm')} – {dayjs(session.EndAt).format('HH:mm')}
                    </span>
                    <span className="text-slate-300">{' · '}</span>
                    <span className="font-semibold text-[#2197C0]">{dayjs(session.StartAt).format('DD/MM/YYYY')}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[11px] font-medium text-slate-500">Trạng thái:</span>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${statusBadgeClass(session.Status)}`}>
                      {getSessionStatusLabel(session.Status)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { closeDetail(); onClose(); }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4">
              {detailLoading && <p className="text-xs text-slate-400">Đang tải...</p>}
              {detailError && (
                <p className="rounded bg-rose-50 px-3 py-2 text-xs text-rose-600 border border-rose-100">{detailError}</p>
              )}
              {detailSession && !detailLoading && !detailError && (
                <TeamLeaderSessionDetailPanel
                  session={detailSession}
                  requestCode={detailSession.Request?.RequestCode ?? undefined}
                  requestName={detailSession.Request?.RequestName ?? undefined}
                />
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Mini popover */}
      {!detailOpen && (
        <div
          ref={popoverRef}
          className="fixed z-[72] bg-white border border-slate-200 shadow-lg flex flex-col overflow-hidden"
          style={{ left: pos.left, top: pos.top, width, maxHeight: 'calc(100vh - 24px)', borderRadius: 8 }}
          role="dialog"
          aria-modal="true"
        >
          {/* Popover header */}
          <div className="relative border-b border-slate-100 px-4 pt-4 pb-3">
            <button
              type="button"
              onClick={() => { closeDetail(); onClose(); }}
              className="absolute right-3 top-3 rounded p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Đóng"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="pr-8">
              <div className="text-sm font-semibold text-slate-900 leading-snug truncate">
                {primaryHeadline}
              </div>
              <div className="text-xs mt-0.5">
                {resolvedRequestName || resolvedRequestCode ? (
                  <>
                    {topicTitle && <span className="text-[#2197C0] font-medium">{topicTitle}</span>}
                    {topicTitle && <span className="text-slate-400"> · </span>}
                    <span className="text-slate-500">Buổi {resolvedSessionNo ?? '—'}</span>
                  </>
                ) : (
                  <span className="text-slate-500">Buổi {resolvedSessionNo ?? '—'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Time + Location */}
          <div className="border-b border-slate-100 px-4 py-3 space-y-1.5">
            <div className="flex items-baseline gap-2">
              <span className="w-16 shrink-0 text-[11px] text-[#2197C0] font-medium">Thời gian</span>
              <span className="text-xs font-medium text-slate-900">
                {formatDate(session.StartAt)} · {formatTimeRange(session.StartAt, session.EndAt)}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="w-16 shrink-0 text-[11px] text-[#2197C0] font-medium">Địa điểm</span>
              <span className="text-xs text-slate-700 break-words">{session.Location || '—'}</span>
            </div>
          </div>

          {/* Staff */}
          <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-3">
            <div className="flex items-center justify-between ">
              {session && canSeeAttendanceButton && onOpenAttendancePanel && (
                <button
                  type="button"
                  className="inline-flex items-center rounded px-2.5 py-1 text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors"
                  onClick={() => {
                    onOpenAttendancePanel();
                  }}
                >
                  Xác nhận tham gia
                </button>
              )}
            </div>

            {staff.length > 0 && !staff.every((s) => !s.name || s.name === '—') ? (
              <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                {teachers.length > 0 && (
                  <div>
                    <div className="mb-2 inline-flex items-center rounded-full bg-violet-100 border border-violet-200 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-violet-700">
                      Giảng viên
                    </div>
                    <div className="space-y-1.5">
                      {teachers.map((s) => (
                        <div key={s.assignmentId} className="flex items-center gap-2.5">
                          <img
                            src={s.avatarUrl || '/img/ava.png'}
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/img/ava.png'; }}
                            className="h-6 w-6 rounded-full object-cover shrink-0"
                            alt=""
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-slate-900 truncate">{s.name}</div>
                            {s.email && <div className="text-[10px] text-slate-400 truncate">{s.email}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {tas.length > 0 && (
                  <div>
                    <div className="mb-2 inline-flex items-center rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-700">
                      Sinh viên
                    </div>
                    <div className="space-y-1.5">
                      {tas.map((s) => (
                        <div key={s.assignmentId} className="flex items-center gap-2.5">
                          <img
                            src={s.avatarUrl || '/img/ava.png'}
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/img/ava.png'; }}
                            className="h-6 w-6 rounded-full object-cover shrink-0"
                            alt=""
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-slate-900 truncate">{s.name}</div>
                            {s.email && <div className="text-[10px] text-slate-400 truncate">{s.email}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded bg-amber-50 border border-amber-100 px-3 py-2 flex items-center justify-between gap-3">
                <span className="text-xs text-amber-800">Chưa có phân công</span>
                {isTeamLeader && (
                  <button
                    type="button"
                    className="shrink-0 rounded px-2.5 py-1 text-[11px] font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                    onClick={() => navigate('/tl/assignments')}
                  >
                    Phân công
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Trạng thái:</span>
              <Badge className={`text-[10px] px-2 py-0.5 ${statusBadgeClass(session.Status)}`}>
                {getSessionStatusLabel(session.Status)}
              </Badge>
            </div>
            <button
              type="button"
              onClick={() => void openDetail()}
              disabled={detailLoading}
              className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-sky-700 hover:underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Xem chi tiết
              <ChevronRight className="h-3 w-3" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
