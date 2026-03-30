import type { MemberDetail } from '@/modules/request/type';

export function extractMembersFromAttendanceFilterResponse(
  raw: unknown,
): Record<number, MemberDetail> {
  const r = (raw ?? {}) as Record<string, unknown>;
  const items = ((r['Items'] ?? r['items']) as unknown[] | undefined) ?? [];
  const map: Record<number, MemberDetail> = {};

  for (const it of items) {
    const item = (it ?? {}) as Record<string, unknown>;
    const member = (item['Member'] ?? item['member'] ?? null) as Record<string, unknown> | null;
    if (!member) continue;

    const memberId = Number(member['MemberId'] ?? member['memberId'] ?? 0);
    if (!memberId) continue;

    const fullName = String(member['FullName'] ?? member['fullName'] ?? '').trim();
    const email = String(member['Email'] ?? member['email'] ?? member['UserEmail'] ?? member['userEmail'] ?? '')
      .trim();
    const avatarUrl = (member['AvatarUrl'] ?? member['avatarUrl'] ?? null) as string | null;
    const teamIdRaw = member['TeamId'] ?? member['teamId'] ?? null;
    const teamIdNum = teamIdRaw == null ? null : Number(teamIdRaw);

    map[memberId] = {
      memberId,
      teamId: Number.isFinite(teamIdNum) ? teamIdNum : null,
      fullName: fullName || `Member #${memberId}`,
      avatarUrl,
      userEmail: email || undefined,
    };
  }

  return map;
}

