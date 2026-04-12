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

/** Đồng bộ với `index → dashboard` trong Manager/TL/PC/Teacher/EM Routes */
export function getHomePathByRole(roleId: number | null | undefined): string {
  if (roleId === ROLE_ID.MANAGER) return '/manager/dashboard';
  if (roleId === ROLE_ID.TEAM_LEADER) return '/tl/dashboard';
  if (roleId === ROLE_ID.PROGRAM_COORDINATOR) return '/pc/dashboard';
  if (roleId === ROLE_ID.TEACHER || roleId === ROLE_ID.ASSISTANT) return '/teacher/dashboard';
  if (roleId === ROLE_ID.EQUIPMENT_MANAGER) return '/em/dashboard';
  return '/manager/dashboard';
}
