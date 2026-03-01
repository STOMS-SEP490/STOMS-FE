import { useMemo } from 'react';
import type { CurrentUser } from '@/modules/user/user';

export function useCurrentUser(): CurrentUser | null {
  return useMemo(() => {
    const raw = localStorage.getItem('currentUser');
    if (!raw) return null;

    try {
      return JSON.parse(raw) as CurrentUser;
    } catch {
      return null;
    }
  }, []);
}