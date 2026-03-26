export type CurrentUser = {
  id: number;
  email: string;
  fullName: string;
  role: string;
  token: string;
};

export type User = {
  userId: number;
  email: string;
  passwordHash: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lockedAt: string | null;
  roleId: number;
};
