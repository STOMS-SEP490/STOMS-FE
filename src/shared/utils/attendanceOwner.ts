export function getAttendanceOwnerId(
  attendances?:
    | Array<{ AttendanceByMemberId?: number | null; attendanceByMemberId?: number | null }>
    | null,
): number | null {
  if (!Array.isArray(attendances) || attendances.length === 0) return null;

  const counts = new Map<number, number>();
  for (const a of attendances) {
    const raw = a?.AttendanceByMemberId ?? a?.attendanceByMemberId ?? null;
    const id = typeof raw === 'number' ? raw : null;
    if (id == null || id <= 0) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  let bestId: number | null = null;
  let bestCount = -1;
  for (const [id, c] of counts.entries()) {
    if (c > bestCount) {
      bestId = id;
      bestCount = c;
    }
  }

  return bestId;
}

