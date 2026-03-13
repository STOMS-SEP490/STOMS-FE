import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { CalendarEvent, EventListItem } from '@/modules/event/event';
import eventApi from '@/modules/event/api/eventApi';
import { requestApi } from '@/modules/request/api/requestApi';
import { teamApi } from '@/modules/team/api/teamApi';
import axiosClient from '@/shared/lib/axios';
import { REQUEST_STATUS } from '@/constants/status';

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
        // 1) Thời khóa biểu TEACHER: chỉ hiển thị khi Request đã Published
        // và session được phân cho chính member đó (assignment Approved).
        if (isTeacherTimetable) {
          const memberId =
            Number(JSON.parse(localStorage.getItem('user') || '{}')?.memberId || 0) ||
            undefined;
          if (!memberId) {
            setEvents([]);
          } else {
            // Lấy danh sách request Published
            const reqPaged = await requestApi.getRequests({
              pageNumber: 1,
              pageSize: 200,
              // BE có thể nhận cả number/string; FE dùng string trước
              status: String(REQUEST_STATUS.PUBLISHED),
            } as any);
            const reqItems: any[] = (reqPaged as any)?.items ?? (reqPaged as any)?.Items ?? [];
            const requestIds: number[] = Array.from(
              new Set(
                reqItems
                  .map((r) => Number(r.requestId ?? r.RequestId ?? 0))
                  .filter((id) => id > 0)
              )
            );

            // Với mỗi request, lấy session mà member được phân công
            const sessionsByRequest = await Promise.all(
              requestIds.map(async (requestId) => {
                try {
                  const res = await axiosClient.get<any[]>(
                    `/sessions/by-request-and-member?requestId=${requestId}&memberId=${memberId}`
                  );
                  return ((res as any)?.data ?? res ?? []) as any[];
                } catch {
                  return [] as any[];
                }
              })
            );

            const allSessions: any[] = sessionsByRequest.flat();

            const mapped: CalendarEvent[] = allSessions.flatMap((s: any) => {
              const startRaw = s.startAt ?? s.StartAt;
              const endRaw = s.endAt ?? s.EndAt;
              if (!startRaw || !endRaw) return [];
              const start = new Date(startRaw);
              const end = new Date(endRaw);
              const assignments: any[] = (s.assignments ?? s.Assignments ?? []) as any[];

              // Chỉ giữ session mà assignment của memberId đã được APPROVED
              const hasApprovedAssignmentForMe = assignments.some((a) => {
                const staffId = Number(a.staffMemberId ?? a.StaffMemberId ?? 0);
                if (staffId !== memberId) return false;
                const st = String(a.status ?? a.Status ?? '').toUpperCase();
                return st === 'APPROVED' || st === '2';
              });
              if (!hasApprovedAssignmentForMe) return [];

              return {
                id: s.sessionId ?? s.SessionId,
                title: `Phiên ${s.sessionNo ?? s.SessionNo ?? ''}`.trim() || 'Phiên dạy',
                start,
                end,
                resource: s.location ?? s.Location ?? undefined,
                color: '#22c55e',
              } as CalendarEvent;
            });

            setEvents(mapped);
          }
        }
        // 2) Thời khóa biểu TEAM LEADER: hiển thị toàn bộ session mà team đó được gán
        else if (isTeamLeaderTimetable) {
          const rawUser = JSON.parse(localStorage.getItem('user') || '{}') as {
            memberId?: number;
          };
          const memberId = Number(rawUser?.memberId || 0) || undefined;
          if (!memberId) {
            setEvents([]);
            return;
          }

          // Tìm team mà member này là leader
          const teamsRes = await teamApi.getTeams({
            pageNumber: 1,
            pageSize: 20,
            leaderMemberId: memberId,
          });
          const firstTeam = teamsRes.items?.[0];
          if (!firstTeam?.teamId) {
            setEvents([]);
            return;
          }

          // Gọi API GET /api/sessions/by-team/{teamId}
          const sessionsRaw = await axiosClient.get<any[]>(`/sessions/by-team/${firstTeam.teamId}`);
          const mapped: CalendarEvent[] =
            (sessionsRaw ?? []).flatMap((s: any) => {
              const startRaw = s.startAt ?? s.StartAt;
              const endRaw = s.endAt ?? s.EndAt;
              if (!startRaw || !endRaw) return [];
              const start = new Date(startRaw);
              const end = new Date(endRaw);
              const assignments: any[] = (s.assignments ?? s.Assignments ?? []) as any[];
              const hasTeachingStaff = assignments.some((a) => {
                const role = String(a.staffRole ?? a.StaffRole ?? '').toLowerCase();
                return role.includes('teacher') || role.includes('giảng') || role.includes('ta');
              });
              return {
                id: s.sessionId ?? s.SessionId,
                title: `Phiên ${s.sessionNo ?? s.SessionNo ?? ''}`.trim(),
                start,
                end,
                resource: s.location ?? s.Location ?? undefined,
                // Lịch team leader: dùng màu xanh dương
                color: '#0ea5e9',
                unassigned: !hasTeachingStaff,
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

