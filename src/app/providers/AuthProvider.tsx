import type { CurrentUser } from '@/modules/user/user';
import { createContext, useContext, useEffect, useState } from 'react';
import authService from '@/modules/auth/api/authApi';
import { updateTokensInStorage } from '@/modules/auth/authStorage';

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
        const parsed = JSON.parse(raw) as { userId?: number; email?: string; roleId?: number | string };

        if (parsed.userId && parsed.email) {
          const current: CurrentUser = {
            id: parsed.userId,
            email: parsed.email,
            fullName: parsed.email,
            role: String(parsed.roleId ?? ''),
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
        try {
          const tokens = await authService.refresh({ refreshToken, deviceUid });
          updateTokensInStorage(tokens);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
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
    throw new Error('useAuth phải dùng bên trong AuthProvider');
  }
  return context;
}