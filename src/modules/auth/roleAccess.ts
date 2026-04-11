import { ROLE_ID } from '@/constants/role';

export function getRoleIdFromStorage(): number | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { roleId?: number | string };
    const roleId = Number(parsed.roleId);

    return Number.isNaN(roleId) ? null : roleId;
  } catch {
    return null;
  }
}

export function getHomePathByRole(roleId: number | null | undefined): string {
  if (roleId === ROLE_ID.TEAM_LEADER) return '/tl';
  if (roleId === ROLE_ID.PROGRAM_COORDINATOR) return '/pc';
  if (roleId === ROLE_ID.TEACHER || roleId === ROLE_ID.ASSISTANT) return '/teacher';
  if (roleId === ROLE_ID.EQUIPMENT_MANAGER) return '/em';
  return '/manager/dashboard';
}
