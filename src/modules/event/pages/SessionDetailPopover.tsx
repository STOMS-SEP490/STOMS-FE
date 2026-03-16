import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SessionDetail } from '@/modules/request/api/sessionApi';
import { Badge } from '@/shared/components/ui/badge';
import { useSessionDetailPopover } from '@/modules/event/hooks/useSessionDetailPopover';
import { useCurrentUser } from '@/shared/hooks/useCurrentUser';

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
      <div className="fixed inset-0 z-[60]" onClick={onClose} aria-hidden />
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
            onClick={onClose}
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
            {isTeamLeader && session && (
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
            {staff.length > 0 &&
              staff.map((s) => (
                <div key={s.assignmentId} className="flex items-center gap-3">
                  <span
                    className={`shrink-0 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      s.role === 'TE' || s.role === 'TEACHER'
                        ? 'bg-sky-100 text-sky-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {s.role === 'TEACHER' ? 'TE' : s.role === 'TA' ? 'TA' : s.role || '—'}
                  </span>
                  <img
                    src={s.avatarUrl || '/img/ava.png'}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/img/ava.png';
                    }}
                    className="w-10 h-10 rounded-full object-cover"
                    alt="avatar"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{s.name}</div>
                    {s.email && <div className="text-xs text-gray-500 truncate">{s.email}</div>}
                  </div>
                </div>
              ))}
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

          <div className="mt-6 flex items-center gap-2 text-sm">
            <span className="text-gray-600 font-medium">Trạng thái:</span>
            <Badge className="bg-gray-100 text-gray-700">{session.status || '—'}</Badge>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

