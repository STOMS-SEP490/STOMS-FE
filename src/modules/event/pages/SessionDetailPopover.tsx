import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, MapPin, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SessionDetail } from '@/modules/request/api/type';
import { Badge } from '@/shared/components/ui/badge';
import { useSessionDetailPopover } from '@/modules/event/hooks/useSessionDetailPopover';
import { useCurrentUser } from '@/shared/hooks/useCurrentUser';
import { getSessionStatusLabel } from '@/constants/status';
import requestApi from '@/modules/request/api/requestApi';
import type { RequestListItem, RequestSessionSummary } from '@/modules/request/request';
import TeamLeaderSessionDetailPanel from '@/modules/request/pages/TeamLeaderSessionDetailPanel';

type Props = {
  open: boolean;
  anchorRect: DOMRect | null;
  onClose: () => void;
  session: SessionDetail | null;
};

function formatTimeRange(start?: string, end?: string) {
  if (!start || !end) return '—';
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) =>
    d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return `${fmt(s)} - ${fmt(e)}`;
}

export default function SessionDetailPopover({ open, anchorRect, onClose, session }: Props) {
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

  // Quyền hiển thị nút "Điểm danh" dựa vào người đang được ủy quyền điểm danh trong session.
  // Nếu backend không trả `attendanceByMemberId`, coi như người đang login là chủ sở hữu (giống logic timetable/attendance panel).
  const memberId = Number(JSON.parse(localStorage.getItem('user') || '{}')?.memberId || 0) || 0;
  const ownerIdFromSession = session?.attendances?.[0]?.attendanceByMemberId ?? null;
  const canSeeAttendanceButton = ownerIdFromSession == null ? true : ownerIdFromSession === memberId;

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailRequest, setDetailRequest] = useState<RequestListItem | null>(null);
  const [detailSession, setDetailSession] = useState<
    (RequestSessionSummary & { reservationId?: number | null; teamAssigned?: boolean }) | null
  >(null);
  const [detailAssignedTeamIds, setDetailAssignedTeamIds] = useState<number[]>([]);
  const detailFetchSeq = useRef(0);

  const closeDetail = () => {
    // invalidate in-flight fetch
    detailFetchSeq.current += 1;
    setDetailOpen(false);
    setDetailLoading(false);
    setDetailError(null);
    setDetailRequest(null);
    setDetailSession(null);
    setDetailAssignedTeamIds([]);
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
    setDetailAssignedTeamIds([]);

    try {
      const requestDetail = await requestApi.getById(session.requestId);
      if (seq !== detailFetchSeq.current) return;

      const rawSession = (requestDetail.sessions ?? []).find(
        (s) => Number((s as any).sessionId) === session.sessionId,
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
      setDetailAssignedTeamIds(assignedTeamIds);
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
    if (!open || !anchorRect) return;

    const update = () => {
      const el = popoverRef.current;
      const h = el?.getBoundingClientRect().height ?? 440;
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

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
  }, [open, anchorRect, width]);

  if (!open || !anchorRect || !session) return null;

  return createPortal(
    <>
      {!detailOpen && <div className="fixed inset-0 z-[60]" onClick={onClose} aria-hidden />}

      {detailOpen && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div
            className="flex-1 bg-black/30"
            onClick={() => {
              closeDetail();
              onClose();
            }}
          />

          <div className="w-full h-full bg-white text-black shadow-2xl flex flex-col overflow-hidden max-w-xl border-l">
            <div className="flex items-start justify-between p-6 pb-4 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Chi tiết phiên</p>
                <h2 className="text-lg font-bold text-slate-900">
                  Phiên {detailSession?.sessionNo ?? '—'}
                  {(detailSession as any)?.notes ? `: ${(detailSession as any).notes}` : ''}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-xs font-medium text-sky-600">Dạy học</span>
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                      (detailSession?.teamAssigned ?? detailAssignedTeamIds.length > 0)
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {detailSession?.teamAssigned ?? detailAssignedTeamIds.length > 0 ? 'Đã gắn đội' : 'Chưa gắn đội'}
                  </span>
                </div>
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

            <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-0">
              {detailLoading && <p className="text-xs text-gray-500">Đang tải chi tiết phiên...</p>}

              {detailError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl">{detailError}</p>
              )}

              {detailRequest && detailSession && !detailLoading && !detailError && (
                <TeamLeaderSessionDetailPanel session={detailSession} requestCode={detailRequest.requestCode ?? ''} />
              )}
            </div>
          </div>
        </div>
      )}

      {!detailOpen && (
        <div
          className="fixed z-[61] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col"
          ref={popoverRef}
          style={{ left: pos.left, top: pos.top, width, maxHeight: 'calc(100vh - 24px)' }}
          role="dialog"
          aria-modal="true"
        >
          <div className="relative px-5 pt-5 pb-3">
          <button
            type="button"
            onClick={() => {
              closeDetail();
              onClose();
            }}
            className="absolute right-3 top-3 rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>

          <div className="pr-12">
            <div className="text-lg font-semibold text-gray-900 truncate">
              {requestName || session.notes || 'Phiên học'}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {requestCode ? `${requestCode} - ` : ''}Buổi {session.sessionNo}
            </div>
            <div className="text-sm font-semibold text-gray-800 mt-2">
              {formatTimeRange(session.startAt, session.endAt)}
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
              <MapPin size={16} className="text-gray-500" />
              <span className="break-words whitespace-normal">{session.location || '—'}</span>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 flex-1 overflow-y-auto no-scrollbar">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-gray-800">Giảng viên/Trợ giảng:</div>
            {session && canSeeAttendanceButton && (
              <button
                type="button"
                className="text-sm text-blue-600 hover:underline"
                onClick={() => navigate(`/tl/attendance/${session.sessionId}`)}
              >
                Điểm danh
              </button>
            )}
          </div>

          <div className="space-y-3">
            {staff.length > 0 && !staff.every((s) => !s.name || s.name === '—') && (
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                    TA:
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
                            className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                            alt="avatar"
                          />
                          <div className="min-w-0">
                            <div className="text-[13px] font-medium text-gray-900 truncate">{s.name}</div>
                            {s.email && <div className="text-[11px] text-gray-500 truncate">{s.email}</div>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500">—</div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="shrink-0 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold bg-sky-100 text-sky-700">
                    TE:
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
                            className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                            alt="avatar"
                          />
                          <div className="min-w-0">
                            <div className="text-[13px] font-medium text-gray-900 truncate">{s.name}</div>
                            {s.email && <div className="text-[11px] text-gray-500 truncate">{s.email}</div>}
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
                <div className="text-sm text-amber-800">
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

          <div className="mt-6 flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 font-medium">Trạng thái:</span>
              <Badge className="bg-gray-100 text-gray-700">{getSessionStatusLabel(session.status)}</Badge>
            </div>

            <button
              type="button"
              onClick={() => void openDetail()}
              disabled={detailLoading}
              className="text-xs font-semibold text-sky-700 hover:underline underline-offset-2 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Xem chi tiết
            </button>
            <ChevronRight className="h-4 w-4 shrink-0 text-sky-700 opacity-80" aria-hidden />
          </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}

