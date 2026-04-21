import { useState } from 'react';
import { message } from 'antd';
import { teamApi } from '@/modules/team/api/teamApi';
import userApi from '@/modules/user/api/userApi';
import type { User } from '@/modules/user/user';
import { Dialog } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { cn } from '@/shared/lib/utils';
import { getErrorMessage } from '@/shared/lib/errorMessage';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

export default function CreateTeamModal({ open, onClose, onCreated }: Props) {
  const [teamName, setTeamName] = useState('');
  const [leaderMemberId, setLeaderMemberId] = useState<number | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [searching, setSearching] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const TEAM_LEADER_ROLE_ID = 2;

  const getUserDisplayName = (u: User): string => {
    const m = u.member as unknown as { fullName?: string | null } | null | undefined;
    return (m?.fullName ?? '').trim() || u.email || `User #${u.userId}`;
  };

  const handleSearch = async () => {
    if (!searchValue.trim()) return;
    try {
      setSearching(true);
      const isNumber = !isNaN(Number(searchValue));
      const res = await userApi.getUsers({
        UserId: isNumber ? Number(searchValue) : undefined,
        Email: !isNumber ? searchValue.trim() : undefined,
        RoleId: TEAM_LEADER_ROLE_ID,
        pageNumber: 1,
        pageSize: 20,
      });
      const items = (res.items ?? []).filter((u) => u.roleId === TEAM_LEADER_ROLE_ID);
      setUsers(items);
      if ((res.items ?? []).length > 0 && items.length === 0) {
        message.warning('Không tìm thấy user có vai trò Trưởng nhóm.');
      }
    } catch {
      message.error('Tìm kiếm thất bại');
      setUsers([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (u: User) => {
    if (u.roleId !== TEAM_LEADER_ROLE_ID) {
      message.warning('Chỉ được chọn user có vai trò Trưởng nhóm.');
      return;
    }
    const memberId = u.memberId ?? null;
    if (!memberId || !Number.isFinite(Number(memberId))) {
      message.error('User này chưa được liên kết Member.');
      return;
    }
    setLeaderMemberId(Number(memberId));
    message.success('Đã chọn trưởng nhóm');
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
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
    try {
      setLoading(true);
      await teamApi.create({ teamName: name, leaderMemberId });
      message.success('Tạo nhóm thành công');
      setTeamName('');
      setLeaderMemberId(null);
      setUsers([]);
      setSearchValue('');
      onClose();
      onCreated?.();
    } catch (err: unknown) {
      message.error(getErrorMessage(err) || 'Tạo nhóm thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTeamName('');
    setLeaderMemberId(null);
    setUsers([]);
    setSearchValue('');
    setError('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Thêm nhóm mới"
      description="Tạo nhóm và chọn trưởng nhóm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="teamName" className="text-black font-medium">
            Tên nhóm <span className="text-red-500">*</span>
          </Label>
          <Input
            id="teamName"
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
              placeholder="Nhập UserId hoặc Email"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
              className="h-10 text-black placeholder:text-gray-500 border-gray-200 flex-1"
            />
            <Button type="button" variant="outline" onClick={handleSearch} disabled={searching}>
              {searching ? 'Đang tìm...' : 'Tìm'}
            </Button>
          </div>
        </div>
        {users.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {users.map((u) => {
              const displayName = getUserDisplayName(u);
              const email = (u.email ?? '').trim() || '—';
              const selected = leaderMemberId != null && Number(u.memberId ?? 0) === leaderMemberId;
              return (
              <button
                key={u.userId}
                type="button"
                onClick={() => handleSelect(u)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                  selected
                    ? 'border-[#2197C0] bg-[#2197C0]/10'
                    : 'border-gray-200 hover:bg-gray-50'
                )}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={u.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-gray-200 text-black">
                    {displayName.charAt(0) ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-black">{displayName}</div>
                  <div className="text-xs text-black/60">{email}</div>
                </div>
              </button>
              );
            })}
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
            {loading ? 'Đang tạo...' : 'Tạo nhóm'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
