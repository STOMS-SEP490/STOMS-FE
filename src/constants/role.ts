export const ROLE_ID = {
  MANAGER: 1,
  TEAM_LEADER: 2,
  PROGRAM_COORDINATOR: 3,
  TEACHER: 4,
  ASSISTANT: 5,
  EQUIPMENT_MANAGER: 6,
} as const;

export const MANAGER_ROLE_ID = ROLE_ID.MANAGER;

export const ROLE_MAP: Record<number, string> = {
  1: 'Quản lý',
  2: 'Trưởng nhóm',
  3: 'Điều phối chương trình',
  4: 'Giảng viên',
  5: 'Sinh viên',
  6: 'Giám sát thiết bị',
};

export const ROLE_BADGE_CLASS: Record<number, string> = {
  1: 'bg-red-50 text-red-700 border-red-200',
  2: 'bg-sky-100 text-sky-700 border-sky-200',
  3: 'bg-orange-50 text-orange-800 border-orange-200',
  4: 'bg-violet-100 text-violet-700 border-violet-200',
  5: 'bg-amber-100 text-amber-700 border-amber-200',
  6: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function getRoleLabel(roleId: number | null | undefined): string {
  if (roleId == null) return 'Chưa có vai trò';
  return ROLE_MAP[roleId] ?? `Role ${roleId}`;
}

export function getRoleBadgeClass(roleId: number | null | undefined): string {
  if (roleId == null) return 'bg-slate-100 text-slate-600 border-slate-200';
  return ROLE_BADGE_CLASS[roleId] ?? 'bg-slate-100 text-slate-600 border-slate-200';
}

/**
 * Maps staffRole string to roleId number for use with role utilities.
 * Used to convert assignment staffRole strings to standardized role IDs.
 */
export function getStaffRoleId(staffRole: string | null | undefined): number | null {
  if (!staffRole) return null;
  const normalized = String(staffRole).toLowerCase().trim();
  
  // Teacher patterns
  if (normalized.includes('teacher') || normalized.includes('giảng viên') || normalized.includes('gv') || normalized === 'te') {
    return ROLE_ID.TEACHER;
  }
  
  // Assistant/Student patterns  
  if (normalized.includes('ta') || normalized.includes('sinh viên') || normalized.includes('assistant') || normalized.includes('student') || normalized.includes('sv') || normalized.includes('sinh')) {
    return ROLE_ID.ASSISTANT;
  }
  
  return null;
}

/**
 * Check if staffRole is a teacher role
 */
export function isTeacherRole(staffRole: string | null | undefined): boolean {
  return getStaffRoleId(staffRole) === ROLE_ID.TEACHER;
}

/**
 * Check if staffRole is an assistant/student role
 */
export function isAssistantRole(staffRole: string | null | undefined): boolean {
  return getStaffRoleId(staffRole) === ROLE_ID.ASSISTANT;
}

