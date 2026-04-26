import axiosClient from '@/shared/lib/axios';

export type DashboardRangeParams = {
  range?: 'today' | 'thisweek' | 'thismonth' | 'last3months' | 'last6months' | '1year';
  startDate?: string;
  endDate?: string;
  from?: string;
  to?: string;
};

export type DashboardTeachingHistoryItem = {
  sessionId: number;
  sessionName: string;
  sessionDate: string;
  duration: number;
  status: string;
  teamName?: string;
  topicName?: string;
  sessionTitle?: string;
  sessionNo?: number;
  startAt?: string;
  endAt?: string;
  location?: string;
  role?: string;
  request?: {
    requestCode?: string;
    requestName?: string;
  };
};

export type DashboardAttendanceHistoryItem = {
  attendanceId: number;
  sessionId: number;
  sessionName: string;
  sessionDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: string;
  issue?: string;
  checkinAt?: string;
  checkoutAt?: string;
  session?: {
    sessionTitle?: string;
    startAt?: string;
    endAt?: string;
    location?: string;
  };
  request?: {
    requestCode?: string;
    requestName?: string;
  };
};

export type UserWorkload = {
  totalTeachingHours: number;
  totalTeachingHoursChangePercent: number;
  completedSessions: number;
  completedSessionsChangePercent: number;
  canceledSessions: number;
  canceledSessionsChangePercent: number;
  estimatedIncome: number;
  estimatedIncomeChangePercent: number;
};

export type DashboardEventSummary = {
  totalEvents: number;
  activeEvents: number;
  completedEvents: number;
  totalSessions: number;
  upcomingEvents: number;
};

export type DashboardSkillStatistics = {
  totalSkills: number;
  totalMembersWithSkills: number;
  averageSkillsPerMember: number;
  activeSkills: number;
  skillDistribution?: Array<{
    skillName: string;
    memberCount: number;
  }>;
};

export type DashboardMemberContractSummary = {
  totalContracts: number;
  activeContracts: number;
  completedContracts: number;
  totalMembers: number;
  paidContracts: number;
  unpaidContracts: number;
  paidValue: number;
};

export type DashboardCourseSummary = {
  totalCourses: number;
  activeCourses: number;
  totalSubjects: number;
  totalSubjectSessions: number;
};

export const dashboardCoursesSummaryQueryKey = ['dashboard', 'courses', 'summary'];

export const dashboardApi = {
  getUserWorkload: async (memberId: number, params?: DashboardRangeParams): Promise<UserWorkload> => {
    const query = new URLSearchParams();
    if (params?.range) query.set('Range', params.range);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    const qs = query.toString();
    const url = `/dashboard/users/${memberId}/workload${qs ? `?${qs}` : ''}`;
    const response = await axiosClient.get(url) as Record<string, unknown>;
    return {
      totalTeachingHours: Number(response.totalTeachingHours ?? 0),
      totalTeachingHoursChangePercent: Number(response.totalTeachingHoursChangePercent ?? 0),
      completedSessions: Number(response.completedSessions ?? 0),
      completedSessionsChangePercent: Number(response.completedSessionsChangePercent ?? 0),
      canceledSessions: Number(response.canceledSessions ?? 0),
      canceledSessionsChangePercent: Number(response.canceledSessionsChangePercent ?? 0),
      estimatedIncome: Number(response.estimatedIncome ?? 0),
      estimatedIncomeChangePercent: Number(response.estimatedIncomeChangePercent ?? 0),
    };
  },

  getCourseSummary: async (): Promise<DashboardCourseSummary> => {
    const response = await axiosClient.get('/dashboard/courses/summary') as Record<string, unknown>;
    return {
      totalCourses: Number(response.totalCourses ?? 0),
      activeCourses: Number(response.activeCourses ?? 0),
      totalSubjects: Number(response.totalSubjects ?? 0),
      totalSubjectSessions: Number(response.totalSubjectSessions ?? 0),
    };
  },

  // Stub methods to fix TypeScript errors - return empty/default data
  getUsersOverview: async (): Promise<any> => {
    try {
      return await axiosClient.get('/dashboard/users/overview');
    } catch {
      return { roleDistribution: [] };
    }
  },

  getEventStatusDistribution: async (): Promise<any> => {
    try {
      return await axiosClient.get('/dashboard/events/status-distribution');
    } catch {
      return [];
    }
  },

  getRequestSummary: async (params?: DashboardRangeParams): Promise<any> => {
    try {
      const query = new URLSearchParams();
      if (params?.range) query.set('Range', params.range);
      const qs = query.toString();
      return await axiosClient.get(`/dashboard/requests/summary${qs ? `?${qs}` : ''}`);
    } catch {
      return {};
    }
  },

  getSessionSummary: async (params?: DashboardRangeParams): Promise<any> => {
    try {
      const query = new URLSearchParams();
      if (params?.range) query.set('Range', params.range);
      const qs = query.toString();
      return await axiosClient.get(`/dashboard/sessions/summary${qs ? `?${qs}` : ''}`);
    } catch {
      return {};
    }
  },

  getWalletSummary: async (params?: DashboardRangeParams): Promise<any> => {
    try {
      const query = new URLSearchParams();
      if (params?.range) query.set('Range', params.range);
      const qs = query.toString();
      return await axiosClient.get(`/dashboard/wallets/summary${qs ? `?${qs}` : ''}`);
    } catch {
      return [];
    }
  },

  getWalletMetrics: async (params?: DashboardRangeParams): Promise<any> => {
    try {
      const query = new URLSearchParams();
      if (params?.range) query.set('Range', params.range);
      const qs = query.toString();
      return await axiosClient.get(`/dashboard/wallets/metrics${qs ? `?${qs}` : ''}`);
    } catch {
      return {};
    }
  },

  getWalletTopContributors: async (params: { walletId: number; range?: string }): Promise<any> => {
    try {
      const query = new URLSearchParams();
      if (params.range) query.set('Range', params.range);
      const qs = query.toString();
      return await axiosClient.get(`/dashboard/wallets/${params.walletId}/top-contributors${qs ? `?${qs}` : ''}`);
    } catch {
      return { topContributors: [] };
    }
  },

  getSkillStatistics: async (): Promise<any> => {
    try {
      return await axiosClient.get('/dashboard/skills/statistics');
    } catch {
      return { skillDistribution: [], activeSkills: 0 };
    }
  },

  getEquipmentStatistics: async (): Promise<any> => {
    try {
      return await axiosClient.get('/dashboard/equipments/statistics');
    } catch {
      return {};
    }
  },

  getTopicTeamDistribution: async (): Promise<any> => {
    try {
      return await axiosClient.get('/dashboard/topics/team-distribution');
    } catch {
      return [];
    }
  },

  getEquipmentCategoryDistribution: async (): Promise<any> => {
    try {
      return await axiosClient.get('/dashboard/equipments/category-distribution');
    } catch {
      return [];
    }
  },

  getSubjectTopicDistribution: async (): Promise<any> => {
    try {
      return await axiosClient.get('/dashboard/subjects/topic-distribution');
    } catch {
      return [];
    }
  },

  getSubjectSessionStatistics: async (): Promise<any> => {
    try {
      return await axiosClient.get('/dashboard/subjects/session-statistics');
    } catch {
      return { sessionDistribution: [] };
    }
  },

  getPopularCourses: async (): Promise<any> => {
    try {
      return await axiosClient.get('/dashboard/courses/popular');
    } catch {
      return [];
    }
  },

  getEventSessionStatistics: async (): Promise<any> => {
    try {
      return await axiosClient.get('/dashboard/events/session-statistics');
    } catch {
      return { sessionDistribution: [] };
    }
  },

  getUpcomingEvents: async (params: { pageNumber?: number; pageSize?: number }): Promise<any> => {
    try {
      const query = new URLSearchParams();
      if (params.pageNumber) query.set('pageNumber', String(params.pageNumber));
      if (params.pageSize) query.set('pageSize', String(params.pageSize));
      const qs = query.toString();
      return await axiosClient.get(`/dashboard/events/upcoming${qs ? `?${qs}` : ''}`);
    } catch {
      return [];
    }
  },

  getContractSummary: async (): Promise<any> => {
    try {
      return await axiosClient.get('/dashboard/contracts/summary');
    } catch {
      return {};
    }
  },

  getContractValueStatistics: async (): Promise<any> => {
    try {
      return await axiosClient.get('/dashboard/contracts/value-statistics');
    } catch {
      return {};
    }
  },

  getTeamsStatistics: async (params: { pageNumber?: number; pageSize?: number }): Promise<any> => {
    try {
      const query = new URLSearchParams();
      if (params.pageNumber) query.set('pageNumber', String(params.pageNumber));
      if (params.pageSize) query.set('pageSize', String(params.pageSize));
      const qs = query.toString();
      return await axiosClient.get(`/dashboard/teams/statistics${qs ? `?${qs}` : ''}`);
    } catch {
      return { items: [] };
    }
  },

  exportDashboard: async (params: { range?: string }): Promise<Blob> => {
    try {
      const query = new URLSearchParams();
      if (params.range) query.set('Range', params.range);
      const qs = query.toString();
      return await axiosClient.get(`/dashboard/export${qs ? `?${qs}` : ''}`, {
        responseType: 'blob',
      }) as Blob;
    } catch {
      return new Blob();
    }
  },

  getUserTeachingHistory: async (memberId: number, params?: DashboardRangeParams & { from?: string; to?: string }): Promise<any> => {
    try {
      const query = new URLSearchParams();
      if (params?.range) query.set('Range', params.range);
      if (params?.from) query.set('from', params.from);
      if (params?.to) query.set('to', params.to);
      const qs = query.toString();
      return await axiosClient.get(`/dashboard/users/${memberId}/teaching-history${qs ? `?${qs}` : ''}`);
    } catch {
      return [];
    }
  },

  getUserAttendanceHistory: async (memberId: number, params?: DashboardRangeParams & { from?: string; to?: string }): Promise<any> => {
    try {
      const query = new URLSearchParams();
      if (params?.range) query.set('Range', params.range);
      if (params?.from) query.set('from', params.from);
      if (params?.to) query.set('to', params.to);
      const qs = query.toString();
      return await axiosClient.get(`/dashboard/users/${memberId}/attendance-history${qs ? `?${qs}` : ''}`);
    } catch {
      return [];
    }
  },

  getMemberContractsStatistics: async (memberId: number, params?: DashboardRangeParams): Promise<any> => {
    try {
      const query = new URLSearchParams();
      if (params?.range) query.set('Range', params.range);
      const qs = query.toString();
      return await axiosClient.get(`/dashboard/members/${memberId}/contracts/statistics${qs ? `?${qs}` : ''}`);
    } catch {
      return { paidContracts: 0, unpaidContracts: 0, paidValue: 0 };
    }
  },

  getEventSummary: async (): Promise<any> => {
    try {
      return await axiosClient.get('/dashboard/events/summary');
    } catch {
      return { upcomingEvents: 0 };
    }
  },
};

export default dashboardApi;
