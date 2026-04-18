import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import sessionService from '../api/sessionApi';
import reservationService from '@/modules/reservation/api/reservationApi';
import type { SessionResponse } from '../session.types';

// In-memory cache — tồn tại trong session browser, tự clear khi component unmount
const sessionCache = new Map<number, SessionResponse>();

export const TeamLeaderSessionDetailCacheContext = createContext<{
  sessionDetail: SessionResponse | null;
}>({ sessionDetail: null });

export function useTeamLeaderSessionDetailFromCache() {
  return useContext(TeamLeaderSessionDetailCacheContext);
}

type Props = {
  sessionId: number;
  reservationId?: number | null;
  children: ReactNode;
  /** Team ID - only fetch suggest-staff for TA/student slots of this team */
  currentTeamId: number | null;
};

/**
 * Pre-fetch data cho Team Leader:
 * - Session detail
 * - Suggest-staff cho TA/student slots thuộc team của Team Leader
 * - KHÔNG fetch team suggestions (Team Leader không phân team)
 */
export default function TeamLeaderSessionDetailGate({ sessionId, reservationId, children, currentTeamId }: Props) {
  const [ready, setReady] = useState(false);
  const [sessionDetail, setSessionDetail] = useState<SessionResponse | null>(null);

  useEffect(() => {
    setReady(false);
    let cancelled = false;

    const run = async () => {
      try {
        // Fetch session detail
        const detail = sessionCache.has(sessionId)
          ? sessionCache.get(sessionId)!
          : await sessionService.getById(sessionId).then((d) => { sessionCache.set(sessionId, d); return d; });

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

        // Fetch suggest-staff CHỈ cho TA/student slots thuộc team của Team Leader
        if (currentTeamId != null && currentTeamId > 0) {
          const assignments = (detail as any)?.Assignments ?? [];
          
          // Filter: TA/student slots thuộc team này
          const teamTaStudentSlots = assignments.filter((a: any) => {
            const role = String(a.StaffRole ?? '').toUpperCase();
            const isTA = role.includes('TA');
            
            // Check if assignment belongs to this team
            const assignmentTeamId = Number(a.TeamId ?? 0);
            const staffMemberTeamId = Number(a.StaffMember?.TeamId ?? 0);
            const belongsToTeam = assignmentTeamId === currentTeamId || staffMemberTeamId === currentTeamId;
            
            return isTA && belongsToTeam;
          });

          if (teamTaStudentSlots.length > 0) {
            const { default: assignmentApi } = await import('@/modules/assignment/api/assignmentApi');
            await Promise.all(
              teamTaStudentSlots.map((a: any) =>
                assignmentApi.suggestStaff(Number(a.AssignmentId ?? 0)).catch(() => [])
              )
            );
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    void run();
    return () => { cancelled = true; };
  }, [sessionId, reservationId, currentTeamId]);

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
    <TeamLeaderSessionDetailCacheContext.Provider value={{ sessionDetail }}>
      {children}
    </TeamLeaderSessionDetailCacheContext.Provider>
  );
}
