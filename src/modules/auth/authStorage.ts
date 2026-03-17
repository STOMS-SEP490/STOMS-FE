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
  roleId: number;
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
      deviceUid: data.deviceUid,
    })
  );
};