import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import type { CalendarEvent } from '@/modules/event/event';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './EventCalendar.css';
import { useCalendarEvents } from '@/modules/event/hooks/useCalendarEvents';
import sessionService from '@/modules/request/api/sessionApi';
import type { SessionDetail } from '@/modules/request/api/type';
import SessionDetailPopover from './SessionDetailPopover';
import MonthDayEventsPopover from './MonthDayEventsPopover.tsx';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, List } from 'lucide-react';

const locales = { vi };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const CALENDAR_MESSAGES = {
  today: 'Hôm nay',
  previous: 'Trước',
  next: 'Sau',
  year: 'Năm',
  month: 'Tháng',
  week: 'Tuần',
  day: 'Ngày',
  agenda: 'Chương trình',
  date: 'Ngày',
  time: 'Giờ',
  event: 'Sự kiện',
  noEventsInRange: 'Không có sự kiện trong khoảng thời gian này.',
  showMore: (count: number) => `+${count} mục khác`,
};

// Palette pastel cho các block event (theo ảnh bạn gửi)
const EVENT_PASTEL_COLORS = [
  '#fffce3',
  '#b5d1de',
  '#cee1e0',
  '#cad7e6',
  '#fff7e1',
  '#d9e7d6',
  '#c1e2db',
  '#c8e6cf',
  '#b6dce4',
];

function getEventStyle(
  event: CalendarEvent,
  activeEventId: string | number | null,
  calendarView: string,
) {
  const baseColors = EVENT_PASTEL_COLORS;
  // Dùng id hoặc title để chia màu ổn định
  const key = typeof event.id === 'number' ? event.id : String(event.id || event.title || '').length;
  const idx = Math.abs(Number(key)) % baseColors.length;
  const bg = baseColors[idx] || '#cad7e6';
  const isActive = activeEventId != null && String(event.id) === String(activeEventId);
  const isMonth = calendarView === Views.MONTH;

  return {
    style: {
      // Tone màu pastel giống palette
      backgroundColor: bg,
      color: '#0f172a',
      border: '1px solid rgba(148, 163, 184, 0.7)',
      borderRadius: isMonth ? '9999px' : '8px',
      boxShadow: '0 6px 14px rgba(15, 23, 42, 0.08)',
      padding: 0,
      overflow: 'hidden',
      // Khi có nhiều event cùng ngày-cùng giờ, click event nào thì event đó nổi lên trên.
      position: 'relative',
      zIndex: isActive ? 50 : 2,
    },
  };
}

export default function EventCalendar() {
  const [view, setView] = useState<string>(Views.DAY);
  const [date, setDate] = useState(new Date());
  const { events, loading } = useCalendarEvents();
  const [activeEventId, setActiveEventId] = useState<string | number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSession, setDetailSession] = useState<SessionDetail | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const [monthPopoverOpen, setMonthPopoverOpen] = useState(false);
  const [monthPopoverAnchorRect, setMonthPopoverAnchorRect] = useState<DOMRect | null>(null);
  const [monthPopoverEvents, setMonthPopoverEvents] = useState<CalendarEvent[]>([]);
  const [monthPopoverSelectedId, setMonthPopoverSelectedId] = useState<string | number | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const isTeamLeaderArea = location.pathname.startsWith('/tl/');
  const timetablePath = isTeamLeaderArea ? '/tl/timetable' : '/teacher/timetable';
  const assignmentsPath = `${timetablePath}/assignments`;
  const isAssignments = location.pathname.includes('/timetable/assignments');
  const isTimetableRoute = location.pathname.includes('/timetable');

  const { defaultDate, scrollToTime } = useMemo(() => {
    const d = new Date();
    return {
      defaultDate: d,
      scrollToTime: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 8, 0, 0),
    };
  }, []);

  const onNavigate = useCallback((newDate: Date) => setDate(newDate), []);
  const onView = useCallback((newView: string) => setView(newView), []);

  useEffect(() => {
    setMonthPopoverOpen(false);
    setMonthPopoverEvents([]);
    setMonthPopoverSelectedId(null);
    setMonthPopoverAnchorRect(null);

    setDetailOpen(false);
    setDetailSession(null);
    setAnchorRect(null);
  }, [view, date, isTimetableRoute]);

  const formattedRange = useMemo(() => {
    if (view === 'month') {
      return format(date, "MMMM yyyy", { locale: vi });
    }
    if (view === 'week') {
      const start = startOfWeek(date, { weekStartsOn: 1 });
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `Tháng ${start.getMonth() + 1} - Tháng ${end.getMonth() + 1}, ${end.getFullYear()}`;
    }
    if (view === 'day') {
      return `Tháng ${date.getMonth() + 1} - Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
    }
    return format(date, "yyyy", { locale: vi });
  }, [date, view]);

  const customComponents = useMemo(
    () => ({
      toolbar: (props: {
        date: Date;
        view: string;
        onNavigate: (action: string, newDate?: Date) => void;
        onView: (view: string) => void;
        label: string;
      }) => (
        <div className="rbc-custom-toolbar flex flex-wrap items-center justify-between gap-3 bg-white px-3 py-2 rounded-t-xl border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => props.onNavigate('TODAY')}
              className="px-3 py-1.5 rounded-md bg-white border border-gray-200 hover:bg-gray-50 text-xs font-medium text-gray-800"
            >
              Hôm nay
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => props.onNavigate('PREV')}
                className="p-1.5 rounded-md bg-white border border-gray-200 hover:bg-gray-50 text-gray-600"
                aria-label="Trước"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <div className="relative inline-flex items-center justify-center">
                <span className="text-xs text-gray-800 font-medium px-1.5">
                  {formattedRange}
                </span>
                <DatePicker
                  value={dayjs(props.date)}
                  onChange={(d) => {
                    if (!d) return;
                    props.onNavigate('DATE', d.toDate());
                  }}
                  format="DD/MM/YYYY"
                  allowClear={false}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <button
                type="button"
                onClick={() => props.onNavigate('NEXT')}
                className="p-1.5 rounded-md bg-white border border-gray-200 hover:bg-gray-50 text-gray-600"
                aria-label="Sau"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => navigate(timetablePath)}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold border transition-colors ${
                  !isAssignments
                    ? 'bg-sky-50 border-sky-200 text-sky-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
                title="Xem dạng thời khóa biểu"
              >
                <CalendarDays className="w-3 h-3" />
                <span>Thời khóa biểu</span>
              </button>
              <button
                type="button"
                onClick={() => navigate(assignmentsPath)}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold border transition-colors ${
                  isAssignments
                    ? 'bg-sky-50 border-sky-200 text-sky-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
                title="Xem dạng bảng phân công"
              >
                <List className="w-3 h-3" />
                <span>Danh sách</span>
              </button>
            </div>
            <div className="h-4 w-px bg-gray-200" />
            <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-white p-0.5">
              {(['week', 'month', 'day'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => props.onView(v)}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    view === v
                      ? 'bg-gray-100 text-gray-900 border border-gray-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {CALENDAR_MESSAGES[v]}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
      event: ({ event }: { event: CalendarEvent }) => (
        <div className="rbc-event-content h-full flex flex-col">
          <div
            className={`${
              view === Views.MONTH ? 'px-1.5 py-0.5' : 'px-2.5 pt-1.5 pb-1 flex-1'
            } flex flex-col gap-0.5`}
          >
            {view === Views.MONTH ? (
              <div className="flex items-center gap-2 h-full">
                {/* Chấm tròn + 1 dòng thời gian như Google Calendar */}
                <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                <span className="text-[11px] font-semibold text-slate-900 truncate">
                  {dayjs(event.start).format('hA')} ({event.title?.trim() ? event.title : 'Không có tiêu đề'})
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-1">
                  <span className="text-xs font-semibold text-slate-900 truncate">{event.title}</span>
                  {(event.status !== null && event.status !== undefined) && (
                    <span
                      className={`ml-1 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap border ${
                        event.statusClassName || 'bg-amber-100 text-amber-700 border-amber-200'
                      }`}
                    >
                      {event.statusLabel}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-800 leading-tight">
                  {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                </span>
                {event.resource && (
                  <span className="text-[11px] text-slate-600 truncate">{event.resource}</span>
                )}
              </>
            )}
          </div>
        </div>
      ),
      // Khi quá số hàng hiển thị trong 1 ô ngày ở month-view, hiển thị "+N thêm"
      // và mở popup full danh sách phiên.
      month: {
        showMore: (props: any) => {
          const count: number = props?.count ?? 0;
          const dayEvents: CalendarEvent[] = (props?.events ?? props?.remainingEvents ?? []) as CalendarEvent[];
          // Mặc định lịch sẽ cho `events` là toàn bộ sự kiện của ngày.
          // Nếu không có, fallback vào remainingEvents.
          const safeEvents = (Array.isArray(dayEvents) ? dayEvents : []) as CalendarEvent[];
          return (
            <button
              type="button"
              className="rbc-show-more inline-flex items-center justify-center w-full h-full px-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-50 rounded-full"
              onClick={(e) => {
                const target = e.currentTarget as HTMLElement;
                setMonthPopoverAnchorRect(target.getBoundingClientRect());
                setMonthPopoverSelectedId(null);
                setMonthPopoverEvents(safeEvents);
                setMonthPopoverOpen(true);

                setDetailOpen(false);
                setDetailSession(null);
                setAnchorRect(null);
              }}
            >
              +{count} mục khác
            </button>
          );
        },
      },
    }),
    [view, formattedRange, isAssignments, navigate, timetablePath, assignmentsPath, events]
  );

  const handleSelectEvent = async (event: CalendarEvent, e?: React.SyntheticEvent) => {
    setActiveEventId(event.id);
    const idNum = Number(event.id);

    if (!idNum || Number.isNaN(idNum)) {
      // Fallback: giữ behavior cũ nếu không map được sang `sessionId`.
      if (view === Views.MONTH && isTimetableRoute) {
        setMonthPopoverSelectedId(event.id);

        const target = (e?.currentTarget || e?.target) as HTMLElement | undefined;
        if (target?.getBoundingClientRect) setMonthPopoverAnchorRect(target.getBoundingClientRect());

        // Popup danh sách phiên cùng ngày (dùng khi không mở detail theo id).
        const nextEvents = events.filter((ev) => isSameDay(ev.start, event.start));
        setMonthPopoverEvents(nextEvents);
        setMonthPopoverOpen(true);

        setDetailOpen(false);
        setDetailSession(null);
        setAnchorRect(null);
      }
      return;
    }

    // Month-view: bấm vào phiên cụ thể => mở SessionDetailPopover (như ảnh 1).
    setMonthPopoverOpen(false);
    setMonthPopoverEvents([]);
    setMonthPopoverSelectedId(null);
    try {
      const target = (e?.currentTarget || e?.target) as HTMLElement | undefined;
      if (target?.getBoundingClientRect) setAnchorRect(target.getBoundingClientRect());
      const session = await sessionService.getById(idNum);
      setDetailSession(session);
      setDetailOpen(true);
    } catch (err) {
      console.error('fetch session detail error', err);
    }
  };

  const calendarContent = (
    <div
      className="event-calendar-scroll relative flex-1 min-h-0 event-calendar-fixed"
    >
      {loading && (
        <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
          <span className="text-sm text-gray-500">Đang tải lịch...</span>
        </div>
      )}
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={view}
        date={date}
        onNavigate={onNavigate}
        onView={onView}
        onSelectEvent={handleSelectEvent as any}
        defaultDate={defaultDate}
        defaultView="day"
        min={new Date(0, 0, 0, 8, 0, 0)}
        max={new Date(0, 0, 0, 20, 0, 0)}
        scrollToTime={scrollToTime}
        messages={CALENDAR_MESSAGES}
        components={customComponents}
        eventPropGetter={(event: CalendarEvent) => getEventStyle(event, activeEventId, view)}
        showMultiDayTimes
        culture="vi"
        style={{ height: '100%' }}
        maxRows={view === Views.MONTH ? 1 : 999}
        popup={view === Views.MONTH ? false : undefined}
        doShowMoreDrillDown={view === Views.MONTH ? false : undefined}
      />
    </div>
  );

  return (
    <div className="flex flex-col bg-[#f3f4f6] overflow-hidden p-6" style={{ height: 'var(--content-height, 100vh)' }}>
      <div className="bg-white overflow-hidden flex-1 min-h-0 flex flex-col rounded-xl border shadow-sm">
        {calendarContent}
      </div>

      <SessionDetailPopover
        open={detailOpen}
        anchorRect={anchorRect}
        onClose={() => {
          setDetailOpen(false);
          setDetailSession(null);
          setAnchorRect(null);
        }}
        session={detailSession}
      />

      <MonthDayEventsPopover
        open={monthPopoverOpen}
        anchorRect={monthPopoverAnchorRect}
        events={monthPopoverEvents}
        selectedId={monthPopoverSelectedId}
        onClose={() => {
          setMonthPopoverOpen(false);
          setMonthPopoverEvents([]);
          setMonthPopoverSelectedId(null);
          setMonthPopoverAnchorRect(null);
        }}
        onSelect={async (id: string | number) => {
          setMonthPopoverSelectedId(id);
          setActiveEventId(id);

          const idNum = Number(id);
          if (!idNum || Number.isNaN(idNum)) return;

          try {
            // Dùng anchor của popover list để đặt popover detail.
            if (monthPopoverAnchorRect) setAnchorRect(monthPopoverAnchorRect);
            const session = await sessionService.getById(idNum);
            setDetailSession(session);
            setDetailOpen(true);

            setMonthPopoverOpen(false);
            setMonthPopoverEvents([]);
          } catch (err) {
            console.error('fetch session detail from month list error', err);
          }
        }}
      />
    </div>
  );
}
