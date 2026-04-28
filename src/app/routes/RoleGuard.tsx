import { useAuth } from '@/app/providers/AuthProvider';
import { getHomePathByRole, getRoleIdFromStorage } from '@/modules/auth/roleAccess';
import { getStoredAuthUser } from '@/modules/auth/authStorage';
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
    return <Navigate to={getHomePathByRole(roleId)} replace />;
  }

  return children;
}
