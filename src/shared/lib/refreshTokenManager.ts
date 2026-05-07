import authService from '@/modules/auth/api/authApi';
import { updateTokensInStorage } from '@/modules/auth/authStorage';

let refreshPromise: Promise<string> | null = null;

export async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) {
    console.log('[Refresh Manager] Reusing existing refresh promise');
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    const rawUser = localStorage.getItem('user');
    const deviceUid = rawUser ? JSON.parse(rawUser).deviceUid : null;

    console.log('[Refresh Manager] Starting new refresh...', {
      hasRefreshToken: !!refreshToken,
      hasDeviceUid: !!deviceUid,
    });

    if (!refreshToken || !deviceUid) {
      console.error('[Refresh Manager] Missing credentials');
      throw new Error('Missing refresh token or deviceUid');
    }

    const tokens = await authService.refresh({ refreshToken, deviceUid });
    
    console.log('[Refresh Manager] Refresh success!', {
      newAccessToken: tokens.accessToken?.substring(0, 20) + '...',
      expiresAt: tokens.accessTokenExpiresAt,
    });

    updateTokensInStorage(tokens);
    return tokens.accessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

/**
 * Reset refresh promise (dùng khi logout)
 */
export function resetRefreshPromise(): void {
  refreshPromise = null;
}
