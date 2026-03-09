export type Member = {
  memberId: number;
  fullName: string;
  avatarUrl: string | null;
  phone: string;
  address: string;
  createdAt: string;
  team: {
    teamId: number;
    teamName: string;
  };
  user: {
    userId: number;
    email: string;
    isActive: boolean;
    roleId: number;
  };
};

export type MemberDetail = {
  memberId: number;
  userId: number;
  teamId: number | null;
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
  user: {
    userId: number;
    email: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    lockedAt: string | null;
    roleId: number;
  };
};
