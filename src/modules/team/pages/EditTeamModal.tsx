import { useState, useEffect } from 'react';
import { message } from 'antd';
import { Plus, X, Users, Sparkles } from 'lucide-react';
import memberApi from '@/modules/member/api/memberApi';
import userService from '@/modules/user/api/userApi';
import type { User } from '@/modules/user/user';
import topicApi from '@/modules/topic/api/topicApi';
import teamService from '../services/teamService';
import type { Member } from '@/modules/member/member';
import type { Team, TeamTopic } from '../team';
import type { TopicListItem } from '@/modules/topic/topic';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { cn } from '@/shared/lib/utils';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

type Props = {
  open: boolean;
  onClose: () => void;
  team: Team | null;
  onUpdated?: () => void;
};

const ROLE_LABEL: Record<number, string> = {
  1: 'Quản lý', 2: 'Trưởng nhóm', 3: 'Điều phối', 4: 'Giáo viên', 5: 'Sinh viên', 6: 'Giám sát thiết bị',
};

export default function EditTeamModal({ open, onClose, team, onUpdated }: Props) {
  const [teamName, setTeamName] = useState('');
  const [leaderMemberId, setLeaderMemberId] = useState<number | null>(null);
  const [leaderMemberName, setLeaderMemberName] = useState('');
  const [candidates, setCandidates] = useState<Member[]>([]);
  const [teamLeaders, setTeamLeaders] = useState<{ user: User; member: Member }[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [loadingLeaders, setLoadingLeaders] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [currentTeamMemberIds, setCurrentTeamMemberIds] = useState<number[]>([]);
  const [topicCandidates, setTopicCandidates] = useState<TopicListItem[]>([]);
  const [teamTopics, setTeamTopics] = useState<TeamTopic[]>([]);
  const [initialTeamTopics, setInitialTeamTopics] = useState<TeamTopic[]>([]);
  const [pendingTopicIdsToAdd, setPendingTopicIdsToAdd] = useState<number[]>([]);
  const [showAddTopic, setShowAddTopic] = useState(false);

  const TEAM_LEADER_ROLE_ID = 2;

  useEffect(() => {
    const fetchData = async () => {
      if (!open || !team) {
        setCandidates([]); setTeamLeaders([]); setSelectedMemberIds([]);
        setCurrentTeamMemberIds([]); setTopicCandidates([]); setTeamTopics([]);
        setInitialTeamTopics([]); setPendingTopicIdsToAdd([]); setShowAddTopic(false);
        return;
      }
      setTeamName(team.teamName ?? '');
      setLeaderMemberId(team.leaderMemberId ?? null);
      setLeaderMemberName(team.leaderMemberName ?? '');
      setError('');
      setSelectedMemberIds([]); setCurrentTeamMemberIds([]);
      setTeamTopics([]); setInitialTeamTopics([]);
      setPendingTopicIdsToAdd([]); setShowAddTopic(false);

      try {
        setLoadingCandidates(true); setLoadingLeaders(true); setLoadingTopics(true);

        const [membersRes, usersRes, topicsRes, teamDetails] = await Promise.all([
          memberApi.getMembers({ pageSize: 500 }),
          userService.getUsers({ RoleId: TEAM_LEADER_ROLE_ID, pageNumber: 1, pageSize: 200 }),
          topicApi.getTopics({ pageNumber: 1, pageSize: 500 }),
          teamService.getTeamById(team.teamId),
        ]);

        const leaderIdResolved = teamDetails?.leaderMemberId != null
          ? Number(teamDetails.leaderMemberId) : (team.leaderMemberId ?? null);
        const leaderNameResolved = teamDetails?.leaderMemberName ?? team.leaderMemberName ?? '';
        setLeaderMemberId(leaderIdResolved);
        setLeaderMemberName(leaderNameResolved);

        const items = ((membersRes as any).items ?? []) as Member[];
        const users = ((usersRes as any).items ?? []) as User[];
        const leaderUserIds = new Set(
          users.filter((u) => Number(u?.roleId) === TEAM_LEADER_ROLE_ID).map((u) => u.userId),
        );
        const leaderMembers = items.filter((m) => leaderUserIds.has(m.userId));

        // Đảm bảo leader hiện tại luôn có trong list
        let currentLeaderMember = leaderIdResolved != null
          ? items.find((m) => Number(m?.memberId) === Number(leaderIdResolved))
          : undefined;
        if (!currentLeaderMember && leaderIdResolved != null) {
          try { currentLeaderMember = await memberApi.getMemberById(leaderIdResolved); } catch { /* ignore */ }
        }
        const leadersWithCurrent = currentLeaderMember &&
          !leaderMembers.some((m) => Number(m.memberId) === Number(currentLeaderMember!.memberId))
          ? [currentLeaderMember, ...leaderMembers] : leaderMembers;

        // Build joined list { user, member } for dropdown
        const memberByUserId = new Map(items.map((m) => [m.userId, m]));
        const joined = users
          .filter((u) => Number(u?.roleId) === TEAM_LEADER_ROLE_ID)
          .map((u) => {
            const m = memberByUserId.get(u.userId) ?? leadersWithCurrent.find((lm) => lm.userId === u.userId);
            return m ? { user: u, member: m } : null;
          })
          .filter(Boolean) as { user: User; member: Member }[];

        // Ensure current leader is in joined list
        if (currentLeaderMember && !joined.some((j) => Number(j.member.memberId) === Number(currentLeaderMember!.memberId))) {
          const leaderUser = users.find((u) => u.userId === currentLeaderMember!.userId);
          if (leaderUser) joined.unshift({ user: leaderUser, member: currentLeaderMember });
        }

        const allTopics = (((topicsRes as any).items ?? []) as TopicListItem[]).filter((t) => t?.isActive);
        const isInThisTeam = (m: any) => Number(m?.team?.teamId) === Number(team.teamId);
        const isNoTeam = (m: any) => m?.team == null || m?.team?.teamId == null;
        const isTeacherOrTa = (m: any) => { const r = Number(m?.roleId); return r === 4 || r === 5; };
        const inTeam = items.filter(isInThisTeam);
        const noTeam = items.filter((m) => isNoTeam(m) && isTeacherOrTa(m));
        const merged = [...inTeam, ...noTeam.filter((m: any) => !inTeam.some((x: any) => x.memberId === m.memberId))];
        const inTeamIds = inTeam.map((m) => m.memberId);

        setCandidates(merged);
        setTeamLeaders(joined);
        setCurrentTeamMemberIds(inTeamIds);
        setSelectedMemberIds(leaderIdResolved != null ? Array.from(new Set([...inTeamIds, leaderIdResolved])) : inTeamIds);

        const rawTopics = (teamDetails?.teamTopics ?? []) as TeamTopic[];
        const list = rawTopics.filter((x) => Number.isFinite(x?.topicId) && x.topicId > 0);
        setTopicCandidates(allTopics);
        setTeamTopics(list.map((x) => ({ ...x, isActive: x.isActive ?? true })));
        setInitialTeamTopics(list.map((x) => ({ ...x, isActive: x.isActive ?? true })));
      } catch {
        setCandidates([]); setTeamLeaders([]); setTopicCandidates([]);
      } finally {
        setLoadingCandidates(false); setLoadingLeaders(false); setLoadingTopics(false);
      }
    };
    void fetchData();
  }, [open, team]);

  const getLeaderInfo = (id: number | null) => {
    if (id == null) return null;
    return teamLeaders.find((j) => Number(j.member.memberId) === Number(id)) ?? null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const name = teamName.trim();
    if (!name) { setError('Vui lòng nhập tên nhóm'); return; }
    if (leaderMemberId == null) { setError('Vui lòng chọn trưởng nhóm'); return; }
    if (!team) return;
    try {
      setLoading(true);
      await teamService.updateTeam(team.teamId, { teamName: name, leaderMemberId });
      const selectedUnique = Array.from(new Set(selectedMemberIds));
      const toAdd = selectedUnique.filter((id) => !currentTeamMemberIds.includes(id) && id !== leaderMemberId);
      const toRemove = currentTeamMemberIds.filter((id) => !selectedUnique.includes(id));
      if (toRemove.includes(leaderMemberId)) {
        message.warning('Không thể gỡ trưởng nhóm khỏi team.');
        return;
      }
      if (toAdd.length > 0) await teamService.addMembers(team.teamId, toAdd);
      if (toRemove.length > 0) await teamService.removeMembers(toRemove);

      const initialMap = new Map(initialTeamTopics.map((tt) => [tt.topicId, tt.isActive ?? true]));
      const currentMap = new Map(teamTopics.map((tt) => [tt.topicId, tt.isActive ?? true]));
      const toDeactivate: number[] = [];
      const toActivate: number[] = [];
      initialMap.forEach((orig, id) => {
        if (!currentMap.has(id)) return;
        const cur = currentMap.get(id) ?? orig;
        if (orig && !cur) toDeactivate.push(id);
        else if (!orig && cur) toActivate.push(id);
      });
      if (toDeactivate.length > 0) await teamService.deactivateTopicsMany(team.teamId, toDeactivate);
      if (toActivate.length > 0) await teamService.activateTopicsMany(team.teamId, toActivate);
      const toAddTopicIds = Array.from(new Set(pendingTopicIdsToAdd.filter((id) => !teamTopics.some((tt) => tt.topicId === id))));
      if (toAddTopicIds.length > 0) await teamService.addTopicsBulk(team.teamId, toAddTopicIds);

      message.success('Cập nhật nhóm thành công');
      onClose(); onUpdated?.();
    } catch (err: unknown) {
      message.error(getErrorMessage(err) || 'Cập nhật nhóm thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTeamName(''); setLeaderMemberId(null); setCandidates([]); setTeamLeaders([]);
    setTopicCandidates([]); setError(''); setSelectedMemberIds([]); setCurrentTeamMemberIds([]);
    setTeamTopics([]); setInitialTeamTopics([]); setPendingTopicIdsToAdd([]); setShowAddTopic(false);
    onClose();
  };

  if (!team) return null;

  const selectedLeader = getLeaderInfo(leaderMemberId);

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/35 z-40 h-full" onClick={handleClose} aria-hidden />}
      <div className={`fixed top-0 right-0 h-full w-[720px] max-w-[96vw] bg-white z-50 shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full overflow-hidden">

          {/* Header */}
          <header className="shrink-0 border-b border-slate-200 bg-white px-8 pt-6 pb-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Chỉnh sửa nhóm</h2>
                <p className="mt-1 text-sm text-slate-500">Cập nhật thông tin nhóm {team.teamName}</p>
              </div>
              <button type="button" onClick={handleClose} className="shrink-0 p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-md transition-colors" aria-label="Đóng">
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Tên nhóm */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700">Tên nhóm <span className="text-red-500">*</span></Label>
                <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Nhập tên nhóm" className="h-10" />
              </div>

              {/* Trưởng nhóm */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700">Trưởng nhóm <span className="text-red-500">*</span></Label>
                <Select
                  value={leaderMemberId?.toString() ?? ''}
                  onValueChange={(v) => {
                    const id = v === '' ? null : Number(v);
                    setLeaderMemberId(id);
                    if (id != null) setSelectedMemberIds((prev) => prev.includes(id) ? prev : [...prev, id]);
                  }}
                  disabled={loadingLeaders}
                >
                  <SelectTrigger className="h-12">
                    {selectedLeader ? (
                      <div className="flex items-center gap-3">
                        <img src={selectedLeader.member.avatarUrl || '/img/ava.png'} alt="" className="h-7 w-7 rounded-full object-cover border border-slate-200" onError={(e) => { e.currentTarget.src = '/img/ava.png'; }} />
                        <div className="text-left">
                          <div className="text-sm font-medium text-slate-900">{selectedLeader.member.fullName || selectedLeader.user.email}</div>
                          <div className="text-xs text-slate-500">{selectedLeader.user.email}</div>
                        </div>
                      </div>
                    ) : (
                      <SelectValue placeholder={loadingLeaders ? 'Đang tải...' : leaderMemberName || 'Chọn trưởng nhóm'} />
                    )}
                  </SelectTrigger>
                  <SelectContent className="w-[var(--radix-select-trigger-width)] min-w-[320px]">
                    {teamLeaders.map((j) => (
                      <SelectItem key={j.member.memberId} value={String(j.member.memberId)} className="py-2 px-3">
                        <div className="flex items-center gap-3">
                          <img src={j.member.avatarUrl || '/img/ava.png'} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover border border-slate-200" onError={(e) => { e.currentTarget.src = '/img/ava.png'; }} />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900">{j.member.fullName || `Member #${j.member.memberId}`}</div>
                            <div className="text-xs text-slate-500">{j.user.email}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                    {teamLeaders.length === 0 && !loadingLeaders && (
                      <div className="px-3 py-2 text-sm text-slate-500">Không có trưởng nhóm nào</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Thành viên */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Users className="h-4 w-4 text-[#2197C0]" />
                  <h3 className="text-sm font-semibold text-slate-900">Thành viên trong nhóm</h3>
                </div>
                <p className="text-xs text-slate-500">Thành viên đã thuộc nhóm được tick sẵn. Tick thêm thành viên chưa có nhóm để thêm vào.</p>
                {loadingCandidates ? (
                  <p className="text-sm text-slate-500">Đang tải...</p>
                ) : candidates.length === 0 ? (
                  <p className="text-sm text-slate-500">Không có thành viên phù hợp.</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto stoms-scrollbar space-y-1.5 pr-1">
                    {candidates.map((m) => {
                      const isLeader = leaderMemberId != null && m.memberId === leaderMemberId;
                      const checked = selectedMemberIds.includes(m.memberId);
                      return (
                        <label key={m.memberId} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors', checked ? 'bg-sky-50' : 'hover:bg-slate-50')}>
                          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-[#2197C0]" checked={checked} disabled={isLeader}
                            onChange={(e) => setSelectedMemberIds((prev) => e.target.checked ? [...prev, m.memberId] : prev.filter((id) => id !== m.memberId))} />
                          <img src={m.avatarUrl || '/img/ava.png'} alt="" className="h-9 w-9 rounded-full object-cover border border-slate-200 shrink-0" onError={(e) => { e.currentTarget.src = '/img/ava.png'; }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-900">{m.fullName}</div>
                            <div className="text-xs text-slate-500">{m.email}</div>
                          </div>
                          <span className="text-xs text-slate-400 shrink-0">{ROLE_LABEL[m.roleId ?? 0] ?? '—'}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Chủ đề */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#2197C0]" />
                    <h3 className="text-sm font-semibold text-slate-900">Chủ đề của nhóm</h3>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setShowAddTopic(true)} disabled={topicCandidates.length === 0}>
                    <Plus className="h-3.5 w-3.5" /> Thêm chủ đề
                  </Button>
                </div>
                <p className="text-xs text-slate-500">Gạt để bật/tắt chủ đề đã gán; thêm mới qua nút bên trên.</p>

                {loadingTopics ? (
                  <p className="text-sm text-slate-500">Đang tải...</p>
                ) : (
                  <div className="space-y-1.5">
                    {teamTopics.length === 0 && !showAddTopic ? (
                      <p className="text-sm text-slate-500">Chưa gán chủ đề nào.</p>
                    ) : teamTopics.map((tt) => {
                      const name = tt.topicName ?? topicCandidates.find((c) => c.topicId === tt.topicId)?.topicName ?? `Chủ đề #${tt.topicId}`;
                      const active = tt.isActive ?? true;
                      return (
                        <div key={`${tt.teamId}-${tt.topicId}`} className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-slate-50">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900">{name}</div>
                            <div className="text-xs text-slate-500">ID: {tt.topicId}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-slate-400">{active ? 'Đang dùng' : 'Đang tắt'}</span>
                            <Switch checked={active} onCheckedChange={(checked) => setTeamTopics((prev) => prev.map((item) => item.topicId === tt.topicId ? { ...item, isActive: checked } : item))} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {showAddTopic && (
                  <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">Thêm chủ đề</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddTopic(false)}>Đóng</Button>
                    </div>
                    <div className="max-h-40 overflow-y-auto stoms-scrollbar space-y-1.5">
                      {topicCandidates.filter((t) => !teamTopics.some((tt) => tt.topicId === t.topicId)).length === 0 ? (
                        <p className="text-sm text-slate-500">Đã gán hết chủ đề có sẵn.</p>
                      ) : topicCandidates.filter((t) => !teamTopics.some((tt) => tt.topicId === t.topicId)).map((t) => (
                        <label key={t.topicId} className="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-50">
                          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-[#2197C0]" checked={pendingTopicIdsToAdd.includes(t.topicId)}
                            onChange={(e) => setPendingTopicIdsToAdd((prev) => e.target.checked ? [...prev, t.topicId] : prev.filter((id) => id !== t.topicId))} />
                          <span className="flex-1 text-sm text-slate-900">{t.topicName}</span>
                          <span className="text-xs text-slate-400">#{t.topicId}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-slate-200">
                <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Hủy</Button>
                <Button type="submit" className="flex-1 bg-[#2197C0] hover:bg-[#208AAE] text-white" disabled={loading}>
                  {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </>
  );
}
