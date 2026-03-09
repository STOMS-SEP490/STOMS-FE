import { useCallback, useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import { vi } from 'date-fns/locale';
import type { CalendarEvent } from '@/modules/event/event';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './EventCalendar.css';

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

function getEventStyle(_event: CalendarEvent) {
  return {
    style: {
      backgroundColor: '#ffffff',
      color: '#1f2937',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
    },
  };
}

const mockEvents: CalendarEvent[] = [
  {
    id: 1,
    title: 'Chương trình...',
    start: new Date(2026, 0, 26, 9, 0),
    end: new Date(2026, 0, 26, 10, 0),
    resource: 'THPT Lê Quý Đôn - Quyết Thắng',
  },
  {
    id: 2,
    title: 'Chương trình...',
    start: new Date(2026, 0, 27, 9, 0),
    end: new Date(2026, 0, 27, 10, 0),
    resource: 'THPT Lê Quý Đôn',
  },
  {
    id: 3,
    title: 'Chương trình...',
    start: new Date(2026, 0, 27, 9, 0),
    end: new Date(2026, 0, 27, 12, 0),
    resource: 'THPT Lê Quý Đôn',
  },
  {
    id: 4,
    title: 'Chương trình...',
    start: new Date(2026, 0, 27, 9, 0),
    end: new Date(2026, 0, 27, 10, 0),
    resource: 'THPT Lê Quý Đôn - Quyết Thắng',
  },
  {
    id: 5,
    title: 'Chương trình...',
    start: new Date(2026, 0, 28, 8, 0),
    end: new Date(2026, 0, 28, 11, 0),
    resource: 'THPT Lê Quý Đôn - Quyết Thắng',
  },
  {
    id: 6,
    title: 'The Universe Through A Child S Eyes',
    start: new Date(2026, 1, 1, 11, 0),
    end: new Date(2026, 1, 1, 14, 0),
  },
  {
    id: 7,
    title: 'Choosing A Quality Cookware Set',
    start: new Date(2026, 1, 1, 11, 0),
    end: new Date(2026, 1, 1, 14, 0),
  },
];

export default function EventCalendar() {
  const [view, setView] = useState<View>('day');
  const [date, setDate] = useState(new Date());

  const { defaultDate, scrollToTime } = useMemo(() => {
    const d = new Date();
    return {
      defaultDate: d,
      scrollToTime: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 8, 0, 0),
    };
  }, []);

  const onNavigate = useCallback((newDate: Date) => setDate(newDate), []);
  const onView = useCallback((newView: View) => setView(newView), []);

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
        view: View;
        onNavigate: (action: string) => void;
        onView: (view: View) => void;
        label: string;
      }) => (
        <div className="rbc-custom-toolbar flex flex-wrap items-center justify-between gap-4 bg-white px-4 py-3 rounded-t-xl border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => props.onNavigate('TODAY')}
              className="px-4 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-800"
            >
              Hôm nay
            </button>
          </div>
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
            <span className="min-w-[220px] text-center text-sm font-medium text-gray-800">
              {formattedRange}
            </span>
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
      event: (props: { event: CalendarEvent }) => (
        <div className="rbc-event-content flex flex-col">
          <span className="font-medium truncate">{props.event.title}</span>
          <span className="text-xs opacity-90">
            {format(props.event.start, 'HH:mm')} - {format(props.event.end, 'HH:mm')}
          </span>
          {props.event.resource && (
            <span className="text-xs opacity-80 truncate">{props.event.resource}</span>
          )}
        </div>
      ),
    }),
    [view, formattedRange]
  );

  return (
    <div className="p-6 bg-white">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Calendar
          localizer={localizer}
          events={mockEvents}
          startAccessor="start"
          endAccessor="end"
          view={view}
          date={date}
          onNavigate={onNavigate}
          onView={onView}
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
    </div>
  );
}
