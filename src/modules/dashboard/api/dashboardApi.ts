import axiosClient from '@/shared/lib/axios';
import type { PaginationResponse } from '@/shared/types/api';
export type DashboardUsersSummary = {
  date: string;
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  managerUsers: number;
  loggedInTodayUsers: number;
};

export type DashboardUserRoleDistribution = {
  roleId: number;
  roleName: string;
  userCount: number;
  percentage: number;
};

export type DashboardUsersOverview = {
  summary: DashboardUsersSummary;
  roleDistribution: DashboardUserRoleDistribution[];
};

export type DashboardEventSummary = {
  totalEvents: number;
  activeEvents: number;
  totalSessions: number;
  upcomingEvents: number;
};

export type DashboardEventStatusDistribution = {
  status: string;
  totalEvents: number;
  percent: number;
};

export type DashboardRequestSummary = {
  totalRequests: number;
  pendingRequests: number;
  rejectedRequests: number;
  approvedRequests: number;
  assigningRequests: number;
  publishedRequests: number;
  completedRequests: number;
  cancelledRequests: number;
};

export type DashboardSessionSummary = {
  totalSessions: number;
  pendingSessions: number;
  approvedSessions: number;
  rejectedSessions: number;
  assigningSessions: number;
  assignmentRejectedSessions: number;
  assignedSessions: number;
  cancelledSessions: number;
  ongoingSessions: number;
  completedSessions: number;
};

export type DashboardWalletSummary = {
  walletId: number;
  walletName: string;
  balance: number;
  description?: string | null;
  updatedAt?: string | null;
  totalContribution: number;
  totalExpense: number;
  totalContributionTransactions: number;
  totalExpenseTransactions: number;
  totalContributors: number;
  averageContribution: number;
};

export type DashboardWalletMetrics = {
  walletId: number;
  walletName: string;
  totalContribution: number;
  totalContributionChangePercent: number;
  totalExpense: number;
  totalExpenseChangePercent: number;
  netAmount: number;
  netAmountChangePercent: number;
};

export type DashboardWalletContributor = {
  memberId: number;
  userId: number;
  roleId: number;
  teamId: number | null;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  phone: string | null;
  address: string | null;
  teamName: string | null;
  totalContribution: number;
};

export type DashboardWalletTopContributors = {
  walletId: number;
  walletName: string;
  totalFund: number;
  topContributors: DashboardWalletContributor[];
};

export type DashboardSkillStatistics = {
  totalSkills: number;
  activeSkills: number;
  averageSkillsPerMember: number;
  topSkillName: string | null;
  topSkillUsageCount: number;
  skillDistribution: {
    skillId: number;
    skillName: string;
    memberCount: number;
  }[];
};

export type DashboardRangeParams = {
  range?: 'today' | 'thisweek' | 'thismonth' | 'last3months' | 'last6months' | '1year';
  from?: string;
  to?: string;
};

export type DashboardEquipmentStatistics = {
  totalEquipment: number;
  availableEquipment: number;
  borrowedEquipment: number;
  damagedEquipment: number;
  lostEquipment: number;
  unavailableEquipment: number;
};

export type DashboardTopicTeamDistribution = {
  topicId: number;
  topicName: string;
  teamCount: number;
};

export type DashboardEquipmentCategoryDistribution = {
  categoryId: number;
  categoryName: string;
  totalEquipment: number;
  percent: number;
};

export type DashboardCourseSummary = {
  totalCourses: number;
  activeCourses: number;
  totalSubjects: number;
  totalSubjectSessions: number;
};

export type DashboardSubjectTopicDistribution = {
  topicId: number;
  topicName: string;
  totalSubjects: number;
  percent: number;
};

export type DashboardSubjectSessionDistribution = {
  range: string;
  totalSubjects: number;
  percent: number;
};

export type DashboardSubjectSessionStatistics = {
  totalSubjects: number;
  totalSubjectSessions: number;
  averageSessionsPerSubject: number;
  maxSessionsPerSubject: number;
  sessionDistribution: DashboardSubjectSessionDistribution[];
};

export type DashboardPopularCourse = {
  courseId: number;
  courseName: string;
  totalEnrollments: number;
};

export type DashboardEventSessionDistribution = {
  range: string;
  totalEvents: number;
  percent: number;
};

export type DashboardEventSessionStatistics = {
  totalEvents: number;
  totalEventSessions: number;
  averageSessionsPerEvent: number;
  maxSessionsPerEvent: number;
  sessionDistribution: DashboardEventSessionDistribution[];
};

export type DashboardUpcomingEvent = {
  requestId: number;
  startDate: string;
  sessionsRequired: number;
  requestCode: string;
  requestName: string;
  customerName: string;
  eventId: number;
  eventName: string;
  eventCode: string;
  daysRemaining: number;
};

export type DashboardContractSummary = {
  totalContracts: number;
  paidContracts: number;
  unpaidContracts: number;
  paidPercent: number;
  unpaidPercent: number;
};

export type DashboardContractValueStatistics = {
  totalValue: number;
  averageValue: number;
  highestContractValue: number;
  lowestContractValue: number;
  totalContracts: number;
};

export type DashboardTeamStatisticsItem = {
  teamId: number;
  teamName: string;
  totalMembers: number;
  activeMembers: number;
  totalSessions: number;
  completedSessions: number;
  canceledSessions: number;
  upcomingSessions: number;
  totalTeachingHours: number;
};

export type DashboardUserWorkload = {
  totalTeachingHours: number;
  totalTeachingHoursChangePercent: number;
  completedSessions: number;
  completedSessionsChangePercent: number;
  canceledSessions: number;
  canceledSessionsChangePercent: number;
  estimatedIncome: number;
  estimatedIncomeChangePercent: number;
};

export type DashboardUserWorkloadParams = {
  range?: DashboardRangeParams['range'];
  from?: string;
  to?: string;
};

export const dashboardApi = {
  getUsersOverview(): Promise<DashboardUsersOverview> {
    return axiosClient.get('/dashboard/users/statistics');
  },

  getEventSummary(): Promise<DashboardEventSummary> {
    return axiosClient.get('/dashboard/events/summary');
  },

  getEventStatusDistribution(): Promise<DashboardEventStatusDistribution[]> {
    return axiosClient.get('/dashboard/events/status-distribution');
  },

  getRequestSummary(params?: DashboardRangeParams): Promise<DashboardRequestSummary> {
    return axiosClient.get('/dashboard/request/summary', { params });
  },

  getSessionSummary(params?: DashboardRangeParams): Promise<DashboardSessionSummary> {
    return axiosClient.get('/dashboard/sessions/summary', { params });
  },

  getWalletSummary(params?: DashboardRangeParams & { walletId?: number }): Promise<DashboardWalletSummary[]> {
    return axiosClient.get('/dashboard/wallet/summary', { params });
  },

  getWalletMetrics(params?: DashboardRangeParams & { walletId?: number }): Promise<DashboardWalletMetrics[]> {
    return axiosClient.get('/dashboard/wallet/metrics', { params });
  },

  getWalletTopContributors(params?: DashboardRangeParams & { walletId?: number; top?: number }): Promise<DashboardWalletTopContributors[]> {
    return axiosClient.get('/dashboard/wallet/top-contributors', { params });
  },

  getSkillStatistics(): Promise<DashboardSkillStatistics> {
    return axiosClient.get('/dashboard/skills/statistics');
  },

  getEquipmentStatistics(): Promise<DashboardEquipmentStatistics> {
    return axiosClient.get('/dashboard/equipments/statistics');
  },

  getTopicTeamDistribution(): Promise<DashboardTopicTeamDistribution[]> {
    return axiosClient.get('/dashboard/team-topics/distribution');
  },

  getEquipmentCategoryDistribution(): Promise<DashboardEquipmentCategoryDistribution[]> {
    return axiosClient.get('/dashboard/equipments/category-distribution');
  },

  getCourseSummary(): Promise<DashboardCourseSummary> {
    return axiosClient.get('/dashboard/courses/summary');
  },

  getSubjectTopicDistribution(): Promise<DashboardSubjectTopicDistribution[]> {
    return axiosClient.get('/dashboard/subjects/topic-distribution');
  },

  getSubjectSessionStatistics(): Promise<DashboardSubjectSessionStatistics> {
    return axiosClient.get('/dashboard/subjects/session-statistics');
  },

  getPopularCourses(): Promise<DashboardPopularCourse[]> {
    return axiosClient.get('/dashboard/courses/popular');
  },

  getEventSessionStatistics(): Promise<DashboardEventSessionStatistics> {
    return axiosClient.get('/dashboard/events/session-statistics');
  },

  getUpcomingEvents(params?: { keyword?: string; fromDate?: string; toDate?: string; pageNumber?: number; pageSize?: number }): Promise<PaginationResponse<DashboardUpcomingEvent>> {
    return axiosClient.get('/dashboard/events/upcoming', { params });
  },

  getContractSummary(): Promise<DashboardContractSummary> {
    return axiosClient.get('/dashboard/contracts/summary');
  },

  getContractValueStatistics(): Promise<DashboardContractValueStatistics> {
    return axiosClient.get('/dashboard/contracts/value-statistics');
  },

  getTeamsStatistics(params?: { teamId?: number; keyword?: string; from?: string; toExclusive?: string; pageNumber?: number; pageSize?: number }): Promise<PaginationResponse<DashboardTeamStatisticsItem>> {
    return axiosClient.get('/dashboard/teams/statistics', { params });
  },

  getUserWorkload(memberId: number, params?: DashboardUserWorkloadParams): Promise<DashboardUserWorkload> {
    return axiosClient.get(`/dashboard/users/${memberId}/workload`, { params });
  },
};

