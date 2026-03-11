import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { CalendarEvent, EventListItem } from '@/modules/event/event';
import eventApi from '@/modules/event/api/eventApi';
import teachingHistoryApi, {
  type TeachingHistoryItem,
} from '@/modules/contract/api/teachingHistoryApi';

function buildCalendarEvents(items: EventListItem[]): CalendarEvent[] {
  const result: CalendarEvent[] = [];

  items.forEach((ev) => {
    ev.eventSessions?.forEach((es) => {
      es.sessions?.forEach((slot) => {
        if (!slot.startAt || !slot.endAt) return;
        const start = new Date(slot.startAt);
        const end = new Date(slot.endAt);
        result.push({
          id: slot.sessionId || `${ev.eventId}-${es.eventSessionId}-${start.toISOString()}`,
          title: es.title || ev.eventName,
          start,
          end,
          resource: slot.location || undefined,
          // Lịch manager: coi như event → tím
          color: ev.isActive ? '#a855f7' : '#9ca3af',
        });
      });
    });
  });

  return result;
}

function buildTeacherCalendarEvents(items: TeachingHistoryItem[]): CalendarEvent[] {
  return items
    .filter((x) => x.startAt && x.endAt)
    .map((x) => {
      const start = new Date(x.startAt);
      const end = new Date(x.endAt);
      return {
        id: x.sessionId,
        title: x.sessionName || 'Phiên dạy',
        start,
        end,
        resource: x.location || undefined,
        // Lịch teacher: coi như subject/course → xanh
        color: '#22c55e',
      } as CalendarEvent;
    });
}

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const isTeacherTimetable = location.pathname.startsWith('/teacher/timetable');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        // Nếu là trang thời khóa biểu của teacher: chỉ lấy session được assign
        if (isTeacherTimetable) {
          const memberId =
            Number(JSON.parse(localStorage.getItem('user') || '{}')?.memberId || 0) ||
            undefined;
          if (!memberId) {
            setEvents([]);
          } else {
            const res = await teachingHistoryApi.getTeachingHistory(memberId, {
              pageNumber: 1,
              pageSize: 200,
            });
            setEvents(buildTeacherCalendarEvents(res.items ?? []));
          }
        } else {
          // Trang manager: hiển thị lịch theo event/session
          const res = await eventApi.getEvents({
            pageNumber: 1,
            pageSize: 200,
            isActive: true,
          });
          const basicItems = res.items ?? [];
          const detailedItems: EventListItem[] = await Promise.all(
            basicItems.map(async (ev) => {
              try {
                return await eventApi.getById(ev.eventId);
              } catch {
                return ev;
              }
            })
          );
          setEvents(buildCalendarEvents(detailedItems));
        }
      } catch (err) {
        console.error('fetch calendar events error', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return { events, loading };
}

