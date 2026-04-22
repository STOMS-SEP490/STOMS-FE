import { useAuth } from '@/app/providers/AuthProvider';
import { getHomePathByRole, getRoleIdFromStorage } from '@/modules/auth/roleAccess';
import { getStoredAuthUser } from '@/modules/auth/authStorage';
import { notification } from 'antd';
import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

type RoleGuardProps = {
  allowedRoles: number[];
  children: ReactElement;
};

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user } = useAuth();
  const location = useLocation();

  const accessToken = localStorage.getItem('accessToken');
  const roleId = Number(user?.role ?? getRoleIdFromStorage());
  const isRoleValid = !Number.isNaN(roleId);

  if (!accessToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!isRoleValid) {
    const stored = getStoredAuthUser();
    const hasMultipleRoles =
      stored?.userRoleId != null &&
      stored?.memberRoleId != null &&
      stored.userRoleId !== stored.memberRoleId;
    if (hasMultipleRoles) {
      return <Navigate to="/choose-role" replace state={{ from: location.pathname }} />;
    }
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!allowedRoles.includes(roleId)) {
    try {
      const key = `no-permission:${roleId}:${location.pathname}`;
      if (sessionStorage.getItem(key) !== '1') {
        sessionStorage.setItem(key, '1');
        notification.warning({
          message: 'Bạn không có quyền truy cập',
          description: 'Tài khoản của bạn không được phép truy cập trang này.',
          placement: 'bottomRight',
          duration: 3,
        });
      }
    } catch {
      // ignore storage errors (private mode, disabled storage, etc.)
    }
    return <Navigate to={getHomePathByRole(roleId)} replace />;
  }

  return children;
}
