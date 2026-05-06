import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';

import { Button } from '@/shared/components/ui/button';
import { useAuth } from '@/app/providers/AuthProvider';
import { getHomePathByRole } from '@/modules/auth/roleAccess';
import { saveAuthToStorage, type RoleSelectionRequiredResponse } from '@/modules/auth/authStorage';
import authService from '@/modules/auth/api/authApi';

export default function ChooseRole() {
  const navigate = useNavigate();
  const { login: setCurrentUser } = useAuth();

  const [roleSelection, setRoleSelection] = useState<RoleSelectionRequiredResponse | null>(null);
  const [loadingRoleId, setLoadingRoleId] = useState<number | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('roleSelection');
    if (!raw) {
      navigate('/login', { replace: true });
      return;
    }

    try {
      const parsed = JSON.parse(raw) as RoleSelectionRequiredResponse;
      if (!parsed.loginSessionToken || !parsed.availableRoles?.length) {
        navigate('/login', { replace: true });
        return;
      }
      setRoleSelection(parsed);
    } catch {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const pick = async (roleId: number) => {
    if (!roleSelection || loadingRoleId != null) return;

    setLoadingRoleId(roleId);
    try {
      const res = await authService.selectRole({
        loginSessionToken: roleSelection.loginSessionToken,
        selectedRoleId: roleId,
        platform: 'web',
        deviceName: navigator.userAgent,
        fcmToken: '',
      });

      sessionStorage.removeItem('roleSelection');
      saveAuthToStorage(res);
      setCurrentUser({
        id: res.userId,
        email: res.email,
        fullName: res.email,
        role: String(res.activeRoleId),
        token: res.accessToken,
      });

      message.success(`Đăng nhập thành công`);
      navigate(getHomePathByRole(res.activeRoleId), { replace: true });
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: unknown } };
      const data = axiosErr?.response?.data;
      const msg =
        (typeof data === 'string' && data) ||
        (typeof data === 'object' &&
          data !== null &&
          'message' in data &&
          String((data as Record<string, unknown>).message)) ||
        'Chọn tư cách thất bại. Vui lòng thử lại.';
      message.error(msg);
    } finally {
      setLoadingRoleId(null);
    }
  };

  if (!roleSelection) return null;

  return (
    <div className="w-full max-w-xl">
      <h2 className="text-3xl font-bold text-white">CHỌN TƯ CÁCH ĐĂNG NHẬP</h2>
      <p className="text-sm text-white/80 mt-2 mb-6">
        Tài khoản của bạn có nhiều tư cách. Vui lòng chọn để tiếp tục.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {roleSelection.availableRoles.map((role) => (
          <div
            key={role.roleId}
            className="text-left rounded-2xl border border-sky-100/60 bg-white/95 px-4 py-4 shadow-[0_10px_30px_rgba(2,132,199,0.18)] hover:bg-white transition cursor-pointer"
            onClick={() => pick(role.roleId)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && pick(role.roleId)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {role.roleName}
                </div>
              </div>
            </div>
            <div className="mt-3">
              <Button
                className="bg-[#208aae] hover:bg-[#1f819f] text-white w-full"
                type="button"
                disabled={loadingRoleId != null}
              >
                {loadingRoleId === role.roleId ? 'Đang xử lý...' : 'Tiếp tục'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
