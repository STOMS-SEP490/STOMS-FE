/**
 * Helper functions cho team assignments
 * Tập trung các utility functions để tránh lặp code
 */

/**
 * Normalize số lượng yêu cầu, đảm bảo >= 0
 */
export function normalizeRequiredCount(value: unknown, fallback: number): number {
  const n = Number(value);
  if (Number.isNaN(n)) return fallback;
  return Math.max(0, n);
}

/**
 * Phân bổ số lượng đều cho các team
 * Ví dụ: 5 TAs cho 3 teams → [2, 2, 1]
 */
export function distributeCountByTeam(
  teamIds: number[],
  total: number
): Array<{ teamId: number; count: number }> {
  const result = teamIds.map((teamId) => ({ teamId, count: 0 }));
  if (!result.length || total <= 0) return result;
  for (let i = 0; i < total; i += 1) {
    result[i % result.length].count += 1;
  }
  return result;
}

/**
 * Tính tổng số TAs đã được assign cho các teams
 */
export function calculateAssignedTasCount(
  teamIds: number[],
  teamQuantities: Record<number, { teachersRequired: number; tasRequired: number }>
): number {
  return teamIds.reduce(
    (sum, teamId) => sum + normalizeRequiredCount(teamQuantities?.[teamId]?.tasRequired, 0),
    0
  );
}

/**
 * Kiểm tra session đã được assign đủ TAs chưa
 */
export function isSessionTaFullyAssigned(
  session: { tasRequired?: number | null },
  teamIds: number[],
  teamQuantities: Record<number, { teachersRequired: number; tasRequired: number }>
): boolean {
  if (teamIds.length === 0) return false;
  const reqTas = normalizeRequiredCount(session.tasRequired, 1);
  const assignedTas = calculateAssignedTasCount(teamIds, teamQuantities);
  return assignedTas === reqTas;
}
