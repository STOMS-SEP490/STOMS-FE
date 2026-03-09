import { useState, useEffect } from 'react';
import { message } from 'antd';
import userService from '@/modules/user/api/userApi';
import teamService from '../services/teamService';
import type { Member } from '@/modules/user/user';
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
  const [searchValue, setSearchValue] = useState('');
  const [searching, setSearching] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && team) {
      setTeamName(team.teamName ?? '');
      setLeaderMemberId(team.leaderMemberId ?? null);
      setSearchValue('');
      setMembers([]);
      setError('');
    }
  }, [open, team]);

  const handleSearch = async () => {
    if (!searchValue.trim()) return;
    try {
      setSearching(true);
      const isNumber = !isNaN(Number(searchValue));
      const res = await userService.getMembers({
        MemberId: isNumber ? Number(searchValue) : undefined,
        FullName: !isNumber ? searchValue : undefined,
      });
      setMembers(res.items ?? []);
    } catch {
      message.error('Tìm kiếm thất bại');
      setMembers([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (member: Member) => {
    setLeaderMemberId(member.memberId);
    message.success('Đã chọn trưởng nhóm');
  };

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
    setMembers([]);
    setSearchValue('');
    setError('');
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
          <div className="flex gap-2">
            <Input
              placeholder="Nhập ID hoặc tên thành viên"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
              className="h-10 text-black placeholder:text-gray-500 border-gray-200 flex-1"
            />
            <Button type="button" variant="outline" onClick={handleSearch} disabled={searching}>
              {searching ? 'Đang tìm...' : 'Tìm'}
            </Button>
          </div>
          {leaderMemberId != null && (
            <p className="text-sm text-gray-600">
              Đã chọn: ID {leaderMemberId}
              {team.leaderMemberName && ` (${team.leaderMemberName})`}
            </p>
          )}
        </div>
        {members.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {members.map((m) => (
              <button
                key={m.memberId}
                type="button"
                onClick={() => handleSelect(m)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                  leaderMemberId === m.memberId
                    ? 'border-[#2197C0] bg-[#2197C0]/10'
                    : 'border-gray-200 hover:bg-gray-50'
                )}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={m.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-gray-200 text-black">
                    {m.fullName?.charAt(0) ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-black">{m.fullName}</div>
                  <div className="text-xs text-black/60">{m.user?.email}</div>
                </div>
              </button>
            ))}
          </div>
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
