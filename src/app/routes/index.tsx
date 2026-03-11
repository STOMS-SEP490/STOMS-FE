import PCLayout from '@/app/layouts/PCLayout';
import EquipmentLayout from '@/app/layouts/EquipmentLayout';
import AuthLayout from '../layouts/AuthLayout';
import MainLayout from '../layouts/MainLayout';
import TeacherLayout from '../layouts/TeacherLayout';
import AuthPageRoutes from './AuthPageRoutes';
import ManagerRoutes from './ManagerRoutes';
import ProgramCoordinatorRoutes from './ProgramCoordinatorRoutes';
import EquipmentManagerRoutes from './EquipmentManagerRoutes';
import TeacherRoutes from './TeacherRoutes';

const routes = [
  {
    path: '/',
    element: <AuthLayout />,
    children: [...AuthPageRoutes],
  },

  {
    path: '/pc',
    element: <PCLayout />,
    children: [...ProgramCoordinatorRoutes],
  },

  {
    path: '/em',
    element: <EquipmentLayout />,
    children: [...EquipmentManagerRoutes],
  },

  {
    path: '/manager',
    element: <MainLayout />,
    children: [...ManagerRoutes],
  },

  {
    path: '/teacher',
    element: <TeacherLayout />,
    children: [...TeacherRoutes],
  },
];

export default routes;
