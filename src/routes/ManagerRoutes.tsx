import UserManagement from '@/pages/Manager/UsersManagement';
import ManagerDashboard from '../pages/Manager/Dashboard';
import CoursesManagement from '../pages/Manager/CoursesManagement';
import TopicsManagement from '@/pages/Manager/TopicsManagement';
import CoursesLayout from '@/layouts/CoursesManagementLayout';
import SubjectsManagement from '@/pages/Manager/SubjectsManagement';
import EquipmentsManagement from '@/pages/Manager/EquipmentsManagement';
import CategoriesManagement from '@/pages/Manager/CategoriesManagement';
import EquipmentsManagementLayout from '@/layouts/EquipmentsManagementLayout';

const ManagerRoutes = [
  { path: 'dashboard', element: <ManagerDashboard /> },
{
    path: 'courses',
    element: <CoursesLayout />,
    children: [
      { index: true, element: <CoursesManagement /> },
      { path: 'subjects', element: <SubjectsManagement /> },
    ],
  },  
  { path: 'users', element: <UserManagement /> },
  { path: 'topics', element: <TopicsManagement /> },
{
    path: 'equipments',
    element: <EquipmentsManagementLayout />,
    children: [
      { index: true, element: <EquipmentsManagement /> },
      { path: 'categories', element: <CategoriesManagement /> },
    ],
  }, 

];

export default ManagerRoutes;
