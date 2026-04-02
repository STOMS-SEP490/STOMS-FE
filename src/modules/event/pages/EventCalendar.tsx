import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import viLocale from '@fullcalendar/core/locales/vi';
import type { EventContentArg, EventClickArg, EventApi } from '@fullcalendar/core';
import type { CalendarEvent } from '@/modules/event/event';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './EventCalendar.css';
import { useCalendarEvents } from '@/modules/event/hooks/useCalendarEvents';
import sessionService from '@/modules/request/api/sessionApi';
import type { SessionDetail } from '@/modules/request/type.ts';
import SessionDetailPopover from './SessionDetailPopover';
import { useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, List } from 'lucide-react';
import { backgroundToneForEventId } from '@/modules/event/utils/eventCalendarCardTones';
import { sessionDetailToTimetableRow } from '@/modules/event/utils/sessionDetailToTimetableRow';
import { useTeamLeaderAttendancePanel } from '@/modules/contract/hooks/useTeamLeaderAttendancePanel';
import TeamLeaderAttendanceSlideOver from '@/modules/contract/components/TeamLeaderAttendanceSlideOver';

function renderEventContent(arg: EventContentArg) {
  const extended = arg.event.extendedProps as CalendarEvent;
  const viewType = arg.view.type;

  // Month view: render thẻ gọn giống Google Calendar
  if (viewType === 'dayGridMonth') {
    const title = (arg.event.title ?? '').trim() || 'Không có tiêu đề';
    const startText = arg.event.start ? dayjs(arg.event.start).format('HH:mm') : '';
    const endText = arg.event.end ? dayjs(arg.event.end).format('HH:mm') : '';
    const timePrefix = startText && endText ? `${startText} - ${endText}: ` : '';

    return (
      <div className="fc-event-inner fc-event-inner--month">
        <span className="fc-event-month-dot" aria-hidden />
        <span className="fc-event-month-text">{`${timePrefix}${title}`}</span>
      </div>
    );
  }

  const start = arg.timeText;

  return (
    <div className="fc-event-inner">
      <div className="fc-event-main-line">
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
  const calendarRef = useRef<FullCalendar | null>(null);
  const calendarContainerRef = useRef<HTMLDivElement | null>(null);
  const { events, loading } = useCalendarEvents();
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSession, setDetailSession] = useState<SessionDetail | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const {
    actionMode,
    setActionMode,
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

  const location = useLocation();
  const navigate = useNavigate();

  const isTeamLeaderArea = location.pathname.startsWith('/tl/');
  const timetablePath = isTeamLeaderArea ? '/tl/timetable' : '/teacher/timetable';
  const assignmentsPath = `${timetablePath}/assignments`;
  const isAssignments = location.pathname.includes('/timetable/assignments');
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
          resource: e.resource,
          color: e.color,
        },
      })),
    [events],
  );

  const handleEventClick = async (clickInfo: EventClickArg) => {
    const event: EventApi = clickInfo.event;
    const idNum = Number(event.id);
    if (!idNum || Number.isNaN(idNum)) return;

    try {
      const rect = (clickInfo.el as HTMLElement).getBoundingClientRect();
      setAnchorRect(rect);
      const session = await sessionService.getById(idNum);
      setDetailSession(session);
      setDetailOpen(true);
    } catch (err) {
      console.error('fetch session detail error', err);
    }
  };

  const handleEventDidMount = (info: { event: EventApi; el: HTMLElement }) => {
    const id = info.event.id;
    const bg = backgroundToneForEventId(
      typeof id === 'string' || typeof id === 'number' ? id : String(id ?? ''),
    );
    const api = calendarRef.current?.getApi();
    const isMonth = api?.view?.type === 'dayGridMonth';
    // Month view uses CSS alternating colors (avoid inline bg override)
    if (!isMonth) {
      info.el.style.backgroundColor = bg;
    } else {
      info.el.style.removeProperty('background-color');
    }
    info.el.style.borderRadius = isMonth ? '6px' : '8px';
    info.el.style.border = '1px solid rgba(33, 151, 192, 0.28)';
    info.el.style.boxShadow = isMonth ? 'none' : '0 2px 8px rgba(15, 23, 42, 0.06)';
    info.el.style.color = '#0f172a';
  };

  const handleMove = (direction: 'prev' | 'next' | 'today') => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    if (direction === 'prev') api.prev();
    if (direction === 'next') api.next();
    if (direction === 'today') api.today();
    setCurrentDate(api.getDate());
  };

  const handleViewChange = (view: 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth') => {
    const api = calendarRef.current?.getApi();
    if (!api) return;
    api.changeView(view);
    setCurrentView(view);
    setCurrentDate(api.getDate());
  };

  useEffect(() => {
    const container = calendarContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      const api = calendarRef.current?.getApi();
      if (!api) return;
      requestAnimationFrame(() => api.updateSize());
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

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
        stickyHeaderDates
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
        moreLinkContent={(arg) => `+${arg.num} mục`}
        expandRows={currentView === 'dayGridMonth'}
        nowIndicator
      />
    </div>
  );

  return (
    <div
      ref={calendarContainerRef}
      className="flex flex-col bg-[#f3f4f6] overflow-hidden p-3 md:p-4"
      style={{ height: 'var(--content-height, 100vh)' }}
    >
      <div className="bg-white overflow-hidden flex-1 min-h-0 flex flex-col rounded-2xl border border-slate-200 shadow-[0_14px_35px_rgba(15,23,42,0.08)]">
        <div className="calendar-toolbar px-4 py-3 border-b border-slate-200">
          <div className="calendar-toolbar-left">
            <button type="button" onClick={() => handleMove('today')} className="calendar-subtle-btn">
              Hôm nay
            </button>
            <div className="calendar-nav-pill">
              <button type="button" onClick={() => handleMove('prev')} className="calendar-icon-btn" aria-label="Trước">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="calendar-range">{headerLabel}</span>
              <button type="button" onClick={() => handleMove('next')} className="calendar-icon-btn" aria-label="Sau">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="calendar-toolbar-right">
            <div className="calendar-segmented">
              <button
                type="button"
                onClick={() => navigate(timetablePath)}
                className={`calendar-segment-btn ${!isAssignments ? 'active' : ''}`}
                title="Xem dạng thời khóa biểu"
              >
                <CalendarDays className="w-3 h-3" />
                <span>Thời khóa biểu</span>
              </button>
              <button
                type="button"
                onClick={() => navigate(assignmentsPath)}
                className={`calendar-segment-btn ${isAssignments ? 'active' : ''}`}
                title="Xem dạng bảng phân công"
              >
                <List className="w-3 h-3" />
                <span>Danh sách</span>
              </button>
            </div>
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
          </div>
        </div>
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
        onOpenAttendancePanel={handleOpenAttendanceFromPopover}
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
        closePanel={closePanel}
        saveAttendance={saveAttendance}
        refreshAttendanceItems={refreshAttendanceItems}
        overlayZClass="z-[85]"
      />
    </div>
  );
}
