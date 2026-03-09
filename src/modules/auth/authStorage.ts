export type LoginRequest = {
  email: string;
  password: string;
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

export const saveAuthToStorage = (data: LoginResponse) => {
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.setItem('accessTokenExpiresAt', data.accessTokenExpiresAt);
  localStorage.setItem('refreshTokenExpiresAt', data.refreshTokenExpiresAt);

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