import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { MemberDetail } from '@/modules/member/member';
import { getRoleLabel, getRoleBadgeClass } from '@/constants/role';
import { Badge } from '@/shared/components/ui/badge';
import memberSkillApi from '@/modules/member/api/memberSkillApi';
import skillApi from '@/modules/skill/api/skillApi';
import type { SkillListItem } from '@/modules/skill/skill';
import type { PaginationResponse } from '@/shared/types/api';

type Props = {
  open: boolean;
  onClose: () => void;
  member: MemberDetail | null;
};

export default function MemberDetailSidebar({ open, onClose, member }: Props) {
  const [skillNames, setSkillNames] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !member?.memberId) {
      setSkillNames([]);
      return;
    }
    let cancelled = false;
    Promise.all([memberSkillApi.getByMember(member.memberId), skillApi.getSkills({ pageSize: 500 })])
      .then(([memberSkills, skillsRes]) => {
        if (cancelled) return;
        const allSkills = (skillsRes as PaginationResponse<SkillListItem>).items ?? [];
        // Chỉ hiện MemberSkill đang bật; isActive === false thì ẩn; undefined coi như true (API cũ)
        const activeOnly = memberSkills.filter((s) => s.isActive !== false);
        const ids = new Set(activeOnly.map((s) => s.skillId));
        const names = allSkills.filter((s) => ids.has(s.skillId)).map((s) => s.skillName);
        setSkillNames(names);
      })
      .catch(() => setSkillNames([]));
    return () => {
      cancelled = true;
    };
  }, [open, member?.memberId]);

  if (!member) return null;

  const hasRole = member.roleId != null;
  const roleLabel = hasRole ? getRoleLabel(member.roleId) : '—';

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-40 h-full" onClick={onClose} />}

      <div
        className={`fixed top-0 right-0 h-full w-[600px] bg-[#f3f4f6] z-50
        transition-transform duration-300
        ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar text-gray-700">
          <div className="px-8 py-6 bg-[#f3f4f6] ">
            <div className="flex justify-between items-start">
              <div className="flex gap-4">
                <img
                  src={member.avatarUrl || '/img/ava.png'}
                  className="w-16 h-16 rounded-full object-cover"
                  alt=""
                />
                <div>
                  <h2 className="text-lg font-semibold">{member.fullName}</h2>
                  <p className="text-sm text-gray-500">{member.email ?? '—'}</p>
                  <div className="flex gap-2 mt-2">
                    {member.team?.teamName && (
                      <Badge className="bg-green-100 text-green-700">{member.team.teamName}</Badge>
                    )}
                    <Badge
                      className={
                        hasRole
                          ? `${getRoleBadgeClass(member.roleId)} border`
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }
                    >
                      {roleLabel}
                    </Badge>
                  </div>
                </div>
              </div>
              <button type="button" onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mt-4 mb-0">
              <div>
                <p className="text-xs text-gray-400 font-semibold">ID THÀNH VIÊN</p>
                <p>{member.memberId}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold">VAI TRÒ</p>
                <p>{roleLabel}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold">NGÀY THAM GIA</p>
                <p>{formatDate(member.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-semibold">CẬP NHẬT LẦN CUỐI</p>
                <p>{formatDateTime(member.updatedAt)}</p>
              </div>
            </div>
          </div>

          <Section title="Thông tin tài khoản">
            <Field label="User ID" value={member.userId} />
            <Field label="Email" value={member.email} />
            <Field label="Vai trò (roleId)" value={member.roleId != null ? `${member.roleId} — ${roleLabel}` : '—'} />
            <Field
              label="Trạng thái"
              value={
                member.isActive ? (
                  <Badge className="bg-green-100 text-green-700">Đang hoạt động</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-700">Đã khóa</Badge>
                )
              }
            />
            <Field label="Ngày tạo tài khoản" value={formatDateTime(member.userCreatedAt)} />
            <Field label="Cập nhật tài khoản" value={formatDateTime(member.userUpdatedAt)} />
            <Field label="Khóa tài khoản lúc" value={formatDateTime(member.userLockedAt)} />
          </Section>

        

          <Section title="Thông tin cá nhân">
            <Field label="Họ và tên" value={member.fullName} />
            <Field label="Số điện thoại" value={member.phone} />
            <Field label="Địa chỉ" value={member.address} />
            <Field label="CMND/CCCD" value={member.cin} />
            <Field label="Mã số thuế" value={member.taxNumber} />
            <Field label="Mã ngân hàng" value={member.bankCode} />
            <Field label="Tên ngân hàng" value={member.bankName} />
            <Field label="Tên nhóm" value={member.team?.teamName ?? '—'} />
          </Section>

          <Section title="Kỹ năng">
            <div className="col-span-2">
              <p className="text-xs text-gray-400 mb-1">Các kỹ năng đã gán</p>
              <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm">
                {skillNames.length === 0 ? (
                  <span className="text-gray-500">Chưa có kỹ năng nào</span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {skillNames.map((name) => (
                      <Badge key={name} variant="secondary" className="bg-blue-50 text-blue-700">
                        {name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-6 bg-white rounded-xl shadow-sm mx-6 m-2 space-y-4">
      <h3 className="font-semibold">{title}</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm">
        {value ?? '—'}
      </div>
    </div>
  );
}

function formatDate(date?: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('vi-VN');
}

function formatDateTime(date?: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleString('vi-VN');
}
