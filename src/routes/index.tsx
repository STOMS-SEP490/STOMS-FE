import PCLayout from '@/layouts/PCLayout';
import AuthLayout from '../layouts/AuthLayout';
import MainLayout from '../layouts/MainLayout';
import AuthPageRoutes from './AuthPageRoutes';
import ManagerRoutes from './ManagerRoutes';
import ProgramCoordinatorRoutes from './ProgramCoordinatorRoutes';

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
    path: '/manager',
    element: <MainLayout />,
    children: [...ManagerRoutes],
  },
];

export default routes;
