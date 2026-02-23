import UserManagement from '@/pages/Manager/UsersManagement';
import ManagerDashboard from '../pages/Manager/Dashboard';
import CoursesManagement from '../pages/Manager/CoursesManagement';
import TopicsManagement from '@/pages/Manager/TopicsManagement';

const ManagerRoutes = [
  { path: 'dashboard', element: <ManagerDashboard /> },
  { path: 'courses', element: <CoursesManagement /> },
  { path: 'users', element: <UserManagement /> },
  { path: 'categories', element: <TopicsManagement /> },


];

export default ManagerRoutes;
