import { useState, useEffect } from 'react';
import { message } from 'antd';
import { teamApi } from '@/modules/team/api/teamApi';
import memberApi from '@/modules/member/api/memberApi';
import type { Member } from '@/modules/member/member';
import { Dialog } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
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
  onCreated?: () => void;
};

export default function CreateTeamModal({ open, onClose, onCreated }: Props) {
  const [teamName, setTeamName] = useState('');
  const [leaderMemberId, setLeaderMemberId] = useState<number | null>(null);
  const [teamLeaders, setTeamLeaders] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLeaders, setLoadingLeaders] = useState(false);
  const [error, setError] = useState('');

  const TEAM_LEADER_ROLE_ID = 2;

  // Load danh sách trưởng nhóm khi mở modal
  useEffect(() => {
    if (!open) return;
    
    const loadTeamLeaders = async () => {
      try {
        setLoadingLeaders(true);
        const res = await memberApi.getMembers({
          RoleId: TEAM_LEADER_ROLE_ID,
          pageNumber: 1,
          pageSize: 100,
        });
        setTeamLeaders(res.items ?? []);
      } catch {
        message.error('Không thể tải danh sách trưởng nhóm');
        setTeamLeaders([]);
      } finally {
        setLoadingLeaders(false);
      }
    };

    void loadTeamLeaders();
  }, [open]);

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
          <Label htmlFor="leaderMemberId" className="text-black font-medium">
            Trưởng nhóm <span className="text-red-500">*</span>
          </Label>
          <Select
            value={leaderMemberId?.toString() ?? ''}
            onValueChange={(value) => setLeaderMemberId(Number(value))}
            disabled={loadingLeaders}
          >
            <SelectTrigger className="h-10 text-black border-gray-200">
              <SelectValue placeholder={loadingLeaders ? 'Đang tải...' : 'Chọn trưởng nhóm'} />
            </SelectTrigger>
            <SelectContent>
              {teamLeaders.map((member) => (
                <SelectItem key={member.memberId} value={member.memberId.toString()}>
                  {member.fullName || `Member #${member.memberId}`}
                </SelectItem>
              ))}
              {teamLeaders.length === 0 && !loadingLeaders && (
                <div className="px-2 py-1.5 text-sm text-gray-500">
                  Không có trưởng nhóm nào
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

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
