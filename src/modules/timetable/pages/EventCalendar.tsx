import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import viLocale from '@fullcalendar/core/locales/vi';
import type { EventContentArg, EventClickArg, EventApi } from '@fullcalendar/core';
import type { CalendarEvent } from '@/modules/event/event';
import dayjs from 'dayjs';
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  MapPin,
} from 'lucide-react';
import './EventCalendar.css'; 
import {
  useCalendarEvents,
  type TeamLeaderTimetableScope,
} from '@/modules/event/hooks/useCalendarEvents';
import sessionService from '@/modules/request/api/sessionApi';
import type { SessionDetail } from '@/modules/request/type.ts';
import SessionDetailPopover from './SessionDetailPopover';
import MonthDayEventsPopover from './MonthDayEventsPopover';
import { toneForEventId } from '@/modules/event/utils/eventCalendarCardTones';
import { resolveMonthDotColor } from '@/modules/event/utils/monthDotColor';
import { sessionDetailToTimetableRow } from '@/modules/event/utils/sessionDetailToTimetableRow';
import { useTeamLeaderAttendancePanel } from '@/modules/contract/hooks/useTeamLeaderAttendancePanel';
import TeamLeaderAttendanceSlideOver from '@/modules/contract/components/TeamLeaderAttendanceSlideOver';
import {
  useTeacherUpcomingAssignedSessions,
  type TeacherUpcomingScheduleCard,
} from '@/modules/event/hooks/useTeacherUpcomingAssignedSessions';
import ReportBusyModal from './ReportBusyModal';
import {
  canReportBusyForSessionStart,
  REPORT_BUSY_TOO_SOON_VI,
} from '@/modules/event/utils/reportBusyEligibility';
import { Tooltip } from 'antd';

/** Lấy SessionId số để gọi API — id lịch có thể là number hoặc chuỗi số từ FullCalendar. */
function parseSessionIdFromCalendar(raw: string | number | undefined | null): number | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return Math.trunc(raw);
  const s = String(raw).trim();
  const n = Number(s);
  if (Number.isFinite(n) && n > 0) return Math.trunc(n);
  const lead = s.match(/^(\d+)/);
  if (lead) {
    const x = Number(lead[1]);
    if (Number.isFinite(x) && x > 0) return x;
  }
  return null;
}

/** Cột “Lịch sắp tới” dòng 1: tên request (ưu tiên requestName → requestCode → title). */
function upcomingAsideRequestLine(ev: CalendarEvent): string {
  const rn = (ev.requestName ?? '').trim();
  const rc = (ev.requestCode ?? '').trim();
  const title = (ev.title ?? '').trim();
  return rn || rc || title || '—';
}

/** Dòng 2: tên buổi (sessionTitle) · Buổi n — cùng ý với SessionDetailPopover. */
function upcomingAsideSessionLine(ev: CalendarEvent): string {
  const topic = (ev.sessionTitle ?? '').trim();
  const sessionNo = ev.sessionNo != null ? String(ev.sessionNo) : '—';
  if (topic) return `${topic} · Buổi ${sessionNo}`;
  return `Buổi ${sessionNo}`;
}

function renderEventContent(arg: EventContentArg) {
  const extended = arg.event.extendedProps as CalendarEvent;
  const viewType = arg.view.type;

  // Month view: render thẻ gọn giống Google Calendar
  if (viewType === 'dayGridMonth') {
    const title = (arg.event.title ?? '').trim() || 'Không có tiêu đề';
    const startText = arg.event.start ? dayjs(arg.event.start).format('HH:mm') : '';
    const endText = arg.event.end ? dayjs(arg.event.end).format('HH:mm') : '';
    const timePrefix = startText && endText ? `${startText} - ${endText}: ` : '';
    const dotBg = resolveMonthDotColor(extended.status, arg.event.start, arg.event.end);

    return (
      <div className="fc-event-inner fc-event-inner--month">
        <span className="fc-event-month-dot" aria-hidden style={{ backgroundColor: dotBg }} />
        <span className="fc-event-month-text">{`${timePrefix}${title}`}</span>
      </div>
    );
  }

  const start = arg.timeText;
  const timeDotBg = resolveMonthDotColor(extended.status, arg.event.start, arg.event.end);

  return (
    <div className="fc-event-inner">
      <div className="fc-event-main-line">
        <span className="fc-event-month-dot" aria-hidden style={{ backgroundColor: timeDotBg }} />
        <span className="fc-event-time">{start}</span>
      </div>
      <div className="fc-event-title-line">
        <span className="fc-event-title">{arg.event.title}</span>
      </div>
      {extended.resource ? (
        <div className="fc-event-resource">{extended.resource}</div>
      ) : null}
    </div>
  );
}

export default function EventCalendar() {
  const location = useLocation();
  const isTlTimetable = location.pathname.startsWith('/tl/timetable');
  const calendarRef = useRef<FullCalendar | null>(null);
  const calendarContainerRef = useRef<HTMLDivElement | null>(null);
  /** Cột trái chứa lịch — width thay đổi khi mở/đóng “Lịch sắp tới”; ResizeObserver phải bắt ở đây, không phải wrapper ngoài. */
  const calendarMainRef = useRef<HTMLDivElement | null>(null);
  const upcomingAsideRef = useRef<HTMLElement | null>(null);
  const [calendarRefreshNonce, setCalendarRefreshNonce] = useState(0);
  const [tlTimetableScope, setTlTimetableScope] = useState<TeamLeaderTimetableScope>('team');
  const { events, loading } = useCalendarEvents(
    calendarRefreshNonce,
    isTlTimetable ? tlTimetableScope : 'team',
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSession, setDetailSession] = useState<SessionDetail | null>(null);
  const [detailEventMeta, setDetailEventMeta] = useState<Partial<CalendarEvent> | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const [monthMoreOpen, setMonthMoreOpen] = useState(false);
  const [monthMoreDay, setMonthMoreDay] = useState<Date>(() => new Date());
  const [monthMoreEvents, setMonthMoreEvents] = useState<CalendarEvent[]>([]);
  const [monthMoreAnchor, setMonthMoreAnchor] = useState<DOMRect | null>(null);

  const {
    actionMode,
    setActionMode,
    switchActionMode,
    activeSession,
    sessionDetail: attendanceSessionDetail,
    attendanceItems,
    membersById,
    attendanceByMemberIdForSession,
    memberSearch,
    setMemberSearch,
    memberNotes,
    setMemberNotes,
    selectedMemberIds,
    setSelectedMemberIds,
    isSubmitting,
    setIsSubmitting,
    openPanel,
    closePanel,
    saveAttendance,
    refreshAttendanceItems,
  } = useTeamLeaderAttendancePanel({});

  const handleOpenAttendanceFromPopover = useCallback(() => {
    if (!detailSession) return;
    void openPanel(sessionDetailToTimetableRow(detailSession), 'checkin');
    setDetailOpen(false);
    setDetailSession(null);
    setAnchorRect(null);
  }, [detailSession, openPanel]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [currentView, setCurrentView] = useState<'timeGridDay' | 'timeGridWeek' | 'dayGridMonth'>('timeGridWeek');
  // Cột "Lịch sắp tới" mặc định đóng lại.
  const [isUpcomingCollapsed, setIsUpcomingCollapsed] = useState(true);

  const headerLabel = useMemo(() => {
    if (currentView === 'timeGridDay') {
      return dayjs(currentDate).format('dddd, DD/MM/YYYY');
    }
    if (currentView === 'dayGridMonth') {
      return `Tháng ${dayjs(currentDate).format('M')} / ${dayjs(currentDate).format('YYYY')}`;
    }
    const weekStart = dayjs(currentDate).startOf('week').add(1, 'day');
    const weekEnd = weekStart.add(6, 'day');
    return `${weekStart.format('DD/MM')} - ${weekEnd.format('DD/MM/YYYY')}`;
  }, [currentDate, currentView]);

  const fcEvents = useMemo(
    () =>
      events.map((e) => ({
        id: String(e.id),
        title: e.title,
        start: e.start,
        end: e.end,
        extendedProps: {
          sessionTitle: e.sessionTitle,
          requestCode: e.requestCode,
          requestName: e.requestName,
          sessionNo: e.sessionNo,
          resource: e.resource,
          color: e.color,
          requestKind: e.requestKind,
          status: e.status,
        },
      })),
    [events],
  );

  const upcomingSessions = useMemo(() => {
    const now = Date.now();
    return [...events]
      .filter((ev) => {
        const endMs = new Date(ev.end).getTime();
        return Number.isFinite(endMs) && endMs >= now;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 8)
      .map((ev) => {
        const startMs = new Date(ev.start).getTime();
        const endMs = new Date(ev.end).getTime();
        const isOngoing = now >= startMs && now <= endMs;
        return {
          ...ev,
          isOngoing,
          isUpcoming: startMs > now,
        };
      });
  }, [events]);

  const {
    cards: teacherUpcomingCards,
    loading: teacherUpcomingLoading,
    isTeacherTimetable,
  } = useTeacherUpcomingAssignedSessions(calendarRefreshNonce, {
    teamLeaderPersonal: isTlTimetable && tlTimetableScope === 'personal',
  });

  const [reportBusyCard, setReportBusyCard] = useState<TeacherUpcomingScheduleCard | null>(null);

  const closeMonthMore = useCallback(() => {
    setMonthMoreOpen(false);
    setMonthMoreAnchor(null);
    setMonthMoreEvents([]);
  }, []);

  const openSessionFromId = useCallback(async (idNum: number, rect: DOMRect | null) => {
    if (idNum <= 0 || !Number.isFinite(idNum)) return;
    try {
      setAnchorRect(rect);
      const session = await sessionService.getById(idNum);
      setDetailSession(session);
      setDetailOpen(true);
    } catch (err) {
      console.error('fetch session detail error', err);
    }
  }, []);

  const handleEventClick = async (clickInfo: EventClickArg) => {
    clickInfo.jsEvent.preventDefault();
    const event: EventApi = clickInfo.event;
    const idNum = parseSessionIdFromCalendar(event.id);
    if (idNum == null) return;
    const rect = (clickInfo.el as HTMLElement).getBoundingClientRect();
    const ext = event.extendedProps as Partial<CalendarEvent>;
    setDetailEventMeta({
      title: event.title,
      sessionTitle: ext.sessionTitle,
      requestCode: ext.requestCode,
      requestName: ext.requestName,
      sessionNo: ext.sessionNo,
    });
    await openSessionFromId(idNum, rect);
  };

  /** Runtime: return `true` chặn popover mặc định của FullCalendar — type FC không gồm boolean. */
  const handleMoreLinkClick = useCallback((arg: { date: Date; allSegs: { event: EventApi }[]; jsEvent: UIEvent }) => {
      const target = arg.jsEvent.target;
      const el = target instanceof Element ? target : null;
      const link = el?.closest('.fc-more-link') ?? el;
      const rect = (link instanceof HTMLElement ? link : null)?.getBoundingClientRect() ?? new DOMRect();

      const seen = new Set<string>();
      const list: CalendarEvent[] = [];
      for (const seg of arg.allSegs) {
        const e = seg.event;
        const id = String(e.id);
        if (seen.has(id)) continue;
        seen.add(id);
        const start = e.start;
        const end = e.end;
        if (!start || !end) continue;
        const ext = e.extendedProps as Partial<CalendarEvent>;
        list.push({
          id: e.id,
          title: (e.title ?? '').trim() || 'Không có tiêu đề',
          start,
          end,
          sessionTitle: ext.sessionTitle,
          requestCode: ext.requestCode,
          requestName: ext.requestName,
          sessionNo: ext.sessionNo ?? null,
          resource: ext.resource,
          color: ext.color,
          requestKind: ext.requestKind,
          status: ext.status,
          statusLabel: ext.statusLabel,
          statusClassName: ext.statusClassName,
        });
      }
      list.sort((a, b) => a.start.getTime() - b.start.getTime());

      setMonthMoreDay(arg.date);
      setMonthMoreEvents(list);
      setMonthMoreAnchor(rect);
      setMonthMoreOpen(true);
      return true;
    },
    [],
  );

  const handleEventDidMount = (info: { event: EventApi; el: HTMLElement }) => {
    const { bg, border } = toneForEventId(info.event.id);
    const api = calendarRef.current?.getApi();
    const isMonth = api?.view?.type === 'dayGridMonth';
    // Month view uses CSS alternating colors (avoid inline bg override)
    if (!isMonth) {
      info.el.style.backgroundColor = bg;
    } else {
      info.el.style.removeProperty('background-color');
    }
    info.el.style.borderRadius = isMonth ? '6px' : '8px';
    info.el.style.border = `1px solid ${border}`;
    // Bỏ shadow để chữ/nền ít bị “nhoè”, thẻ rõ hơn.
    info.el.style.boxShadow = 'none';
    info.el.style.color = '#0f172a';
  };

  const handleMove = (direction: 'prev' | 'next' | 'today') => {
    closeMonthMore();
    const api = calendarRef.current?.getApi();
    if (!api) return;
    if (direction === 'prev') api.prev();
    if (direction === 'next') api.next();
    if (direction === 'today') api.today();
    setCurrentDate(api.getDate());
  };

  const handleViewChange = (view: 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth') => {
    closeMonthMore();
    const api = calendarRef.current?.getApi();
    if (!api) return;
    api.changeView(view);
    setCurrentView(view);
    setCurrentDate(api.getDate());
  };

  useEffect(() => {
    if (currentView !== 'dayGridMonth') closeMonthMore();
  }, [currentView, closeMonthMore]);

  useEffect(() => {
    const main = calendarMainRef.current;
    if (!main) return;

    /** FullCalendar updateSize() rất tốn layout; ResizeObserver có thể bắn liên tục khi aside đang animate → giật. Chỉ tối đa ~25 lần/giây; transitionend sẽ khóa layout lần cuối. */
    const GAP_MS = 40;
    let lastRun = 0;
    let rafId: number | null = null;

    const runUpdateSize = () => {
      rafId = null;
      lastRun = performance.now();
      calendarRef.current?.getApi()?.updateSize();
    };

    const observer = new ResizeObserver(() => {
      const now = performance.now();
      if (now - lastRun < GAP_MS) return;
      if (rafId != null) return;
      rafId = requestAnimationFrame(runUpdateSize);
    });

    observer.observe(main);
    return () => {
      observer.disconnect();
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    const aside = upcomingAsideRef.current;
    if (!aside) return;

    const onAsideTransitionEnd = (e: TransitionEvent) => {
      if (e.target !== aside) return;
      if (!['width', 'min-width', 'max-width', 'padding'].includes(e.propertyName)) return;
      calendarRef.current?.getApi()?.updateSize();
    };

    aside.addEventListener('transitionend', onAsideTransitionEnd);
    return () => aside.removeEventListener('transitionend', onAsideTransitionEnd);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      calendarRef.current?.getApi()?.updateSize();
    });
    return () => cancelAnimationFrame(id);
  }, [isUpcomingCollapsed]);

  const calendarContent = (
    <div className="event-calendar-scroll relative flex-1 min-h-0">
      {loading && (
        <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
          <span className="text-sm text-gray-500">Đang tải lịch...</span>
        </div>
      )}
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={false}
        locales={[viLocale]}
        locale="vi"
        slotMinTime="06:00:00"
        slotMaxTime="23:00:00"
        slotDuration="00:30:00"
        slotLabelInterval="01:00:00"
        slotLabelFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }}
        allDaySlot={false}
        height="100%"
        events={fcEvents}
        datesSet={(arg) => {
          const nextDate = arg.view.currentStart;
          const nextView = arg.view.type as 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth';
          setCurrentDate((prev) => (prev.getTime() === nextDate.getTime() ? prev : nextDate));
          setCurrentView((prev) => (prev === nextView ? prev : nextView));
        }}
        eventContent={renderEventContent}
        eventClick={handleEventClick}
        eventDidMount={handleEventDidMount}
        dayMaxEvents={3}
        dayMaxEventRows={3}
        fixedWeekCount
        moreLinkClassNames="stoms-fc-more-link"
        moreLinkContent={(arg) => <span className="stoms-fc-more-link__text">+{arg.num} mục</span>}
        moreLinkClick={handleMoreLinkClick as any}
        expandRows={currentView === 'dayGridMonth'}
        nowIndicator
      />
    </div>
  );

  return (
    <div
      ref={calendarContainerRef}
      className="event-calendar-page flex flex-col bg-[#f3f4f6] overflow-hidden p-3 md:p-4"
      style={{ height: 'var(--content-height, 100vh)' }}
    >
      <div className="relative flex flex-1 min-h-0 gap-4">
        <div
          ref={calendarMainRef}
          className="min-w-0 flex-1 bg-white overflow-hidden flex flex-col rounded-2xl border border-slate-200 shadow-[0_14px_35px_rgba(15,23,42,0.08)]"
        >
          <div className="calendar-toolbar px-4 py-3 border-b border-slate-200">
            <div className="calendar-toolbar-cluster calendar-toolbar-cluster--start">
              <button type="button" onClick={() => handleMove('today')} className="calendar-subtle-btn">
                Hôm nay
              </button>
              {isTlTimetable ? (
                <div className="calendar-segmented">
                  <button
                    type="button"
                    onClick={() => setTlTimetableScope('team')}
                    className={`calendar-segment-btn ${tlTimetableScope === 'team' ? 'active' : ''}`}
                  >
                     Lịch cả nhóm
                  </button>
                  <button
                    type="button"
                    onClick={() => setTlTimetableScope('personal')}
                    className={`calendar-segment-btn ${tlTimetableScope === 'personal' ? 'active' : ''}`}
                  >
                    Lịch của tôi
                  </button>
                </div>
              ) : null}
            </div>
            <div className="calendar-toolbar-cluster calendar-toolbar-cluster--center">
              <div className="calendar-nav-pill">
                <button
                  type="button"
                  onClick={() => handleMove('prev')}
                  className="calendar-nav-arrow-btn"
                  aria-label="Trước"
                >
                  <ArrowLeft className="h-5 w-5" aria-hidden strokeWidth={2.25} />
                </button>
                <span className="calendar-range">{headerLabel}</span>
                <button
                  type="button"
                  onClick={() => handleMove('next')}
                  className="calendar-nav-arrow-btn"
                  aria-label="Sau"
                >
                  <ArrowRight className="h-5 w-5" aria-hidden strokeWidth={2.25} />
                </button>
              </div>
            </div>
            <div className="calendar-toolbar-cluster calendar-toolbar-cluster--end">
              <div className="calendar-segmented">
                <button
                  type="button"
                  onClick={() => handleViewChange('dayGridMonth')}
                  className={`calendar-segment-btn ${currentView === 'dayGridMonth' ? 'active' : ''}`}
                >
                  Tháng
                </button>
                <button
                  type="button"
                  onClick={() => handleViewChange('timeGridWeek')}
                  className={`calendar-segment-btn ${currentView === 'timeGridWeek' ? 'active' : ''}`}
                >
                  Tuần
                </button>
                <button
                  type="button"
                  onClick={() => handleViewChange('timeGridDay')}
                  className={`calendar-segment-btn ${currentView === 'timeGridDay' ? 'active' : ''}`}
                >
                  Ngày
                </button>
              </div>
              {isUpcomingCollapsed && (
                <button
                  type="button"
                  onClick={() => setIsUpcomingCollapsed(false)}
                  className="calendar-upcoming-toggle-btn hidden lg:inline-flex"
                  aria-label="Mở rộng cột lịch sắp tới"
                  title="Mở rộng cột lịch sắp tới"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Lịch sắp tới</span>
                </button>
              )}
            </div>
          </div>
          {calendarContent}
        </div>

        <aside
          ref={upcomingAsideRef}
          className={`calendar-upcoming-aside hidden lg:flex lg:shrink-0 flex-col rounded-2xl bg-white ease-in-out ${
            isUpcomingCollapsed
              ? 'w-0 min-w-0 max-w-0 border-transparent p-0 opacity-0 pointer-events-none overflow-hidden shadow-none'
              : 'w-[340px] border border-slate-200 p-4 opacity-100 shadow-[0_14px_35px_rgba(15,23,42,0.08)] overflow-x-hidden'
          }`}
          aria-hidden={isUpcomingCollapsed}
          inert={isUpcomingCollapsed ? true : undefined}
        >
            <div className="mb-3 flex w-full min-w-0 items-center justify-between">
              <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-sky-700" />
              <h3 className="text-sm font-semibold text-slate-900">Lịch sắp tới</h3>
              </div>
              <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                {isTeacherTimetable ? teacherUpcomingCards.length : upcomingSessions.length}
              </span>
              <button
                type="button"
                onClick={() => setIsUpcomingCollapsed(true)}
                className="calendar-segment-btn active shrink-0"
                aria-label="Ẩn cột lịch sắp tới"
                title="Ẩn cột lịch sắp tới"
              >
                <ChevronRight className="w-3 h-3 shrink-0" aria-hidden />
                <span>Ẩn</span>
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1">
              {isTeacherTimetable && teacherUpcomingLoading && teacherUpcomingCards.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-center text-xs text-slate-500">
                  Đang tải phiên sắp tới…
                </div>
              ) : isTeacherTimetable && teacherUpcomingCards.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-center text-xs text-slate-500">
                  Không có phiên sắp tới.
                </div>
              ) : isTeacherTimetable ? (
                teacherUpcomingCards.map((session) => {
                  const canReportBusy = canReportBusyForSessionStart(session.start);
                  return (
                  <div
                    key={session.sessionId}
                    className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-[box-shadow,border-color] hover:border-slate-300 hover:shadow-[0_4px_14px_rgba(15,23,42,0.08)]"
                  >
                    <div
                      aria-hidden
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: session.isOngoing ? '#22C55E55' : '#2197C055' }}
                    />
                    {/* Lớp bấm xem chi tiết — tránh button lồng button; Báo bận dùng pointer-events-auto */}
                    <button
                      type="button"
                      className="absolute inset-0 z-0 rounded-xl"
                      aria-label={`Xem chi tiết: ${session.requestLine}`}
                      onClick={(e) => {
                        setDetailEventMeta(session.popoverMeta);
                        void openSessionFromId(session.sessionId, e.currentTarget.getBoundingClientRect());
                      }}
                    />
                    <div className="relative z-10 space-y-2 pl-0.5 pointer-events-none">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold tracking-tight text-slate-900">
                          {session.requestLine}
                        </div>
                        <div className="mt-0.5 text-[11px] leading-snug text-slate-500 line-clamp-2">
                          {session.sessionLine}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[11px] text-slate-600">
                          <span className="flex h-4 w-3.5 shrink-0 items-center justify-center text-slate-400">
                            <CalendarClock className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
                          </span>
                          <span className="min-w-0 leading-tight">
                            {dayjs(session.start).format('DD/MM/YYYY')} • {dayjs(session.start).format('HH:mm')} —{' '}
                            {dayjs(session.end).format('HH:mm')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="flex h-4 w-3.5 shrink-0 items-center justify-center text-slate-400">
                            <MapPin className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[11px] leading-tight text-slate-500">
                            {session.resource}
                          </span>
                          {canReportBusy ? (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setReportBusyCard(session);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setReportBusyCard(session);
                                }
                              }}
                              className="pointer-events-auto inline-flex shrink-0 cursor-pointer select-none items-center gap-0.5 text-[10px] font-semibold text-red-900 hover:text-red-950 hover:underline underline-offset-2"
                            >
                              <CircleAlert className="h-3 w-3 shrink-0" aria-hidden strokeWidth={2.5} />
                              Báo bận
                            </span>
                          ) : (
                            <Tooltip title={REPORT_BUSY_TOO_SOON_VI} placement="topLeft" trigger={['hover', 'click']}>
                              <span
                                role="button"
                                tabIndex={-1}
                                aria-disabled
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                className="pointer-events-auto inline-flex shrink-0 cursor-not-allowed select-none items-center gap-0.5 text-[10px] font-semibold text-slate-400"
                              >
                                <CircleAlert className="h-3 w-3 shrink-0 opacity-70" aria-hidden strokeWidth={2.5} />
                                Báo bận
                              </span>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })
              ) : upcomingSessions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-center text-xs text-slate-500">
                  Không có phiên sắp tới.
                </div>
              ) : (
                upcomingSessions.map((session) => (
                  <div
                    key={String(session.id)}
                    className="rounded-xl border border-slate-200 p-3 transition relative overflow-hidden bg-white hover:border-slate-300 hover:shadow-sm"
                  >
                    <div
                      aria-hidden
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: session.isOngoing ? '#22C55E55' : '#2197C055' }}
                    />

                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {upcomingAsideRequestLine(session)}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500 leading-snug break-words line-clamp-2">
                          {upcomingAsideSessionLine(session)}
                        </div>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                          session.isOngoing
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-sky-200 bg-sky-50 text-sky-700'
                        }`}
                      >
                        {session.isOngoing ? 'Đang diễn ra' : 'Sắp tới'}
                      </span>
                    </div>

                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {dayjs(session.start).format('DD/MM/YYYY')} • {dayjs(session.start).format('HH:mm')} -{' '}
                          {dayjs(session.end).format('HH:mm')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{session.resource || 'Chưa có địa điểm'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
        </aside>
      </div>

      <MonthDayEventsPopover
        open={monthMoreOpen}
        anchorRect={monthMoreAnchor}
        day={monthMoreDay}
        events={monthMoreEvents}
        onClose={closeMonthMore}
        onPickEvent={async (ev: CalendarEvent) => {
          const idNum = parseSessionIdFromCalendar(ev.id);
          if (idNum == null) return;
          closeMonthMore();
          setDetailEventMeta({
            title: ev.title,
            sessionTitle: ev.sessionTitle,
            requestCode: ev.requestCode,
            requestName: ev.requestName,
            sessionNo: ev.sessionNo,
          });
          await openSessionFromId(idNum, null);
        }}
      />

      <SessionDetailPopover
        open={detailOpen}
        anchorRect={anchorRect}
        onClose={() => {
          setDetailOpen(false);
          setDetailSession(null);
          setDetailEventMeta(null);
          setAnchorRect(null);
        }}
        session={detailSession}
        eventMeta={detailEventMeta}
        onOpenAttendancePanel={handleOpenAttendanceFromPopover}
      />

      <ReportBusyModal
        open={reportBusyCard != null}
        onClose={() => setReportBusyCard(null)}
        sessionId={reportBusyCard?.sessionId ?? 0}
        sessionPreview={reportBusyCard}
        onSuccess={() => setCalendarRefreshNonce((n) => n + 1)}
      />

      <TeamLeaderAttendanceSlideOver
        actionMode={actionMode}
        activeSession={activeSession}
        sessionDetail={attendanceSessionDetail}
        attendanceItems={attendanceItems}
        membersById={membersById}
        attendanceByMemberIdForSession={attendanceByMemberIdForSession}
        memberSearch={memberSearch}
        setMemberSearch={setMemberSearch}
        memberNotes={memberNotes}
        setMemberNotes={setMemberNotes}
        selectedMemberIds={selectedMemberIds}
        setSelectedMemberIds={setSelectedMemberIds}
        isSubmitting={isSubmitting}
        setIsSubmitting={setIsSubmitting}
        setActionMode={setActionMode}
        switchActionMode={switchActionMode}
        closePanel={closePanel}
        saveAttendance={saveAttendance}
        refreshAttendanceItems={refreshAttendanceItems}
        overlayZClass="z-[85]"
      />
    </div>
  );
}
