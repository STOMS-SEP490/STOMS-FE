import UserManagement from '@/pages/Manager/UsersManagement';
import ManagerDashboard from '../pages/Manager/Dashboard';
import CoursesManagement from '../pages/Manager/CoursesManagement';
import TopicsManagement from '@/pages/Manager/TopicsManagement';
import CoursesLayout from '@/layouts/CoursesManagementLayout';
import SubjectsManagement from '@/pages/Manager/SubjectsManagement';

const ManagerRoutes = [
  { path: 'dashboard', element: <ManagerDashboard /> },
{
    path: 'courses',
    element: <CoursesLayout />,
    children: [
      { index: true, element: <CoursesManagement /> },
      { path: 'subjects', element: <SubjectsManagement /> },
    ],
  },  { path: 'users', element: <UserManagement /> },
  { path: 'topics', element: <TopicsManagement /> },


];

export default ManagerRoutes;
