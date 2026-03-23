import { useState, useEffect } from 'react';
import { message } from 'antd';
import { Plus } from 'lucide-react';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import memberApi from '@/modules/member/api/memberApi';
import memberSkillApi, { type MemberSkillItem } from '@/modules/member/api/memberSkillApi';
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

const ROLE_OPTIONS = [1, 2, 3, 4, 5, 6].map((id) => ({
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
  /** Danh sách member-skill hiện tại (có isActive) — chỉ gọi API khi Lưu */
  const [memberSkills, setMemberSkills] = useState<MemberSkillItem[]>([]);
  const [initialMemberSkills, setInitialMemberSkills] = useState<MemberSkillItem[]>([]);
  const [pendingSkillIdsToAdd, setPendingSkillIdsToAdd] = useState<number[]>([]);
  const [showAddSkill, setShowAddSkill] = useState(false);

  useEffect(() => {
    if (open) {
      teamApi.getTeams({ pageSize: 500 }).then((res) => setTeams(res.items ?? []));
      skillApi
        .getSkills({ pageNumber: 1, pageSize: 500 })
        .then((res) => setAllSkills((res.items ?? []).filter((s) => s?.isActive)))
        .catch(() => setAllSkills([]));
    }
  }, [open]);

  useEffect(() => {
    if (!open || !memberId) {
      setMember(null);
      setMemberSkills([]);
      setInitialMemberSkills([]);
      setPendingSkillIdsToAdd([]);
      setShowAddSkill(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([memberApi.getMemberById(memberId), memberSkillApi.getByMember(memberId)])
      .then(([data, msItems]) => {
        if (cancelled) return;
        setMember(data);
        setFullName(data.fullName ?? '');
        setTeamId(data.teamId ?? 0);
        setPhone(data.phone ?? '');
        setAddress(data.address ?? '');
        setCin(data.cin ?? '');
        setBankCode(data.bankCode ?? '');
        setBankName(data.bankName ?? '');
        setTaxNumber(data.taxNumber ?? '');
        setEmail(data.email ?? '');
        setRoleId(data.roleId ?? 4);
        setIsActive(data.isActive ?? true);

        skillApi.getSkills({ pageNumber: 1, pageSize: 500 }).then((res) => {
          if (cancelled) return;
          const skillItems = (res.items ?? []) as SkillListItem[];
          const withName: MemberSkillItem[] = msItems.map((it) => {
            const s = skillItems.find((x) => x.skillId === it.skillId);
            return {
              ...it,
              skillName: s?.skillName ?? `Skill #${it.skillId}`,
            };
          });
          setMemberSkills(withName);
          setInitialMemberSkills(withName.map((x) => ({ ...x })));
          setPendingSkillIdsToAdd([]);
          setShowAddSkill(false);
        });
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
        avatarUrl: member.avatarUrl ?? undefined,
      });
      if (member.userId) {
        await userApi.updateUser(member.userId, {
          email: email.trim(),
          isActive,
          roleId,
        });
      }

      // 1) Bật/tắt isActive (bulk) — so với lúc mở modal; chạy trước assignBulk
      const originalMap = new Map<number, boolean>(
        initialMemberSkills.map((ms) => [ms.skillId, ms.isActive ?? true]),
      );
      const currentMap = new Map<number, boolean>(
        memberSkills.map((ms) => [ms.skillId, ms.isActive ?? true]),
      );
      const toDeactivate: number[] = [];
      const toActivate: number[] = [];
      originalMap.forEach((orig, id) => {
        if (!currentMap.has(id)) return;
        const cur = currentMap.get(id) ?? orig;
        if (orig && !cur) toDeactivate.push(id);
        else if (!orig && cur) toActivate.push(id);
      });
      if (toDeactivate.length > 0) {
        await memberSkillApi.deactivateMany(member.memberId, toDeactivate);
      }
      if (toActivate.length > 0) {
        await memberSkillApi.activateMany(member.memberId, toActivate);
      }

      // 2) Gán thêm (bulk) — skill mới mặc định IsActive = true ở BE
      const toAddSkillIds = Array.from(
        new Set(pendingSkillIdsToAdd.filter((id) => !memberSkills.some((ms) => ms.skillId === id))),
      );
      if (toAddSkillIds.length > 0) {
        await memberSkillApi.assignBulk(member.memberId, toAddSkillIds);
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

  /** Skill chưa có trong danh sách đã gán — tick chỉ đổi checkbox, không ẩn dòng */
  const skillsAvailableToAdd = allSkills.filter(
    (skill) => !memberSkills.some((ms) => ms.skillId === skill.skillId),
  );

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

          {/* Kỹ năng — cùng pattern môn học: Switch + thêm nhiều rồi Lưu */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label>Kỹ năng</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={() => setShowAddSkill(true)}
                disabled={allSkills.length === 0}
              >
                <Plus className="w-4 h-4" />
                Thêm kỹ năng
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Gạt để bật/tắt kỹ năng đã gán; thêm mới qua nút bên trên (tick nhiều ô rồi bấm Lưu).
            </p>
            <div className="stoms-scrollbar max-h-40 overflow-y-auto rounded-md border bg-muted/20 p-3 pr-2">
              {memberSkills.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Chưa gán kỹ năng nào. Nhấn &quot;Thêm kỹ năng&quot; để chọn.
                </p>
              ) : (
                <div className="space-y-2">
                  {memberSkills.map((ms) => {
                    const skillName =
                      ms.skillName ?? allSkills.find((s) => s.skillId === ms.skillId)?.skillName ?? `Skill #${ms.skillId}`;
                    const isActiveSkill = ms.isActive ?? true;
                    return (
                      <div
                        key={`${ms.memberId}-${ms.skillId}`}
                        className="flex items-center justify-between rounded-md border bg-white px-3 py-2"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-black truncate">{skillName}</span>
                          <span className="text-xs text-gray-500">ID: {ms.skillId}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-gray-500 hidden sm:inline">
                            {isActiveSkill ? 'Đang dùng' : 'Đang tắt'}
                          </span>
                          <Switch
                            checked={isActiveSkill}
                            onCheckedChange={(checked) => {
                              setMemberSkills((prev) =>
                                prev.map((item) =>
                                  item.skillId === ms.skillId ? { ...item, isActive: checked } : item,
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

          {showAddSkill && (
            <div className="space-y-2 rounded-md border bg-white p-3">
              <div className="flex items-center justify-between">
                <Label>Thêm kỹ năng</Label>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddSkill(false)}>
                  Đóng
                </Button>
              </div>
              <div className="text-xs text-gray-500 mb-1">
                Chọn một hoặc nhiều kỹ năng chưa gán; bấm <strong>Lưu</strong> để gán hàng loạt.
              </div>
              <div className="stoms-scrollbar max-h-40 overflow-y-auto rounded-md border bg-muted/20 p-3 pr-2">
                {skillsAvailableToAdd.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Đã gán hết kỹ năng có sẵn.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {skillsAvailableToAdd.map((skill) => {
                      const checked = pendingSkillIdsToAdd.includes(skill.skillId);
                      return (
                        <label
                          key={skill.skillId}
                          className="flex w-full cursor-pointer items-center gap-3 rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300"
                            checked={checked}
                            onChange={(e) => {
                              setPendingSkillIdsToAdd((prev) =>
                                e.target.checked
                                  ? [...prev, skill.skillId]
                                  : prev.filter((id) => id !== skill.skillId),
                              );
                            }}
                          />
                          <span className="flex-1">{skill.skillName}</span>
                          <span className="text-xs text-gray-400">#{skill.skillId}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

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
