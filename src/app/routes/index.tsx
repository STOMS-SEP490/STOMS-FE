import PCLayout from '@/app/layouts/PCLayout';
import EquipmentLayout from '@/app/layouts/EquipmentLayout';
import AuthLayout from '../layouts/AuthLayout';
import MainLayout from '../layouts/MainLayout';
import TeacherLayout from '../layouts/TeacherLayout';
import TeamLeaderLayout from '../layouts/TeamLeaderLayout';
import AuthPageRoutes from './AuthPageRoutes';
import ManagerRoutes from './ManagerRoutes';
import ProgramCoordinatorRoutes from './ProgramCoordinatorRoutes';
import EquipmentManagerRoutes from './EquipmentManagerRoutes';
import TeacherRoutes from './TeacherRoutes';
import TeamLeaderRoutes from './TeamLeaderRoutes';
import RoleGuard from './RoleGuard';
import { ROLE_ID } from '@/constants/role';

const routes = [
  {
    path: '/',
    element: <AuthLayout />,
    children: [...AuthPageRoutes],
  },

  {
    path: '/pc',
    element: (
      <RoleGuard allowedRoles={[ROLE_ID.PROGRAM_COORDINATOR]}>
        <PCLayout />
      </RoleGuard>
    ),
    children: [...ProgramCoordinatorRoutes],
  },

  {
    path: '/em',
    element: (
      <RoleGuard allowedRoles={[ROLE_ID.EQUIPMENT_MANAGER]}>
        <EquipmentLayout />
      </RoleGuard>
    ),
    children: [...EquipmentManagerRoutes],
  },

  {
    path: '/manager',
    element: (
      <RoleGuard allowedRoles={[ROLE_ID.MANAGER]}>
        <MainLayout />
      </RoleGuard>
    ),
    children: [...ManagerRoutes],
  },

  {
    path: '/teacher',
    element: (
      <RoleGuard allowedRoles={[ROLE_ID.TEACHER, ROLE_ID.ASSISTANT]}>
        <TeacherLayout />
      </RoleGuard>
    ),
    children: [...TeacherRoutes],
  },

  {
    path: '/tl',
    element: (
      <RoleGuard allowedRoles={[ROLE_ID.TEAM_LEADER]}>
        <TeamLeaderLayout />
      </RoleGuard>
    ),
    children: [...TeamLeaderRoutes],
  },
];

export default routes;
