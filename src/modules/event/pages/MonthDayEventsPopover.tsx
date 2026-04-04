import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { CalendarEvent } from '@/modules/event/event';
import { resolveMonthDotColor } from '@/modules/event/utils/monthDotColor';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

type Props = {
  open: boolean;
  anchorRect: DOMRect | null;
  day: Date;
  events: CalendarEvent[];
  onClose: () => void;
  onPickEvent: (ev: CalendarEvent) => void;
};

function formatDayTitle(d: Date) {
  return dayjs(d).locale('vi').format('D [tháng] M[,] YYYY');
}

export default function MonthDayEventsPopover({ open, anchorRect, day, events, onClose, onPickEvent }: Props) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: 12, top: 12 });

  const width = 260;
  const gap = 8;
  const margin = 10;

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [events]);

  useLayoutEffect(() => {
    if (!open || !anchorRect) return;

    const update = () => {
      const el = popoverRef.current;
      const h = el?.getBoundingClientRect().height ?? 240;
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      const preferBelowTop = anchorRect.bottom + gap;
      const preferAboveTop = anchorRect.top - gap - h;
      let top =
        preferBelowTop + h <= viewportH - margin
          ? preferBelowTop
          : preferAboveTop >= margin
            ? preferAboveTop
            : margin;

      if (top + h > viewportH - margin) top = Math.max(margin, viewportH - margin - h);

      let left = anchorRect.left;
      const w = Math.min(width, viewportW - margin * 2);
      if (left + w > viewportW - margin) left = viewportW - w - margin;
      if (left < margin) left = margin;

      setPos({ left, top });
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [open, anchorRect, sortedEvents.length]);

  if (!open || !anchorRect) return null;

  const w = Math.min(width, typeof window !== 'undefined' ? window.innerWidth - margin * 2 : width);

  return createPortal(
    <>
      {/* Lớp trong suốt: đóng khi click ra ngoài, không làm tối/mờ nền */}
      <div className="fixed inset-0 z-[62]" onClick={onClose} aria-hidden />
      <div
        className="fixed z-[63] flex max-h-[min(280px,calc(100vh-24px))] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md"
        ref={popoverRef}
        onMouseDown={(e) => e.stopPropagation()}
        style={{ left: pos.left, top: pos.top, width: w }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="month-day-popover-title"
      >
        <div className="flex shrink-0 items-center border-b border-slate-100 bg-white py-1 pl-2 pr-0.5">
          <p id="month-day-popover-title" className="min-w-0 flex-1 truncate pr-1 text-[11px] font-semibold leading-tight text-slate-800">
            {formatDayTitle(day)}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Đóng"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-1.5 py-1">
          {sortedEvents.length === 0 ? (
            <div className="py-3 text-center text-[11px] text-slate-500">Không có phiên.</div>
          ) : (
            <ul className="flex flex-col gap-0">
              {sortedEvents.map((ev) => {
                const dot = resolveMonthDotColor(ev.status, ev.start, ev.end);
                const timeRange = `${dayjs(ev.start).format('HH:mm')}–${dayjs(ev.end).format('HH:mm')}`;

                return (
                  <li key={String(ev.id)}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPickEvent(ev);
                      }}
                      className="w-full rounded px-1 py-0.5 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-400"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: dot }}
                          aria-hidden
                        />
                        <span className="text-[10px] tabular-nums leading-none text-slate-500">{timeRange}</span>
                      </div>
                      <div className="mt-0.5 truncate pl-3 text-[11px] font-medium leading-tight text-slate-800">
                        {ev.title}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
