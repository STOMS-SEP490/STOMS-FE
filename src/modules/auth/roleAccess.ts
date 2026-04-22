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

export function getRoleLabelById(roleId: number | null | undefined): string {
  if (roleId == null) return 'Chưa có vai trò';
  // tránh circular import constants/role -> auth
  switch (roleId) {
    case ROLE_ID.MANAGER:
      return 'Quản lý';
    case ROLE_ID.TEAM_LEADER:
      return 'Trưởng nhóm';
    case ROLE_ID.PROGRAM_COORDINATOR:
      return 'Điều phối chương trình';
    case ROLE_ID.TEACHER:
      return 'Giảng viên';
    case ROLE_ID.ASSISTANT:
      return 'Sinh viên';
    case ROLE_ID.EQUIPMENT_MANAGER:
      return 'Quản lý thiết bị';
    default:
      return `Role ${roleId}`;
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
