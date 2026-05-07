import type { CurrentUser } from '@/modules/user/user';
import { createContext, useContext, useEffect, useState } from 'react';
import { handleAuthFailure } from '@/modules/auth/utils/handleAuthFailure';
import { refreshAccessToken } from '@/shared/lib/refreshTokenManager';

type AuthContextType = {
  user: CurrentUser | null;
  login: (user: CurrentUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      const token = localStorage.getItem('accessToken');

      if (raw && token) {
        const parsed = JSON.parse(raw) as { userId?: number; email?: string; activeRoleId?: number | string };

        if (parsed.userId && parsed.email && parsed.activeRoleId != null) {
          const current: CurrentUser = {
            id: parsed.userId,
            email: parsed.email,
            fullName: parsed.email,
            role: String(parsed.activeRoleId),
            token,
          };

          setUser(current);
        }
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    const refreshAheadMs = 2 * 60 * 1000;
    let timerId: number | undefined;

    const clearTimer = () => {
      if (timerId != null) window.clearTimeout(timerId);
      timerId = undefined;
    };

    const getDeviceUid = (): string | undefined => {
      try {
        const raw = localStorage.getItem('user');
        if (!raw) return undefined;
        return (JSON.parse(raw) as { deviceUid?: string }).deviceUid;
      } catch {
        return undefined;
      }
    };

    const scheduleNext = () => {
      clearTimer();

      const refreshToken = localStorage.getItem('refreshToken');
      const deviceUid = getDeviceUid();
      const expiresAtRaw = localStorage.getItem('accessTokenExpiresAt');

      if (!refreshToken || !deviceUid || !expiresAtRaw) return;

      const expiresAt = new Date(expiresAtRaw).getTime();
      if (Number.isNaN(expiresAt)) return;

      const delayMs = Math.max(5_000, expiresAt - Date.now() - refreshAheadMs);

      timerId = window.setTimeout(async () => {
        console.log('[Auto Refresh] Scheduled refresh triggered', {
          delayMs,
          expiresAt: expiresAtRaw,
          now: new Date().toISOString(),
        });
        
        try {
          await refreshAccessToken();
          console.log('[Auto Refresh] Success!');
        } catch (err) {
          console.error('[Auto Refresh] Failed, logging out...', err);
          await handleAuthFailure();
          return;
        }
        scheduleNext();
      }, delayMs);
    };

    scheduleNext();
    return clearTimer;
  }, []);

  const login = (userData: CurrentUser) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // Trong development, có thể xảy ra lỗi hot reload
    // Log để debug nhưng không throw ngay
    console.error('useAuth được gọi bên ngoài AuthProvider - có thể do hot reload');
    
    // Trả về giá trị mặc định thay vì throw
    // Điều này giúp tránh crash khi hot reload
    return {
      user: null,
      login: () => {},
      logout: () => {},
    };
  }
  return context;
}