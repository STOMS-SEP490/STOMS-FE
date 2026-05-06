// ─── Request types ────────────────────────────────────────────────────────────

export type LoginRequest = {
  email: string;
  password: string;
  deviceUid?: string;
  platform: string;
  deviceName: string;
  fcmToken: string;
};

export type SelectRoleRequest = {
  loginSessionToken: string;
  selectedRoleId: number;
  deviceUid?: string;
  platform: string;
  deviceName: string;
  fcmToken: string;
};

//  Response types 

export type AuthTokensResponse = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
};

export type LoginResponse = {
  deviceUid: string;
  userId: number;
  memberId: number | null;
  email: string;
  userRoleId: number;
  memberRoleId: number | null;
  activeRoleId: number;
  teamId: number | null;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
};

export type AvailableRole = {
  roleId: number;
  roleName: string;
};

export type RoleSelectionRequiredResponse = {
  needsRoleSelection: true;
  loginSessionToken: string;
  loginSessionTokenExpiresAt: string;
  userId: number;
  email: string;
  availableRoles: AvailableRole[];
};

export type LoginApiResponse = LoginResponse | RoleSelectionRequiredResponse;

export function isRoleSelectionRequired(
  res: LoginApiResponse,
): res is RoleSelectionRequiredResponse {
  return (res as RoleSelectionRequiredResponse).needsRoleSelection === true;
}

// Storage helpers

export type StoredAuthUser = {
  userId?: number;
  memberId?: number | null;
  email?: string;
  activeRoleId?: number | null;
  userRoleId?: number | null;
  memberRoleId?: number | null;
  teamId?: number | null;
  deviceUid?: string;
};

export const updateTokensInStorage = (tokens: AuthTokensResponse) => {
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
  localStorage.setItem('accessTokenExpiresAt', tokens.accessTokenExpiresAt);
  localStorage.setItem('refreshTokenExpiresAt', tokens.refreshTokenExpiresAt);
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
      activeRoleId: data.activeRoleId,
      userRoleId: data.userRoleId,
      memberRoleId: data.memberRoleId,
      teamId: data.teamId,
      deviceUid: data.deviceUid,
    } satisfies StoredAuthUser),
  );
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

export type SwitchRoleRequest = {
  targetRoleId: number;
  deviceUid: string;
};

export type SwitchRoleResponse = {
  accessToken: string;
  accessTokenExpiresAt: string;
  activeRoleId: number;
};

export function setActiveRoleIdInStorage(roleId: number) {
  const prev = getStoredAuthUser() ?? {};
  localStorage.setItem(
    'user',
    JSON.stringify({
      ...prev,
      activeRoleId: roleId,
    } satisfies StoredAuthUser),
  );
}
