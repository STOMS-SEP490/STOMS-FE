import { X } from 'lucide-react';
import type { MemberDetail } from '@/modules/user/user';
import { ROLE_MAP } from '@/constants/role';
import { Badge } from '@/shared/components/ui/badge';

type Props = {
  open: boolean;
  onClose: () => void;
  member: MemberDetail | null;
};

export default function RightSidebarUserDetail({ open, onClose, member }: Props) {
  if (!member) return null;

  const roleLabel = member.user?.roleId ? ROLE_MAP[member.user.roleId] : '—';
  console.log(member);
  return (
    <>
      {/* Overlay */}
      {open && <div className="fixed inset-0 bg-black/30 z-40 h-full" onClick={onClose} />}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-[600px] bg-[#f3f4f6] z-50
        transition-transform duration-300
        ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar text-gray-700">
          {/* HEADER */}
          <div className="px-8 py-6 bg-[#f3f4f6] ">
            <div className="flex justify-between items-start">
              <div className="flex gap-4">
                <img
                  src={member.avatarUrl || '/img/ava.png'}
                  className="w-16 h-16 rounded-full object-cover"
                />

                <div>
                  <h2 className="text-lg font-semibold">{member.fullName}</h2>

                  <p className="text-sm text-gray-500">{member.user?.email ?? '—'}</p>

                  <div className="flex gap-2 mt-2">
                    {member.teamId && (
                      <Badge className="bg-green-100 text-green-700">Team #{member.teamId}</Badge>
                    )}

                    <Badge className="bg-blue-100 text-blue-700">{roleLabel}</Badge>
                  </div>
                </div>
              </div>

              <button onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mt-4 mb-0">
              <div>
                {' '}
                <p className="text-xs text-gray-400 font-semibold">ID THÀNH VIÊN</p>
                <p>{member.memberId}</p>{' '}
              </div>{' '}
              <div>
                {' '}
                <p className="text-xs text-gray-400 font-semibold">VAI TRÒ</p>
                <p>{roleLabel}</p>{' '}
              </div>{' '}
              <div>
                {' '}
                <p className="text-xs text-gray-400 font-semibold">NGÀY THAM GIA</p>
                <p>{formatDate(member.createdAt)}</p>{' '}
              </div>{' '}
              <div>
                {' '}
                <p className="text-xs text-gray-400 font-semibold">CẬP NHẬT LẦN CUỐI</p>
                <p>{formatDateTime(member.updatedAt)}</p>{' '}
              </div>
            </div>
          </div>

          {/* ACCOUNT INFO */}
          <Section title="Thông tin tài khoản">
            <Field label="User ID" value={member.user?.userId} />
            <Field label="Email" value={member.user?.email} />
            <Field
              label="Trạng thái"
              value={
                member.user?.isActive ? (
                  <Badge className="bg-green-100 text-green-700">Đang hoạt động</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-700">Đã khóa</Badge>
                )
              }
            />
            <Field label="Ngày tạo tài khoản" value={formatDateTime(member.user?.createdAt)} />
            <Field label="Cập nhật tài khoản" value={formatDateTime(member.user?.updatedAt)} />
          </Section>

          {/* MEMBER INFO */}
          <Section title="Thông tin cá nhân">
            <Field label="Họ và tên" value={member.fullName} />
            <Field label="Số điện thoại" value={member.phone} />
            <Field label="Địa chỉ" value={member.address} />
            <Field label="CMND/CCCD" value={member.cin} />
            <Field label="Mã số thuế" value={member.taxNumber} />
            <Field label="Mã ngân hàng" value={member.bankCode} />
            <Field label="Tên ngân hàng" value={member.bankName} />
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
