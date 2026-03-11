import { useCallback, useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import type { CalendarEvent } from '@/modules/event/event';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './EventCalendar.css';
import { useCalendarEvents } from '@/modules/event/hooks/useCalendarEvents';
import { sessionApi, type SessionDetail } from '@/modules/request/api/sessionApi';
import SessionDetailPopover from './SessionDetailPopover';

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
  showMore: (count: number) => `+${count} thêm`,
};

function getEventStyle(event: CalendarEvent) {
  const color = event.color || '#22c55e';
  return {
    style: {
      backgroundColor: `${color}1a`,
      color: '#111827',
      border: `1px solid ${color}`,
      borderRadius: '12px',
      boxShadow: '0 4px 10px rgba(15, 23, 42, 0.06)',
      padding: 0,
      overflow: 'hidden',
    },
  };
}

export default function EventCalendar() {
  const [view, setView] = useState<string>(Views.DAY);
  const [date, setDate] = useState(new Date());
  const { events, loading } = useCalendarEvents();
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSession, setDetailSession] = useState<SessionDetail | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const { defaultDate, scrollToTime } = useMemo(() => {
    const d = new Date();
    return {
      defaultDate: d,
      scrollToTime: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 8, 0, 0),
    };
  }, []);

  const onNavigate = useCallback((newDate: Date) => setDate(newDate), []);
  const onView = useCallback((newView: string) => setView(newView), []);

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
        <div className="rbc-custom-toolbar flex flex-wrap items-center justify-between gap-4 bg-white px-4 py-3 rounded-t-xl border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => props.onNavigate('TODAY')}
              className="px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-800"
            >
              Hôm nay
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => props.onNavigate('PREV')}
                className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-600"
                aria-label="Trước"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <div className="relative inline-flex items-center justify-center">
                <span className="text-sm text-gray-800 font-medium px-2">
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
                className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-600"
                aria-label="Sau"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
            {(['year', 'week', 'month', 'day'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => props.onView(v)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
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
      ),
      event: (props: { event: CalendarEvent }) => {
        return (
          <div className="rbc-event-content h-full flex flex-col">
            <div className="px-2.5 pt-1.5 pb-1 flex-1 flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-gray-900 truncate">
                {props.event.title}
              </span>
              <span className="text-[11px] text-gray-700">
                {format(props.event.start, 'HH:mm')} - {format(props.event.end, 'HH:mm')}
              </span>
              {props.event.resource && (
                <span className="text-[11px] text-gray-500 truncate">
                  {props.event.resource}
                </span>
              )}
            </div>
          </div>
        );
      },
    }),
    [view, formattedRange]
  );

  const handleSelectEvent = async (event: CalendarEvent, e?: React.SyntheticEvent) => {
    const idNum = Number(event.id);
    if (!idNum || Number.isNaN(idNum)) return;
    try {
      const target = (e?.currentTarget || e?.target) as HTMLElement | undefined;
      if (target?.getBoundingClientRect) setAnchorRect(target.getBoundingClientRect());
      const session = await sessionApi.getById(idNum);
      setDetailSession(session);
      setDetailOpen(true);
    } catch (err) {
      console.error('fetch session detail error', err);
    }
  };

  return (
    <div className="p-6 bg-[#f3f4f6]">
      <div className="bg-white px-6 py-4 mb-4 rounded-xl border shadow-sm flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-gray-900">Theo dõi lịch trình</h2>
        <p className="text-xs text-gray-500">
          Theo dõi các tất cả các phiên trong lịch trình.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
          eventPropGetter={getEventStyle}
          showMultiDayTimes
          culture="vi"
          style={{ height: 640 }}
        />
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
    </div>
  );
}
