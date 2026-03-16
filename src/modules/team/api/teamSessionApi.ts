import axiosClient from '@/shared/lib/axios';

export type TeamSessionBulkItem = {
  teamId: number;
  teachersRequired: number;
  tasRequired: number;
};

export const teamSessionApi = {
  /** POST api/team-sessions/bulk */
  bulkAssignToSession: (
    sessionId: number,
    items: TeamSessionBulkItem[]
  ): Promise<void> =>
    axiosClient.post('/team-sessions/bulk', {
      sessionId,
      items,
    }),

  /** PUT api/team-sessions/bulk — replace teams for session */
  replaceForSession: (sessionId: number, items: TeamSessionBulkItem[]): Promise<void> =>
    axiosClient.put('/team-sessions/bulk', {
      sessionId,
      items,
    }),
};

