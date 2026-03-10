import { useState, useEffect } from 'react';
import { message } from 'antd';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import memberApi from '@/modules/member/api/memberApi';
import memberSkillApi from '@/modules/member/api/memberSkillApi';
import userApi from '@/modules/user/api/userApi';
import { teamApi } from '@/modules/team/api/teamApi';
import skillApi from '@/modules/skill/api/skillApi';
import type { Team } from '@/modules/team/team';
import type { MemberDetail } from '@/modules/member/member';
import type { SkillListItem } from '@/modules/skill/skill';
import { ROLE_MAP } from '@/constants/role';
import { Dialog } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';

type Props = {
  open: boolean;
  onClose: () => void;
  memberId: number | null;
  onUpdated?: () => void;
};

const ROLE_OPTIONS = [1, 2, 3, 4, 5].map((id) => ({
  value: id,
  label: ROLE_MAP[id] ?? `Vai trò ${id}`,
}));

export default function MemberEditModal({ open, onClose, memberId, onUpdated }: Props) {
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [teamId, setTeamId] = useState<number>(0);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [cin, setCin] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState<number>(4);
  const [isActive, setIsActive] = useState(true);

  const [allSkills, setAllSkills] = useState<SkillListItem[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
  const [currentMemberSkillIds, setCurrentMemberSkillIds] = useState<number[]>([]);

  useEffect(() => {
    if (open) {
      teamApi.getTeams({ pageSize: 500 }).then((res) => setTeams(res.items ?? []));
      skillApi.getSkills({ pageSize: 500 }).then((res) => setAllSkills(res.items ?? []));
    }
  }, [open]);

  useEffect(() => {
    if (!open || !memberId) {
      setMember(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([memberApi.getMemberById(memberId), memberSkillApi.getByMember(memberId)])
      .then(([data, memberSkills]) => {
        if (!cancelled) {
          setMember(data);
          setFullName(data.fullName ?? '');
          setTeamId(data.teamId ?? 0);
          setPhone(data.phone ?? '');
          setAddress(data.address ?? '');
          setCin(data.cin ?? '');
          setBankCode(data.bankCode ?? '');
          setBankName(data.bankName ?? '');
          setTaxNumber(data.taxNumber ?? '');
          setEmail(data.user?.email ?? '');
          setRoleId(data.user?.roleId ?? 4);
          setIsActive(data.user?.isActive ?? true);
          const ids = memberSkills.map((s) => s.skillId);
          setCurrentMemberSkillIds(ids);
          setSelectedSkillIds(ids);
        }
      })
      .catch((err) => {
        if (!cancelled) message.error(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, memberId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    if (!fullName.trim()) {
      message.warning('Vui lòng nhập họ tên');
      return;
    }
    if (!teamId) {
      message.warning('Vui lòng chọn nhóm');
      return;
    }
    try {
      setSaving(true);
      await memberApi.updateMember(member.memberId, {
        teamId,
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        cin: cin.trim(),
        bankCode: bankCode.trim(),
        bankName: bankName.trim(),
        taxNumber: taxNumber.trim(),
        // giữ avatar hiện tại để tránh bị clear nếu BE ghi đè null
        avatarUrl: member.avatarUrl ?? undefined,
      });
      if (member.user?.userId) {
        await userApi.updateUser(member.user.userId, {
          email: email.trim(),
          isActive,
          roleId,
        });
      }
      const toAdd = selectedSkillIds.filter((id) => !currentMemberSkillIds.includes(id));
      const toRemove = currentMemberSkillIds.filter((id) => !selectedSkillIds.includes(id));
      for (const skillId of toRemove) {
        await memberSkillApi.remove(member.memberId, skillId);
      }
      if (toAdd.length > 0) {
        await memberSkillApi.assignBulk(member.memberId, toAdd);
      }
      message.success('Cập nhật thành viên thành công');
      onClose();
      onUpdated?.();
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!memberId) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Chỉnh sửa thành viên"
      description="Cập nhật thông tin thành viên và tài khoản"
      className="max-w-lg max-h-[90vh] overflow-y-auto"
    >
      {loading ? (
        <p className="py-8 text-center text-gray-500">Đang tải...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Họ tên</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full" />
          </div>
          <div className="space-y-2">
            <Label>Nhóm</Label>
            <Select value={teamId ? String(teamId) : ''} onValueChange={(v) => setTeamId(Number(v))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn nhóm" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.teamId} value={String(t.teamId)}>
                    {t.teamName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Điện thoại</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email (tài khoản)</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Địa chỉ</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>CMND/CCCD</Label>
              <Input value={cin} onChange={(e) => setCin(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Mã số thuế</Label>
              <Input value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Mã ngân hàng</Label>
              <Input value={bankCode} onChange={(e) => setBankCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tên ngân hàng</Label>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <Label>Vai trò</Label>
            <Select value={String(roleId)} onValueChange={(v) => setRoleId(Number(v))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>Trạng thái hoạt động</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <div className="space-y-2 border-t pt-4">
            <Label>Kỹ năng</Label>
            <div className="stoms-scrollbar max-h-40 overflow-y-auto rounded-md border bg-muted/20 p-3 pr-2">
              {allSkills.length === 0 ? (
                <p className="text-sm text-muted-foreground">Đang tải kỹ năng...</p>
              ) : (
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {allSkills.map((skill) => (
                    <label
                      key={skill.skillId}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSkillIds.includes(skill.skillId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSkillIds((prev) => [...prev, skill.skillId]);
                          } else {
                            setSelectedSkillIds((prev) => prev.filter((id) => id !== skill.skillId));
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span>{skill.skillName}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Hủy
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#2197C0] hover:bg-[#208AAE] text-white"
              disabled={saving}
            >
              {saving ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
