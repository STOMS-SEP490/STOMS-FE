export type LoginRequest = {
  email: string;
  password: string;
  deviceUid?: string;
  platform: string;
  deviceName: string;
  fcmToken: string;
};

export type LoginResponse = {
  deviceUid: string;
  userId: number;
  memberId: number;
  email: string;
  /** role hệ thống (user) */
  userRoleId: number | null;
  /** role theo member (có thể null nếu không có member) */
  memberRoleId: number | null;
  /** role đang chọn để vào hệ thống (FE quyết định) */
  roleId?: number | null;
  teamId: number | null;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
};

export type AuthTokensResponse = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
};

export const updateTokensInStorage = (tokens: AuthTokensResponse) => {
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
  localStorage.setItem(
    'accessTokenExpiresAt',
    tokens.accessTokenExpiresAt
  );
  localStorage.setItem(
    'refreshTokenExpiresAt',
    tokens.refreshTokenExpiresAt
  );
};

export const saveAuthToStorage = (data: LoginResponse) => {
  updateTokensInStorage({
    accessToken: data.accessToken,
    accessTokenExpiresAt: data.accessTokenExpiresAt,
    refreshToken: data.refreshToken,
    refreshTokenExpiresAt: data.refreshTokenExpiresAt,
  });

  localStorage.setItem(
    'user',
    JSON.stringify({
      userId: data.userId,
      memberId: data.memberId,
      email: data.email,
      roleId: data.roleId,
      userRoleId: data.userRoleId,
      memberRoleId: data.memberRoleId,
      teamId: data.teamId,
      deviceUid: data.deviceUid,
    })
  );
};

export type StoredAuthUser = {
  userId?: number;
  memberId?: number;
  email?: string;
  roleId?: number | null;
  userRoleId?: number | null;
  memberRoleId?: number | null;
  teamId?: number | null;
  deviceUid?: string;
};

export function getStoredAuthUser(): StoredAuthUser | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuthUser;
  } catch {
    return null;
  }
}

export function setActiveRoleIdInStorage(roleId: number) {
  const prev = getStoredAuthUser() ?? {};
  localStorage.setItem(
    'user',
    JSON.stringify({
      ...prev,
      roleId,
    })
  );
}