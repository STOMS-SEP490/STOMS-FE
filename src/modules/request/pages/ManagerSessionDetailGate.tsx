import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import sessionService from '../api/sessionApi';
import reservationService from '@/modules/reservation/api/reservationApi';
import type { SessionResponse } from '../session.types';
import { isTeacherRole } from '@/constants/role';

// In-memory cache — tồn tại trong session browser, tự clear khi component unmount
const sessionCache = new Map<number, SessionResponse>();
const suggestTeamsCache = new Map<number, unknown[]>();

export const SessionDetailCacheContext = createContext<{
  sessionDetail: SessionResponse | null;
}>({ sessionDetail: null });

export function useSessionDetailFromCache() {
  return useContext(SessionDetailCacheContext);
}

type Props = {
  sessionId: number;
  reservationId?: number | null;
  children: ReactNode;
  /** Skip fetching team suggestions (for Team Leader view) */
  skipTeamSuggestions?: boolean;
};

/**
 * Pre-fetch tất cả data song song, cache lại để các component con
 * dùng lại ngay lập tức (không fetch lại), hiển thị spinner cho đến khi xong.
 */
export default function ManagerSessionDetailGate({ sessionId, reservationId, children, skipTeamSuggestions = false }: Props) {
  const [ready, setReady] = useState(false);
  const [sessionDetail, setSessionDetail] = useState<SessionResponse | null>(null);

  useEffect(() => {
    setReady(false);
    let cancelled = false;

    const run = async () => {
      try {
        // Fetch song song session + suggestTeams (skip suggestTeams for Team Leader)
        const promises: Promise<any>[] = [
          sessionCache.has(sessionId)
            ? Promise.resolve(sessionCache.get(sessionId)!)
            : sessionService.getById(sessionId).then((d) => { sessionCache.set(sessionId, d); return d; }),
        ];

        // Only fetch team suggestions for Manager view
        if (!skipTeamSuggestions) {
          promises.push(
            suggestTeamsCache.has(sessionId)
              ? Promise.resolve(suggestTeamsCache.get(sessionId)!)
              : sessionService.suggestTeams(sessionId).then((t) => { suggestTeamsCache.set(sessionId, t); return t; }).catch(() => [])
          );
        }

        const [detail] = await Promise.all(promises);

        if (cancelled) return;
        setSessionDetail(detail);

        // Fetch equipment nếu có reservationId
        const resolvedReservationId =
          reservationId ??
          (detail as any)?.ReservationId ??
          (detail as any)?.reservationId ??
          null;

        if (resolvedReservationId && Number(resolvedReservationId) > 0) {
          await reservationService.getById(Number(resolvedReservationId)).catch(() => {});
        }

        // Fetch teacher suggestions song song
        const assignments = (detail as any)?.Assignments ?? [];
        const teacherSlots = assignments.filter((a: any) => isTeacherRole(a.StaffRole));

        if (teacherSlots.length > 0) {
          const { default: assignmentApi } = await import('@/modules/assignment/api/assignmentApi');
          await Promise.all(
            teacherSlots.map((a: any) =>
              assignmentApi.suggestStaff(Number(a.AssignmentId ?? 0)).catch(() => [])
            )
          );
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    void run();
    return () => { cancelled = true; };
  }, [sessionId, reservationId]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <div className="flex flex-col items-center gap-2">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-[#2197C0] rounded-full animate-spin" />
          <p className="text-xs">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <SessionDetailCacheContext.Provider value={{ sessionDetail }}>
      {children}
    </SessionDetailCacheContext.Provider>
  );
}
