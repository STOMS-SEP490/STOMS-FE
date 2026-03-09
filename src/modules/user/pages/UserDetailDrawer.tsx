import { X } from 'lucide-react';
import type { User } from '@/modules/user/user';
import { ROLE_MAP } from '@/constants/role';
import { Badge } from '@/shared/components/ui/badge';

type Props = {
  open: boolean;
  onClose: () => void;
  user: User | null;
};

export default function UserDetailDrawer({ open, onClose, user }: Props) {
  if (!user) return null;

  const roleName = ROLE_MAP[user.roleId] ?? '—';

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-40 h-full" onClick={onClose} aria-hidden />}
      <div
        className={`fixed top-0 right-0 h-full w-[400px] bg-[#f3f4f6] z-50 shadow-xl
        transition-transform duration-300
        ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full overflow-y-auto p-6 text-gray-700">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-lg font-semibold">Chi tiết tài khoản</h2>
            <button type="button" onClick={onClose} className="p-1 hover:bg-black/10 rounded">
              <X size={20} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 font-medium">User ID</p>
              <p className="text-sm">{user.userId}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Email</p>
              <p className="text-sm">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Vai trò</p>
              <Badge className="bg-blue-100 text-blue-700">{roleName}</Badge>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Trạng thái</p>
              {user.isActive ? (
                <Badge className="bg-green-100 text-green-700">Hoạt động</Badge>
              ) : (
                <Badge className="bg-red-100 text-red-600">Vô hiệu hóa</Badge>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Ngày tạo</p>
              <p className="text-sm">{new Date(user.createdAt).toLocaleString('vi-VN')}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
