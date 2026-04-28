import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';

import { Button } from '@/shared/components/ui/button';
import { getRoleLabel } from '@/constants/role';
import { useAuth } from '@/app/providers/AuthProvider';
import { getHomePathByRole } from '@/modules/auth/roleAccess';
import { getStoredAuthUser, setActiveRoleIdInStorage } from '@/modules/auth/authStorage';

export default function ChooseRole() {
  const navigate = useNavigate();
  const { login: setCurrentUser } = useAuth();

  const stored = getStoredAuthUser();
  const accessToken = localStorage.getItem('accessToken');

  const options = useMemo(() => {
    const items: { roleId: number; source: 'user' | 'member' }[] = [];
    if (stored?.userRoleId != null) items.push({ roleId: stored.userRoleId, source: 'user' });
    if (stored?.memberRoleId != null) items.push({ roleId: stored.memberRoleId, source: 'member' });

    // Nếu trùng roleId thì chỉ hiển thị 1 option, ưu tiên label "Vai trò hệ thống"
    const seen = new Set<number>();
    return items.filter((x) => {
      if (seen.has(x.roleId)) return false;
      seen.add(x.roleId);
      return true;
    });
  }, [stored?.memberRoleId, stored?.userRoleId]);

  useEffect(() => {
    if (!accessToken || !stored?.userId || !stored?.email) {
      navigate('/login', { replace: true });
      return;
    }

    // đã chọn role rồi thì vào thẳng
    if (stored.roleId != null) {
      navigate(getHomePathByRole(stored.roleId), { replace: true });
      return;
    }

    if (options.length <= 1) {
      const only = options[0];
      if (only != null) {
        setActiveRoleIdInStorage(only.roleId);
        setCurrentUser({
          id: stored.userId,
          email: stored.email,
          fullName: stored.email,
          role: String(only.roleId),
          token: accessToken,
        });
        navigate(getHomePathByRole(only.roleId), { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    }
  }, [accessToken, stored?.email, stored?.roleId, stored?.userId, navigate, options, setCurrentUser]);

  const pick = (roleId: number) => {
    if (!accessToken || !stored?.userId || !stored?.email) {
      navigate('/login', { replace: true });
      return;
    }

    setActiveRoleIdInStorage(roleId);
    setCurrentUser({
      id: stored.userId,
      email: stored.email,
      fullName: stored.email,
      role: String(roleId),
      token: accessToken,
    });
    message.success(`Đăng nhập với tư cách: ${getRoleLabel(roleId)}`);
    navigate(getHomePathByRole(roleId), { replace: true });
  };

  return (
    <div className="w-full max-w-xl">
      <h2 className="text-3xl font-bold text-white">CHỌN TƯ CÁCH ĐĂNG NHẬP</h2>
      <p className="text-sm text-white/80 mt-2 mb-6">
        Tài khoản của bạn có nhiều tư cách. Vui lòng chọn để tiếp tục.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.slice(0, 2).map((opt) => (
          <div
            key={`${opt.source}-${opt.roleId}`}
            className="text-left rounded-2xl border border-sky-100/60 bg-white/95 px-4 py-4 shadow-[0_10px_30px_rgba(2,132,199,0.18)] hover:bg-white transition cursor-pointer"
            onClick={() => pick(opt.roleId)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && pick(opt.roleId)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {opt.source === 'user' ? 'Vai trò hệ thống' : 'Vai trò thành viên'}
                </div>
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {getRoleLabel(opt.roleId)}
                </div>
                
              </div>
            </div>
            <div className="mt-3">
              <Button className="bg-[#208aae] hover:bg-[#1f819f] text-white w-full" type="button">
                Tiếp tục
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

