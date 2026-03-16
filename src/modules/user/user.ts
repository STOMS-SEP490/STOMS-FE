export type CurrentUser = {
  id: number;
  email: string;
  fullName: string;
  role: string;
  token: string;
};

/** PUT user chỉ cập nhật email, role, isActive. Đổi mật khẩu dùng userApi.changePassword(). */
export type UpdateUserPayload = {
  email: string;
  isActive: boolean;
  roleId: number;
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
