/* ─── Entity types ─── */

export type TeamSession = {
  teamSessionId: number;
  teamId: number;
  sessionId: number;
  teachersRequired: number;
  tasRequired: number;
};

export type TeamTopic = {
  teamId: number;
  topicId: number;
  topicName?: string | null;
  isActive?: boolean;
  createdAt: string;
};

export type Team = {
  teamId: number;
  teamName: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  leaderMemberId?: number | null;
  leaderMemberName?: string | null;
  teamSessions?: TeamSession[];
  teamTopics?: TeamTopic[];
  /** GET /teams/:id (TeamDetailResponse) — danh sách topic phẳng */
  topics?: TeamTopicItem[];
  /** GET /teams/:id — thành viên kèm response (không cần gọi /members/filter) */
  members?: TeamMemberItem[];
};

/* ─── Filter / Payload types ─── */

export type TeamFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  teamId?: number;
  teamName?: string;
  leaderMemberId?: number;
};

export type TeamCreatePayload = {
  teamName: string;
  leaderMemberId?: number;
};

export type TeamUpdatePayload = {
  teamName: string;
  leaderMemberId?: number;
};

export type MemberSkillItem = {
  skillId: number;
  skillName: string;
  isActive: boolean;
};

export type TeamMemberItem = {
  memberId: number;
  userId: number;
  roleId: number;
  teamId: number | null;
  avatarUrl: string | null;
  fullName: string;
  phone: string | null;
  address: string | null;
  cin: string | null;
  bankCode: string | null;
  bankName: string | null;
  taxNumber: string | null;
  email: string;
  skills?: MemberSkillItem[];
};

export type TeamTopicItem = {
  topicId: number;
  topicName: string;
  isActive?: boolean;
  createdAt?: string | null;
};

export type TeamDetail = {
  teamId: number;
  teamName: string;
  members: TeamMemberItem[];
  topics: TeamTopicItem[];
  leaderMemberId?: number | null;
  leaderMemberName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

/* ─── TeamSession API payload ─── */

export type TeamSessionBulkItem = {
  teamId: number;
  teachersRequired: number;
  tasRequired: number;
};
