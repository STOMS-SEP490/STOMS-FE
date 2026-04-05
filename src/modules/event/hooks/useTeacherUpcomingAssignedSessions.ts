import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import teachingHistoryApi from '@/modules/contract/api/teachingHistoryApi';
import {
  sessionDisplayName,
  type TeachingScheduleItem,
} from '@/modules/contract/teachingHistory';

/** BE SessionStatus.Assigned — phiên đã được phân công, sắp/đang diễn ra. */
const ASSIGNED_SESSION_STATUS = 6;

export type TeacherUpcomingScheduleCard = {
  sessionId: number;
  requestLine: string;
  sessionLine: string;
  start: Date;
  end: Date;
  resource: string;
  isOngoing: boolean;
  /** Truyền SessionDetailPopover khi bấm thẻ. */
  popoverMeta: {
    title: string;
    sessionTitle?: string;
    requestCode?: string;
    requestName?: string;
    sessionNo: number | null;
  };
};

/** Đồng bộ với tiêu đề thẻ lịch teacher: requestName → requestCode → sessionDisplayName. */
function requestLineFromSchedule(s: TeachingScheduleItem): string {
  const rn = (s.request?.requestName ?? '').trim();
  const rc = (s.request?.requestCode ?? '').trim();
  return rn || rc || sessionDisplayName(s) || '—';
}

function sessionLineFromSchedule(s: TeachingScheduleItem): string {
  const topic = (s.sessionTitle ?? '').trim();
  const sessionNo = s.sessionNo != null ? String(s.sessionNo) : '—';
  if (topic) return `${topic} · Buổi ${sessionNo}`;
  return `Buổi ${sessionNo}`;
}

export type TeacherUpcomingOptions = {
  /** TL /timetable tab “Lịch của tôi”: cùng API & UI cột sắp tới như giáo viên. */
  teamLeaderPersonal?: boolean;
};

/**
 * Cột “Lịch sắp tới” (teacher/timetable): phiên ASSIGNED của member đăng nhập,
 * lọc end &gt;= hiện tại, sắp xếp theo giờ bắt đầu.
 */
export function useTeacherUpcomingAssignedSessions(
  refreshNonce = 0,
  options?: TeacherUpcomingOptions,
) {
  const location = useLocation();
  const isTeacherTimetable = location.pathname.startsWith('/teacher/timetable');
  const isTeamLeaderTimetable = location.pathname.startsWith('/tl/timetable');
  const teamLeaderPersonal = options?.teamLeaderPersonal === true;
  const useTeacherStyleUpcoming =
    isTeacherTimetable || (isTeamLeaderTimetable && teamLeaderPersonal);
  const [cards, setCards] = useState<TeacherUpcomingScheduleCard[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!useTeacherStyleUpcoming) {
      setCards([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const memberId = Number(JSON.parse(localStorage.getItem('user') || '{}')?.memberId || 0);
    if (!memberId) {
      setCards([]);
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        setLoading(true);
        const res = await teachingHistoryApi.getTeachingSchedule(memberId, {
          pageNumber: 1,
          pageSize: 50,
          Status: ASSIGNED_SESSION_STATUS,
        });
        if (cancelled) return;
        const now = Date.now();
        const mapped: TeacherUpcomingScheduleCard[] = (res.items ?? [])
          .filter((s) => s.startAt && s.endAt)
          .map((s) => {
            const start = new Date(s.startAt);
            const end = new Date(s.endAt);
            const startMs = start.getTime();
            const endMs = end.getTime();
            const isOngoing = Number.isFinite(startMs) && Number.isFinite(endMs) && now >= startMs && now <= endMs;
            const requestLine = requestLineFromSchedule(s);
            return {
              sessionId: s.sessionId,
              requestLine,
              sessionLine: sessionLineFromSchedule(s),
              start,
              end,
              resource: (s.location ?? '').trim() || 'Chưa có địa điểm',
              isOngoing,
              popoverMeta: {
                title: requestLine,
                sessionTitle: (s.sessionTitle ?? '').trim() || undefined,
                requestCode: (s.request?.requestCode ?? '').trim() || undefined,
                requestName: (s.request?.requestName ?? '').trim() || undefined,
                sessionNo: s.sessionNo ?? null,
              },
            };
          })
          .filter((c) => Number.isFinite(c.end.getTime()) && c.end.getTime() >= now)
          .sort((a, b) => a.start.getTime() - b.start.getTime())
          .slice(0, 8);

        setCards(mapped);
      } catch {
        if (!cancelled) setCards([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [useTeacherStyleUpcoming, refreshNonce]);

  return { cards, loading, isTeacherTimetable: useTeacherStyleUpcoming };
}
