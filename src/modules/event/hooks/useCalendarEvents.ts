import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { CalendarEvent, EventListItem } from '@/modules/event/event';
import eventApi from '@/modules/event/api/eventApi';
import teachingHistoryApi from '@/modules/contract/api/teachingHistoryApi';
import { sessionDisplayName } from '@/modules/contract/teachingHistory';
import { getSessionStatusInfo } from '@/constants/status';
import sessionApi from '@/modules/request/api/sessionApi';
import memberApi from '@/modules/request/api/memberApi';

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

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const isTeacherTimetable = location.pathname.startsWith('/teacher/timetable');
  const isTeamLeaderTimetable = location.pathname.startsWith('/tl/timetable');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        // 1) Thời khóa biểu TEACHER: lấy lịch được phân công qua GET /api/assignments/members/{memberId}/sessions
        if (isTeacherTimetable) {
          const memberId =
            Number(JSON.parse(localStorage.getItem('user') || '{}')?.memberId || 0) ||
            undefined;
          if (!memberId) {
            setEvents([]);
          } else {
            try {
              const res = await teachingHistoryApi.getTeachingSchedule(memberId, {
                pageNumber: 1,
                pageSize: 500,
              });
              const items = res.items ?? [];
              const mapped: CalendarEvent[] = items.flatMap((s) => {
                if (!s.startAt || !s.endAt) return [];
                const start = new Date(s.startAt);
                const end = new Date(s.endAt);
                return {
                  id: s.sessionId || `${memberId}-${s.startAt}`,
                  title: sessionDisplayName(s),
                  start,
                  end,
                  resource: s.location || undefined,
                  color: '#22c55e',
                } as CalendarEvent;
              });
              setEvents(mapped);
            } catch {
              setEvents([]);
            }
          }
        }
        // 2) Thời khóa biểu TEAM LEADER: hiển thị toàn bộ session mà team đó được gán
        else if (isTeamLeaderTimetable) {
          const memberId =
            Number(JSON.parse(localStorage.getItem('user') || '{}')?.memberId || 0) ||
            undefined;

          let teamId: number | undefined;
          if (memberId) {
            try {
              const me = await memberApi.getById(memberId);
              teamId = me.teamId != null ? Number(me.teamId) : undefined;
            } catch {
              teamId = undefined;
            }
          }

          const sessionsRes = await sessionApi.getFilter({
            teamId,
            pageNumber: 1,
            pageSize: 500,
          });
          const sessionsRaw = sessionsRes.items ?? [];
          const mapped: CalendarEvent[] =
            (sessionsRaw ?? []).flatMap((s: any) => {
              const startRaw = s.startAt ?? (s as any).StartAt;
              const endRaw = s.endAt ?? (s as any).EndAt;
              if (!startRaw || !endRaw) return [];
              const start = new Date(startRaw);
              const end = new Date(endRaw);
              const statusRaw = s.status ?? (s as any).Status ?? null;
              const statusInfo = getSessionStatusInfo(statusRaw);
              return {
                id: s.sessionId ?? (s as any).SessionId,
                title: `Phiên ${s.sessionNo ?? (s as any).SessionNo ?? ''}`.trim(),
                start,
                end,
                resource: s.location ?? (s as any).Location ?? undefined,
                color: '#0ea5e9',
                status: statusRaw,
                statusLabel: statusInfo.label,
                statusClassName: statusInfo.className,
              } as CalendarEvent;
            }) ?? [];
          setEvents(mapped);
        }
        // 3) Trang manager: hiển thị lịch theo event/session
        else {
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
  }, [isTeacherTimetable, isTeamLeaderTimetable]);

  return { events, loading };
}

