import type { CurrentUser } from '@/modules/user/user';
import { createContext, useContext, useEffect, useState } from 'react';


type AuthContextType = {
  user: CurrentUser | null;
  login: (user: CurrentUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    // Chỉ dùng duy nhất key 'user' + 'accessToken' trong localStorage
    try {
      const raw = localStorage.getItem('user');
      const token = localStorage.getItem('accessToken');

      if (raw && token) {
        const parsed = JSON.parse(raw) as {
          userId?: number;
          email?: string;
          roleId?: number | string;
        };

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
      // ignore parse errors
    }
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