import axiosClient from '@/shared/lib/axios';
import type { TeamSessionBulkItem } from '../team';

export const teamSessionApi = {
  bulkAssignToSession: async (sessionId: number, items: TeamSessionBulkItem[]): Promise<void> => {
    await axiosClient.post('/team-sessions/bulk', { sessionId, items });
  },

  replaceForSession: async (sessionId: number, items: TeamSessionBulkItem[]): Promise<void> => {
    await axiosClient.put('/team-sessions/bulk', { sessionId, items });
  },
};
