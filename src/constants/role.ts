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
  5: 'Trợ giảng',
  6: 'Quản lý thiết bị',
};

export const ROLE_BADGE_CLASS: Record<number, string> = {
  1: 'bg-red-50 text-red-700 border-red-200',
  2: 'bg-sky-100 text-sky-700 border-sky-200',
  3: 'bg-orange-50 text-orange-800 border-orange-200',
  4: 'bg-violet-100 text-violet-700 border-violet-200',
  5: 'bg-amber-100 text-amber-700 border-amber-200',
  6: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function getRoleLabel(roleId: number): string {
  return ROLE_MAP[roleId] ?? `Role ${roleId}`;
}

export function getRoleBadgeClass(roleId: number): string {
  return ROLE_BADGE_CLASS[roleId] ?? 'bg-slate-100 text-slate-600 border-slate-200';
}
