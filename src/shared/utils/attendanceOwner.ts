export function getAttendanceOwnerId(
  attendances?:
    | Array<{
        AttendanceByMemberId?: number | string | null;
        attendanceByMemberId?: number | string | null;
      }>
    | null,
): number | null {
  if (!Array.isArray(attendances) || attendances.length === 0) return null;

  const counts = new Map<number, number>();
  for (const a of attendances) {
    const raw = a?.AttendanceByMemberId ?? a?.attendanceByMemberId ?? null;
    const parsed = typeof raw === 'number' ? raw : Number(raw);
    const id = Number.isFinite(parsed) ? parsed : null;
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

