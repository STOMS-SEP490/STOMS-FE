import { useState, useEffect } from 'react';
import { message } from 'antd';
import { Plus, X } from 'lucide-react';
import memberApi from '@/modules/member/api/memberApi';
import topicApi from '@/modules/topic/api/topicApi';
import teamService from '../services/teamService';
import type { Member } from '@/modules/member/member';
import type { Team, TeamTopic } from '../team';
import type { TopicListItem } from '@/modules/topic/topic';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Switch } from '@/shared/components/ui/switch';
import { cn } from '@/shared/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  team: Team | null;
  onUpdated?: () => void;
};

export default function EditTeamModal({ open, onClose, team, onUpdated }: Props) {
  const [teamName, setTeamName] = useState('');
  const [leaderMemberId, setLeaderMemberId] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<Member[]>([]);
  const [leaderOptions, setLeaderOptions] = useState<Member[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [currentTeamMemberIds, setCurrentTeamMemberIds] = useState<number[]>([]);
  const [topicCandidates, setTopicCandidates] = useState<TopicListItem[]>([]);
  /** Danh sách team-topic đã gán (có isActive) — bật/tắt bằng Switch, Lưu mới gọi API */
  const [teamTopics, setTeamTopics] = useState<TeamTopic[]>([]);
  const [initialTeamTopics, setInitialTeamTopics] = useState<TeamTopic[]>([]);
  const [pendingTopicIdsToAdd, setPendingTopicIdsToAdd] = useState<number[]>([]);
  const [showAddTopic, setShowAddTopic] = useState(false);

  useEffect(() => {
    const fetchCandidates = async () => {
      if (!open || !team) {
        setCandidates([]);
        setSelectedMemberIds([]);
        setCurrentTeamMemberIds([]);
        setTopicCandidates([]);
        setTeamTopics([]);
        setInitialTeamTopics([]);
        setPendingTopicIdsToAdd([]);
        setShowAddTopic(false);
        return;
      }

      setTeamName(team.teamName ?? '');
      const leaderId = team.leaderMemberId ?? null;
      setLeaderMemberId(leaderId);
      setError('');
      setSelectedMemberIds([]);
      setCurrentTeamMemberIds([]);
      setTeamTopics([]);
      setInitialTeamTopics([]);
      setPendingTopicIdsToAdd([]);
      setShowAddTopic(false);

      try {
        setLoadingCandidates(true);
        setLoadingTopics(true);

        const [membersRes, topicsRes, teamDetails] = await Promise.all([
          memberApi.getMembers({ pageSize: 500 }),
          topicApi.getTopics({ pageNumber: 1, pageSize: 500 }),
          teamService.getTeamById(team.teamId),
        ]);

        const items = ((membersRes as any).items ?? []) as Member[];
        const allTopics = (((topicsRes as any).items ?? []) as TopicListItem[]).filter((t) => t?.isActive);

        const isInThisTeam = (m: any) => Number(m?.team?.teamId) === Number(team.teamId);
        const isNoTeam = (m: any) => m?.team == null || m?.team?.teamId == null;
        const isTeamLeaderRole = (m: any) => Number(m?.roleId) === 2;
        const isTeacherOrTa = (m: any) => {
          const roleId = Number(m?.roleId);
          return roleId === 4 || roleId === 5;
        };

        const inTeam = items.filter(isInThisTeam);
        // Thành viên chưa thuộc team: chỉ lấy Giáo viên (4) + Trợ giảng (5)
        const noTeamTeachersAndTas = items.filter(
          (m) => isNoTeam(m) && isTeacherOrTa(m),
        );

        const merged = [
          ...inTeam,
          ...noTeamTeachersAndTas.filter(
            (m: any) => !inTeam.some((x: any) => x.memberId === m.memberId),
          ),
        ];

        const inTeamIds = inTeam.map((m) => m.memberId);
        const currentLeader =
          leaderId != null ? items.find((m) => Number(m.memberId) === Number(leaderId)) : undefined;

        // Trưởng nhóm: tất cả member có role TeamLeader, không ràng buộc teamId,
        // nhưng luôn include leader hiện tại (nếu khác role vẫn sẽ có trong danh sách).
        const leaderCandidates = items.filter((m: any) => isTeamLeaderRole(m));
        const leaderMerged = currentLeader
          ? [
              currentLeader,
              ...leaderCandidates.filter((m) => Number(m.memberId) !== Number(currentLeader.memberId)),
            ]
          : leaderCandidates;

        setCandidates(merged);
        setLeaderOptions(leaderMerged);
        setCurrentTeamMemberIds(inTeamIds);
        const ensureLeader = leaderId != null ? Array.from(new Set([...inTeamIds, leaderId])) : inTeamIds;
        setSelectedMemberIds(ensureLeader);

        const rawTopics = (teamDetails?.teamTopics ?? []) as TeamTopic[];
        const list = rawTopics.filter((x) => Number.isFinite(x?.topicId) && x.topicId > 0);
        setTopicCandidates(allTopics);
        setTeamTopics(list.map((x) => ({ ...x, isActive: x.isActive ?? true })));
        setInitialTeamTopics(list.map((x) => ({ ...x, isActive: x.isActive ?? true })));
        setPendingTopicIdsToAdd([]);
        setShowAddTopic(false);
      } catch {
        setCandidates([]);
        setLeaderOptions([]);
        setTopicCandidates([]);
      } finally {
        setLoadingCandidates(false);
        setLoadingTopics(false);
      }
    };

    fetchCandidates();
  }, [open, team]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const name = teamName.trim();
    if (!name) {
      setError('Vui lòng nhập tên nhóm');
      return;
    }
    if (leaderMemberId == null) {
      setError('Vui lòng chọn trưởng nhóm');
      return;
    }
    if (!team) return;
    try {
      setLoading(true);
      await teamService.updateTeam(team.teamId, { teamName: name, leaderMemberId });

      const selectedUnique = Array.from(new Set(selectedMemberIds));
      const toAdd = selectedUnique.filter((id) => !currentTeamMemberIds.includes(id));
      const toRemove = currentTeamMemberIds.filter((id) => !selectedUnique.includes(id));

      // Không cho phép gỡ leader khỏi team
      if (toRemove.includes(leaderMemberId)) {
        message.warning('Không thể gỡ trưởng nhóm khỏi team. Vui lòng đổi trưởng nhóm trước.');
        return;
      }

      if (toAdd.length > 0) {
        await teamService.addMembers(team.teamId, toAdd);
      }
      if (toRemove.length > 0) {
        await teamService.removeMembers(toRemove);
      }

      // 1) Bật/tắt topic đã gán (bulk) — so với lúc mở modal
      const initialMap = new Map<number, boolean>(
        initialTeamTopics.map((tt) => [tt.topicId, tt.isActive ?? true]),
      );
      const currentMap = new Map<number, boolean>(
        teamTopics.map((tt) => [tt.topicId, tt.isActive ?? true]),
      );
      const toDeactivate: number[] = [];
      const toActivate: number[] = [];
      initialMap.forEach((orig, id) => {
        if (!currentMap.has(id)) return;
        const cur = currentMap.get(id) ?? orig;
        if (orig && !cur) toDeactivate.push(id);
        else if (!orig && cur) toActivate.push(id);
      });
      if (toDeactivate.length > 0) {
        await teamService.deactivateTopicsMany(team.teamId, toDeactivate);
      }
      if (toActivate.length > 0) {
        await teamService.activateTopicsMany(team.teamId, toActivate);
      }

      // 2) Gán thêm topic (bulk) — topic mới mặc định IsActive = true ở BE
      const toAddTopicIds = Array.from(
        new Set(pendingTopicIdsToAdd.filter((id) => !teamTopics.some((tt) => tt.topicId === id))),
      );
      if (toAddTopicIds.length > 0) {
        await teamService.addTopicsBulk(team.teamId, toAddTopicIds);
      }

      message.success('Cập nhật nhóm thành công');
      onClose();
      onUpdated?.();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      message.error(msg || 'Cập nhật nhóm thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTeamName('');
    setLeaderMemberId(null);
    setCandidates([]);
    setLeaderOptions([]);
    setTopicCandidates([]);
    setError('');
    setSelectedMemberIds([]);
    setCurrentTeamMemberIds([]);
    setTeamTopics([]);
    setInitialTeamTopics([]);
    setPendingTopicIdsToAdd([]);
    setShowAddTopic(false);
    onClose();
  };

  if (!team) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 h-full"
          onClick={handleClose}
          aria-hidden
        />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-[520px] bg-[#f3f4f6] z-50
        transition-transform duration-300
        ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar text-gray-700">
          <div className="px-6 py-5 bg-[#f3f4f6] border-b border-gray-200 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-black">Chỉnh sửa nhóm</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Cập nhật thông tin nhóm {team.teamName}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-6">
        <div className="space-y-2">
          <Label htmlFor="edit-teamName" className="text-black font-medium">
            Tên nhóm <span className="text-red-500">*</span>
          </Label>
          <Input
            id="edit-teamName"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Nhập tên nhóm"
            className="h-10 text-black placeholder:text-gray-500 border-gray-200"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-black font-medium">
            Trưởng nhóm <span className="text-red-500">*</span>
          </Label>
          <select
            value={leaderMemberId != null ? String(leaderMemberId) : ''}
            onChange={(e) => {
              const nextLeaderId = e.target.value === '' ? null : Number(e.target.value);
              setLeaderMemberId(nextLeaderId);
              if (nextLeaderId != null) {
                setSelectedMemberIds((prev) => (prev.includes(nextLeaderId) ? prev : [...prev, nextLeaderId]));
              }
            }}
            className="w-full rounded-md border border-gray-200 bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">— Chọn trưởng nhóm —</option>
            {leaderOptions.map((m) => (
              <option key={m.memberId} value={String(m.memberId)}>
                {m.fullName} {m.team?.teamName ? `- ${m.team.teamName}` : ''}
              </option>
            ))}
          </select>
          {leaderMemberId != null && (
            <p className="text-sm text-gray-600">
              Trưởng nhóm hiện tại của nhóm {team.teamName}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-black font-medium">Thành viên trong nhóm</Label>
          <p className="text-xs text-gray-600">
            Thành viên đã thuộc nhóm sẽ được tick sẵn. Bạn chỉ cần tick thêm các thành viên chưa có nhóm để thêm vào team.
          </p>
        </div>

        {loadingCandidates ? (
          <p className="text-sm text-gray-500">Đang tải danh sách thành viên...</p>
        ) : candidates.length > 0 ? (
          <div className="space-y-2">
            <div className="max-h-56 overflow-y-auto stoms-scrollbar space-y-2 pr-2">
              {candidates.map((m) => {
                const isInTeam = currentTeamMemberIds.includes(m.memberId);
                const isLeader = leaderMemberId != null && m.memberId === leaderMemberId;
                return (
                  <div
                    key={m.memberId}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                      isInTeam ? 'border-[#2197C0]/40 bg-[#2197C0]/5' : 'border-gray-200 hover:bg-gray-50',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300"
                      checked={selectedMemberIds.includes(m.memberId)}
                      disabled={isLeader}
                      onChange={(e) => {
                        setSelectedMemberIds((prev) =>
                          e.target.checked ? [...prev, m.memberId] : prev.filter((id) => id !== m.memberId),
                        );
                      }}
                    />
                    <Avatar className="h-10 w-10 relative z-0">
                      <AvatarImage src={m.avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-gray-200 text-black">
                        {m.fullName?.charAt(0) ?? '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium text-black">{m.fullName}</div>
                      <div className="text-xs text-black/60">{m.email}</div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {(() => {
                        const roleId = m.roleId;
                        switch (roleId) {
                          case 6:
                            return 'Quản lý thiết bị';
                          case 5:
                            return 'Trợ giảng';
                          case 4:
                            return 'Giáo viên';
                          case 3:
                            return 'Điều phối chương trình';
                          case 2:
                            return 'Trưởng nhóm';
                          case 1:
                            return 'Quản lý';
                          default:
                            return '—';
                        }
                      })()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Không có thành viên phù hợp để hiển thị.</p>
        )}

        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <Label className="text-black font-medium">Chủ đề của nhóm</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={() => setShowAddTopic(true)}
              disabled={topicCandidates.length === 0}
            >
              <Plus className="w-4 h-4" />
              Thêm chủ đề
            </Button>
          </div>
          <p className="text-xs text-gray-600">
            Gạt để bật/tắt chủ đề đã gán; thêm mới qua nút bên trên (tick nhiều ô rồi bấm Lưu).
          </p>
        </div>

        {loadingTopics ? (
          <p className="text-sm text-gray-500">Đang tải danh sách chủ đề...</p>
        ) : (
          <div className="space-y-2">
            <div className="max-h-56 overflow-y-auto stoms-scrollbar space-y-2 pr-2 rounded-md border bg-muted/20 p-3 pr-2">
              {teamTopics.length === 0 && !showAddTopic ? (
                <p className="text-sm text-gray-500">
                  Chưa gán chủ đề nào. Nhấn &quot;Thêm chủ đề&quot; để chọn.
                </p>
              ) : (
                <div className="space-y-2">
                  {teamTopics.map((tt) => {
                    const isActiveTopic = tt.isActive ?? true;
                    const name = tt.topicName ?? topicCandidates.find((c) => c.topicId === tt.topicId)?.topicName ?? `Chủ đề #${tt.topicId}`;
                    return (
                      <div
                        key={`${tt.teamId}-${tt.topicId}`}
                        className="flex items-center justify-between rounded-md border bg-white px-3 py-2"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-black truncate">{name}</span>
                          <span className="text-xs text-gray-500">ID: {tt.topicId}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-gray-500 hidden sm:inline">
                            {isActiveTopic ? 'Đang dùng' : 'Đang tắt'}
                          </span>
                          <Switch
                            checked={isActiveTopic}
                            onCheckedChange={(checked) => {
                              setTeamTopics((prev) =>
                                prev.map((item) =>
                                  item.topicId === tt.topicId ? { ...item, isActive: checked } : item,
                                ),
                              );
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {showAddTopic && (
          <div className="space-y-2 rounded-md border bg-white p-3">
            <div className="flex items-center justify-between">
              <Label className="text-black font-medium">Thêm chủ đề</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddTopic(false)}>
                Đóng
              </Button>
            </div>
            <p className="text-xs text-gray-600">
              Chọn một hoặc nhiều chủ đề chưa gán; bấm <strong>Lưu</strong> để gán hàng loạt.
            </p>
            <div className="stoms-scrollbar max-h-40 overflow-y-auto rounded-md border bg-muted/20 p-3 pr-2">
              {topicCandidates.filter((t) => !teamTopics.some((tt) => tt.topicId === t.topicId)).length === 0 ? (
                <p className="text-sm text-gray-500">Đã gán hết chủ đề có sẵn.</p>
              ) : (
                <div className="space-y-2">
                  {topicCandidates
                    .filter((t) => !teamTopics.some((tt) => tt.topicId === t.topicId))
                    .map((t) => {
                      const checked = pendingTopicIdsToAdd.includes(t.topicId);
                      return (
                        <label
                          key={t.topicId}
                          className="flex w-full cursor-pointer items-center gap-3 rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300"
                            checked={checked}
                            onChange={(e) => {
                              setPendingTopicIdsToAdd((prev) =>
                                e.target.checked
                                  ? [...prev, t.topicId]
                                  : prev.filter((id) => id !== t.topicId),
                              );
                            }}
                          />
                          <span className="flex-1">{t.topicName}</span>
                          <span className="text-xs text-gray-400">#{t.topicId}</span>
                        </label>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {selectedMemberIds.length > 0 && (
          <p className="text-xs text-gray-600">
            Sẽ thêm {selectedMemberIds.length} thành viên vào nhóm sau khi lưu.
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
            Hủy
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-[#2197C0] hover:bg-[#208AAE] text-white"
            disabled={loading}
          >
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </div>
      </form>
        </div>
      </div>
    </>
  );
}
