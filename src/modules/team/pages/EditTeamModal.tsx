import { useState, useEffect } from 'react';
import { message } from 'antd';
import memberApi from '@/modules/member/api/memberApi';
import teamService from '../services/teamService';
import type { Member } from '@/modules/member/member';
import type { Team } from '../team';
import { Dialog } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [currentTeamMemberIds, setCurrentTeamMemberIds] = useState<number[]>([]);

  useEffect(() => {
    const fetchCandidates = async () => {
      if (!open || !team) {
        setCandidates([]);
        setSelectedMemberIds([]);
        setCurrentTeamMemberIds([]);
        return;
      }

      setTeamName(team.teamName ?? '');
      const leaderId = team.leaderMemberId ?? null;
      setLeaderMemberId(leaderId);
      setError('');
      setSelectedMemberIds([]);
      setCurrentTeamMemberIds([]);

      try {
        setLoadingCandidates(true);
        const res = await memberApi.getMembers({ pageSize: 500 });
        const items = (res.items ?? []) as Member[];

        const isInThisTeam = (m: any) => Number(m?.team?.teamId) === Number(team.teamId);
        const isNoTeam = (m: any) => m?.team == null || m?.team?.teamId == null;
        const isTeamLeaderRole = (m: any) => Number(m?.user?.roleId) === 1;

        const inTeam = items.filter(isInThisTeam);
        const noTeam = items.filter(isNoTeam);

        const merged = [
          ...inTeam,
          ...noTeam.filter((m: any) => !inTeam.some((x: any) => x.memberId === m.memberId)),
        ];

        const inTeamIds = inTeam.map((m) => m.memberId);
        const currentLeader =
          leaderId != null ? items.find((m) => Number(m.memberId) === Number(leaderId)) : undefined;

        // Trưởng nhóm: chỉ TeamLeader + chưa có team, nhưng luôn include leader hiện tại.
        const leaderCandidates = items.filter((m: any) => isTeamLeaderRole(m) && isNoTeam(m));
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
      } catch {
        setCandidates([]);
        setLeaderOptions([]);
      } finally {
        setLoadingCandidates(false);
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
    setError('');
    setSelectedMemberIds([]);
    setCurrentTeamMemberIds([]);
    onClose();
  };

  if (!team) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Chỉnh sửa nhóm"
      description={`Cập nhật thông tin nhóm #${team.teamId}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
                #{m.memberId} - {m.fullName}
              </option>
            ))}
          </select>
          {leaderMemberId != null && (
            <p className="text-sm text-gray-600">
              Đã chọn: ID {leaderMemberId}
              {team.leaderMemberName && ` (${team.leaderMemberName})`}
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
            <div className="max-h-56 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden space-y-2">
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
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={m.avatarUrl ?? undefined} />
                      <AvatarFallback className="bg-gray-200 text-black">
                        {m.fullName?.charAt(0) ?? '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium text-black">{m.fullName}</div>
                      <div className="text-xs text-black/60">{m.user?.email}</div>
                    </div>
                    <span className="text-xs text-gray-400">#{m.memberId}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Không có thành viên phù hợp để hiển thị.</p>
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
    </Dialog>
  );
}
