import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { CalendarEvent, EventListItem } from '@/modules/event/event';
import eventApi from '@/modules/event/api/eventApi';
import teachingHistoryApi from '@/modules/contract/api/teachingHistoryApi';
import { sessionDisplayName } from '@/modules/contract/teachingHistory';
import sessionApi from '@/modules/request/api/sessionApi';
import memberApi from '@/modules/request/api/memberApi';
import requestApi from '@/modules/request/api/requestApi';
import { resolveSessionTopicTitleFromSessionLike } from '@/modules/event/utils/sessionTopicTitle';
import { SESSION_STATUS } from '@/constants/status';

async function loadPersonalTeachingScheduleEvents(memberId: number): Promise<CalendarEvent[]> {
  try {
    const res = await teachingHistoryApi.getTeachingSchedule({
      pageNumber: 1,
      pageSize: 500,
    });
    const items = res.items ?? [];
    return items.flatMap((s) => {
      if (!s.startAt || !s.endAt) return [];
      const start = new Date(s.startAt);
      const end = new Date(s.endAt);
      const requestName = (s.request?.requestName ?? '').trim();
      const requestCode = (s.request?.requestCode ?? '').trim();
      return {
        id: s.sessionId || `${memberId}-${s.startAt}`,
        title: requestName || sessionDisplayName(s),
        start,
        end,
        sessionTitle: s.sessionTitle,
        requestName: requestName || undefined,
        requestCode: requestCode || undefined,
        resource: s.location || undefined,
        color: '#e8f4f9',
        requestKind: 'other',
        sessionNo: s.sessionNo ?? null,
        status: s.status ?? null,
      } as CalendarEvent;
    });
  } catch {
    return [];
  }
}

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
          color: ev.isActive ? '#e8f4f9' : '#f1f5f9',
        });
      });
    });
  });

  return result;
}

/** Lịch TL / Manager: cùng GET /sessions/filter; TL truyền TeamId, Manager không truyền TeamId (toàn hệ thống). */
async function loadCalendarEventsViaSessionFilter(
  teamId: number | undefined,
  omitTeamId: boolean,
): Promise<CalendarEvent[]> {
  const sessionsRes = await sessionApi.getFilter({
    ...(omitTeamId ? {} : { TeamId: teamId }),
    /** BE `/sessions/filter`: truyền mã trạng thái (6–9) thay cho chuỗi enum. */
    Statuses: [
      SESSION_STATUS.ASSIGNED,
      SESSION_STATUS.CANCELLED,
      SESSION_STATUS.ONGOING,
      SESSION_STATUS.COMPLETED,
    ],
    PageNumber: 1,
    PageSize: 500,
  });
  const sessionsRaw = sessionsRes.Items ?? [];

  const requestMap = new Map<number, { requestName?: string; requestCode?: string }>();
  for (const s of sessionsRaw) {
    const embedded = (s.Request?.RequestName ?? '').trim();
    if (embedded && s.RequestId > 0) {
      requestMap.set(s.RequestId, {
        requestName: s.Request?.RequestName ?? undefined,
        requestCode: s.Request?.RequestCode ?? undefined,
      });
    }
  }
  const missingRequestIds = [
    ...new Set(
      sessionsRaw
        .filter((s) => {
          const embedded = (s.Request?.RequestName ?? '').trim();
          return !embedded && Number(s.RequestId) > 0;
        })
        .map((s) => s.RequestId),
    ),
  ];
  await Promise.all(
    missingRequestIds.map(async (rid) => {
      try {
        const req = await requestApi.getById(rid);
        requestMap.set(rid, {
          requestCode: req.requestCode,
          requestName: req.requestName,
        });
      } catch {
        // giữ slot lịch dù thiếu request
      }
    }),
  );

  return (sessionsRaw ?? []).flatMap((s) => {
    const startRaw = s.StartAt;
    const endRaw = s.EndAt;
    if (!startRaw || !endRaw) return [];

    const start = new Date(startRaw);
    const end = new Date(endRaw);
    const meta = requestMap.get(s.RequestId);
    const requestName = (s.Request?.RequestName ?? '').trim() || (meta?.requestName ?? '').trim();
    const requestCode = (s.Request?.RequestCode ?? '').trim() || (meta?.requestCode ?? '').trim();
    const topicTitle = resolveSessionTopicTitleFromSessionLike(s);
    const title =
      requestName ||
      topicTitle ||
      (s.SessionNo != null ? `Buổi ${s.SessionNo}` : 'Buổi');
    return {
      id: s.SessionId,
      title,
      start,
      end,
      sessionTitle: topicTitle || undefined,
      requestName: requestName || undefined,
      requestCode: requestCode || undefined,
      resource: s.Location ?? undefined,
      color: '#e8f4f9',
      requestKind: 'other',
      sessionNo: s.SessionNo ?? null,
      status: s.Status ?? null,
    } as CalendarEvent;
  });
}

export type TeamLeaderTimetableScope = 'team' | 'personal';

export function useCalendarEvents(
  refreshNonce = 0,
  teamLeaderScope: TeamLeaderTimetableScope = 'team',
) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const isTeacherTimetable = location.pathname.startsWith('/teacher/timetable');
  const isPCTimetable = location.pathname.startsWith('/pc/timetable');
  const isTeamLeaderTimetable = location.pathname.startsWith('/tl/timetable');
  const isManagerTimetable = location.pathname.startsWith('/manager/timetable');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        
        if (isTeacherTimetable) {
          const memberId =
            Number(JSON.parse(localStorage.getItem('user') || '{}')?.memberId || 0) ||
            undefined;
          if (!memberId) {
            setEvents([]);
          } else {
            const mapped = await loadPersonalTeachingScheduleEvents(memberId);
            setEvents(mapped);
          }
        }
        else if (isPCTimetable) {
          const mapped = await loadCalendarEventsViaSessionFilter(undefined, true);
          setEvents(mapped);
        }
        else if (isTeamLeaderTimetable) {
          if (teamLeaderScope === 'personal') {
            const memberId =
              Number(JSON.parse(localStorage.getItem('user') || '{}')?.memberId || 0) ||
              undefined;
            if (!memberId) {
              setEvents([]);
            } else {
              const mapped = await loadPersonalTeachingScheduleEvents(memberId);
              setEvents(mapped);
            }
          } else {
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

            const mapped = await loadCalendarEventsViaSessionFilter(teamId, false);
            setEvents(mapped);
          }
        }
        else if (isManagerTimetable) {
          const mapped = await loadCalendarEventsViaSessionFilter(undefined, true);
          setEvents(mapped);
        }
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
  }, [
    isTeacherTimetable,
    isPCTimetable,
    isTeamLeaderTimetable,
    isManagerTimetable,
    teamLeaderScope,
    refreshNonce,
  ]);

  return { events, loading };
}

