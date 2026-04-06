/** Team kèm trong MemberResponse */
export type MemberTeam = {
  teamId: number;
  teamName: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  leaderMemberId?: number | null;
  leaderMemberName?: string | null;
  teamSessions?: unknown[];
  teamTopics?: unknown[];
};

/**
 * GET /members/filter (items) & GET /members/:id — cùng schema MemberResponse.
 * Email / role / trạng thái user nằm phẳng ở root, không bọc trong `user`.
 */
export type MemberDetail = {
  memberId: number;
  userId: number;
  teamId: number;
  avatarUrl: string | null;
  fullName: string;
  phone: string;
  address: string;
  cin: string;
  bankCode: string;
  bankName: string;
  taxNumber: string | null;
  createdAt: string;
  updatedAt: string;
  assignments: unknown[];
  team: MemberTeam | null;
  email: string | null;
  isActive: boolean;
  userCreatedAt: string | null;
  userUpdatedAt: string | null;
  userLockedAt: string | null;
  roleId: number;
  /** GET /members/filter & /members/:id — MemberSkillItem từ BE */
  skills?: { skillId: number; skillName: string; isActive: boolean }[];
};

/** Bảng danh sách dùng cùng kiểu chi tiết */
export type Member = MemberDetail;
