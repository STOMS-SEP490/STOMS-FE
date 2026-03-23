import { useState, useEffect } from 'react';
import { message } from 'antd';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import memberApi from '@/modules/member/api/memberApi';
import { teamApi } from '@/modules/team/api/teamApi';
import type { Team } from '@/modules/team/team';
import type { Member } from '@/modules/member/member';
import { Dialog } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { cn } from '@/shared/lib/utils';
import { Check, Square } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
};

export default function CreateMemberModal({ open, onClose, onCreated }: Props) {
  const [teamId, setTeamId] = useState<string>('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      teamApi.getTeams({ pageSize: 500 }).then((res) => setTeams(res.items ?? []));
      memberApi.getMembers({ pageSize: 500 }).then((res) => setMembers(res.items ?? []));
    }
  }, [open]);

  const handleToggleMember = (memberId: number) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const filteredMembers = memberSearch.trim()
    ? members.filter(
        (m) =>
          m.fullName?.toLowerCase().includes(memberSearch.toLowerCase()) ||
          m.email?.toLowerCase().includes(memberSearch.toLowerCase())
      )
    : members;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!teamId) {
      setError('Vui lòng chọn nhóm');
      return;
    }
    if (selectedMemberIds.length === 0) {
      setError('Vui lòng chọn ít nhất một thành viên');
      return;
    }
    try {
      setLoading(true);
      await teamApi.addMembers(Number(teamId), selectedMemberIds);
      message.success('Thêm thành viên vào nhóm thành công');
      resetForm();
      onClose();
      onCreated?.();
    } catch (err: unknown) {
      message.error(getErrorMessage(err) || 'Thêm thành viên vào nhóm thất bại');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTeamId('');
    setSelectedMemberIds([]);
    setMemberSearch('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const allFilteredSelected =
    filteredMembers.length > 0 && filteredMembers.every((m) => selectedMemberIds.includes(m.memberId));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedMemberIds((prev) => prev.filter((id) => !filteredMembers.some((m) => m.memberId === id)));
    } else {
      setSelectedMemberIds((prev) => {
        const add = filteredMembers.map((m) => m.memberId).filter((id) => !prev.includes(id));
        return [...prev, ...add];
      });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Thêm thành viên vào nhóm"
      description="Chọn nhóm và các thành viên cần thêm"
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-black font-medium">
            Nhóm <span className="text-red-500">*</span>
          </Label>
          <Select value={teamId || undefined} onValueChange={setTeamId}>
            <SelectTrigger className="h-9 w-full text-black border-gray-200">
              <SelectValue placeholder="Chọn nhóm" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((t) => (
                <SelectItem key={t.teamId} value={String(t.teamId)} className="text-black">
                  {t.teamName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-black font-medium">
            Thành viên <span className="text-red-500">*</span>
          </Label>
          <Input
            placeholder="Tìm theo tên hoặc email..."
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            className="h-9 text-black placeholder:text-gray-500 border-gray-200 mb-1"
          />
          <div
            className={cn(
              'border border-gray-200 rounded-md overflow-hidden max-h-[200px] overflow-y-auto no-scrollbar'
            )}
          >
            {filteredMembers.length === 0 ? (
              <p className="p-3 text-sm text-gray-500 text-center">Không có thành viên</p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100 w-full text-left"
                >
                  {allFilteredSelected ? (
                    <Check size={16} className="text-[#2197C0] shrink-0" />
                  ) : (
                    <Square size={16} className="text-gray-400 shrink-0" />
                  )}
                  <span className="text-sm text-black font-medium">Chọn tất cả</span>
                </button>
                {filteredMembers.map((m) => {
                  const isSelected = selectedMemberIds.includes(m.memberId);
                  return (
                    <button
                      key={m.memberId}
                      type="button"
                      onClick={() => handleToggleMember(m.memberId)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 w-full text-left border-b border-gray-100 last:border-0',
                        isSelected ? 'bg-[#2197C0]/10' : 'hover:bg-gray-50'
                      )}
                    >
                      {isSelected ? (
                        <Check size={16} className="text-[#2197C0] shrink-0" />
                      ) : (
                        <Square size={16} className="text-gray-400 shrink-0" />
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm text-black truncate">{m.fullName}</span>
                        <span className="text-xs text-gray-500 truncate">{m.email}</span>
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>
          {selectedMemberIds.length > 0 && (
            <p className="text-xs text-gray-500">Đã chọn {selectedMemberIds.length} thành viên</p>
          )}
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
            {loading ? 'Đang thêm...' : 'Thêm vào nhóm'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
