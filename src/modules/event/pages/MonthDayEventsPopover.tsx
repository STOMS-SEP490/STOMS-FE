import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { CalendarEvent } from '@/modules/event/event';
import dayjs from 'dayjs';

type Props = {
  open: boolean;
  anchorRect: DOMRect | null;
  events: CalendarEvent[];
  selectedId: string | number | null;
  onClose: () => void;
  onSelect: (id: string | number) => void;
};

// Palette pastel giống EventCalendar.tsx
const EVENT_PASTEL_COLORS = ['#fffce3', '#b5d1de', '#cee1e0', '#cad7e6', '#fff7e1', '#d9e7d6', '#c1e2db', '#c8e6cf', '#b6dce4'];

function getBgForEvent(event: CalendarEvent) {
  const key = typeof event.id === 'number' ? event.id : String(event.id || event.title || '').length;
  const idx = Math.abs(Number(key)) % EVENT_PASTEL_COLORS.length;
  return EVENT_PASTEL_COLORS[idx] || '#cad7e6';
}

export default function MonthDayEventsPopover({ open, anchorRect, events, selectedId, onClose, onSelect }: Props) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 12, top: 12 });

  const width = 360;
  const gap = 12;
  const margin = 12;

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [events]);

  useLayoutEffect(() => {
    if (!open || !anchorRect) return;

    const update = () => {
      const el = popoverRef.current;
      const h = el?.getBoundingClientRect().height ?? 320;
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

      let top = anchorRect.top + anchorRect.height / 2 - h / 2;
      if (top + h > viewportH - margin) top = viewportH - margin - h;
      if (top < margin) top = margin;

      setPos({ left, top });
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [open, anchorRect]);

  if (!open || !anchorRect) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} aria-hidden />
      <div
        className="fixed z-[61] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col p-3"
        ref={popoverRef}
        style={{ left: pos.left, top: pos.top, width, maxHeight: 'calc(100vh - 24px)' }}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="text-sm font-semibold text-gray-900">Danh sách phiên</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar pr-1">
          <div className="space-y-2">
            {sortedEvents.length === 0 ? (
              <div className="text-sm text-gray-500 py-3">Không có phiên</div>
            ) : (
              sortedEvents.map((event) => {
                const bg = getBgForEvent(event);
                const isActive = selectedId != null && String(event.id) === String(selectedId);
                const titleLabel = event.title?.trim() ? event.title : 'Không có tiêu đề';

                return (
                  <button
                    key={String(event.id)}
                    type="button"
                    onClick={() => onSelect(event.id)}
                    className={`w-full text-left rounded-xl border transition-colors ${
                      isActive ? 'border-sky-400' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{
                      backgroundColor: bg,
                      boxShadow: isActive ? '0 10px 18px rgba(2, 132, 199, 0.15)' : 'none',
                    }}
                  >
                    <div className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-semibold text-slate-900 truncate">
                            {dayjs(event.start).format('hA')} ({titleLabel})
                          </div>
                        </div>
                        {(event.status !== null && event.status !== undefined) && (
                          <span
                            className={`shrink-0 inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-medium whitespace-nowrap border ${
                              event.statusClassName || 'bg-amber-100 text-amber-700 border-amber-200'
                            }`}
                          >
                            {event.statusLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

