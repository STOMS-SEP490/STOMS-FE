import { isAxiosError } from 'axios';
import { teamApi } from './api/teamApi';
import memberApi from '@/modules/member/api/memberApi';
import type { MemberDetail } from '@/modules/member/member';
import type { TeamDetailResponse, TeamMemberResponse, TeamTopicResponse } from './team';

function memberRowToTeamMember(m: MemberDetail): TeamMemberResponse {
  return {
    MemberId: m.memberId,
    UserId: m.userId,
    RoleId: m.roleId,
    TeamId: m.teamId ?? null,
    AvatarUrl: m.avatarUrl,
    FullName: m.fullName,
    Phone: m.phone || null,
    Address: m.address || null,
    Cin: m.cin || null,
    BankCode: m.bankCode || null,
    BankName: m.bankName || null,
    TaxNumber: m.taxNumber ?? null,
    Email: m.email ?? '',
    Skills: m.skills?.map((s) => ({
      SkillId: s.skillId,
      SkillName: s.skillName,
      IsActive: s.isActive,
    })),
  };
}

function membersPageItems(res: unknown): MemberDetail[] {
  const r = res as { Items?: MemberDetail[]; items?: MemberDetail[] };
  return r.Items ?? r.items ?? [];
}

/**
 * Ưu tiên GET /teams/my-team; nếu 403/404 thì gom nhóm qua members/filter + teams/filter.
 */
export async function loadMyTeamDetail(memberId: number): Promise<TeamDetailResponse | null> {
  if (!memberId) return null;

  try {
    return await teamApi.getMyTeam();
  } catch (e) {
    if (!isAxiosError(e)) throw e;
    const st = e.response?.status;
    if (st === 401) throw e;
    if (st != null && st >= 500) throw e;
  }

  const me = await memberApi.getMemberById(memberId);
  const tid = me.teamId;
  if (tid == null || !Number.isFinite(Number(tid))) return null;

  const [membersPage, teamPageRes] = await Promise.all([
    memberApi.getMembers({ TeamId: tid, pageNumber: 1, pageSize: 500 }),
    teamApi.getTeams({ teamId: tid, pageNumber: 1, pageSize: 1 }),
  ]);

  const teamRow = teamPageRes.Items?.[0];
  const teamName =
    (teamRow?.TeamName && String(teamRow.TeamName).trim()) ||
    (me.team?.teamName && String(me.team.teamName).trim()) ||
    `Nhóm #${tid}`;

  const ttRaw = teamRow?.TeamTopics as unknown[] | undefined;
  const topics: TeamTopicResponse[] = Array.isArray(ttRaw)
    ? ttRaw.map((item) => {
        const tt = (item ?? {}) as Record<string, unknown>;
        return {
          TopicId: Number(tt.TopicId ?? tt.topicId ?? 0),
          TopicName: String(tt.TopicName ?? tt.topicName ?? ''),
          IsActive: tt.IsActive != null ? Boolean(tt.IsActive ?? tt.isActive) : true,
          CreatedAt: (tt.CreatedAt ?? tt.createdAt) as string | null | undefined ?? null,
        };
      })
    : [];

  const members: TeamMemberResponse[] = membersPageItems(membersPage).map(memberRowToTeamMember);

  return {
    TeamId: Number(tid),
    TeamName: teamName,
    Members: members,
    Topics: topics,
    LeaderMemberId: teamRow?.LeaderMemberId ?? me.team?.leaderMemberId ?? null,
    LeaderMemberName: teamRow?.LeaderMemberName ?? me.team?.leaderMemberName ?? null,
    CreatedAt: teamRow?.CreatedAt ?? me.team?.createdAt ?? null,
    UpdatedAt: teamRow?.UpdatedAt ?? me.team?.updatedAt ?? null,
  };
}
