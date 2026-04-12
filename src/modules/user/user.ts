export type CurrentUser = {
  id: number;
  email: string;
  fullName: string;
  role: string;
  token: string;
};

/** Thiết bị / trình duyệt đã từng đăng nhập (GET /users/{id} đầy đủ). */
export type UserDevice = {
  userDeviceId: number;
  userId: number;
  platform: string;
  deviceName: string;
  lastSeenAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  authSessions?: unknown[];
};

export type User = {
  userId: number;
  email: string;
  passwordHash?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lockedAt?: string | null;
  roleId: number;
  memberId?: number | null;
  avatarUrl?: string | null;
  member?: Record<string, unknown> | null;
  notifications?: unknown[];
  role?: unknown | null;
  userDevices?: UserDevice[];
};
