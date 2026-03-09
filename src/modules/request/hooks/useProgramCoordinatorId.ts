import { useAuth } from '@/app/providers/AuthProvider'

export function useProgramCoordinatorId(): number {
  const { user } = useAuth()
  try {
    const raw = localStorage.getItem('user')
    if (raw) {
      const parsed = JSON.parse(raw) as { memberId?: number; userId?: number }
      if (parsed.memberId && parsed.memberId > 0) return parsed.memberId
    }
  } catch {
    // ignore
  }
  return user?.id ?? 0
}
