import { Navigate, useLocation, useParams } from 'react-router-dom';
import CoursesManagement from '../../modules/course/pages/CoursesManagement';
import TopicsManagement from '@/modules/topic/pages/TopicsManagement';
import SubjectsManagement from '@/modules/subject/pages/SubjectsManagement';
import EquipmentsManagement from '@/modules/equipment/pages/EquipmentsManagement';
import CategoriesManagement from '@/modules/category/pages/CategoriesManagement';
import EquipmentsHistory from '@/modules/equipment/pages/EquipmentsHistory';
import ReservationsManagement from '@/modules/reservation/pages/ReservationsManagement';
import TeamsManagement from '@/modules/team/pages/TeamsManagement';
import ContractsManagement from '@/modules/contract/pages/ContractsManagement';
import EventsManagement from '@/modules/event/pages/EventsManagement';
import EventCalendar from '@/modules/timetable/pages/EventCalendar';
import TransactionLayout from '@/app/layouts/TransactionsLayout';
import Transactions from '@/modules/transaction/pages/Transaction';
import ExpenditureFund from '@/modules/transaction/pages/ExpenditureFund';
import ContributionFund from '@/modules/transaction/pages/ContributionFund';
import WalletsManagement from '@/modules/transaction/pages/WalletsManagement';
import AuditLogs from '@/modules/auditLog/pages/AuditLogs';
import SkillsManagement from '@/modules/skill/pages/SkillMangagement';
import UserManagement from '@/modules/user/pages/UsersManagement';
import RolesManagement from '@/modules/role/pages/RolesManagement';
import RequestLayout from '../layouts/RequestLayout';
import RequestDetail from '@/modules/request/pages/RequestDetail';
import MembersManagement from '@/modules/member/pages/MembersManagement';
import UserProfile from '@/modules/user/pages/UserProfile';
import TaskReportsManagement from '@/modules/task-report/pages/TaskReportsManagement';
import ManagerDashboard from '@/modules/dashboard/pages/ManagerDashboard';

const RequestPlaceholder = () => (
  <div className="p-6 text-sm text-gray-500">
    Chọn một yêu cầu ở danh sách bên trái để xem chi tiết và phân công.
  </div>
);

/** Cũ: /manager/requests/all/:id → /manager/requests/:id */
const RedirectOldRequestsAllId = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/manager/requests/${id ?? ''}`} replace />;
};

/** Cũ: /manager/requests-view/:id (readonly) → /manager/requests/:id */
const RedirectOldRequestsViewId = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/manager/requests/${id ?? ''}`} replace />;
};

/** Cũ: /manager/courses/subjects → /manager/subjects (giữ query string) */
const RedirectCoursesSubjectsToSubjects = () => {
  const { search } = useLocation();
  return <Navigate to={{ pathname: '/manager/subjects', search }} replace />;
};

const ManagerRoutes = [
  { index: true, element: <Navigate to="dashboard" replace /> },
  { path: 'dashboard', element: <ManagerDashboard /> },
  { path: 'events', element: <EventsManagement /> },
  { path: 'timetable', element: <EventCalendar /> },
  { path: 'courses/subjects', element: <RedirectCoursesSubjectsToSubjects /> },
  { path: 'courses', element: <CoursesManagement /> },
  { path: 'subjects', element: <SubjectsManagement /> },
  { path: 'profile', element: <UserProfile /> },
  { path: 'users', element: <UserManagement /> },
  { path: 'members', element: <MembersManagement /> },
  { path: 'tasks', element: <TaskReportsManagement /> },
  { path: 'roles', element: <RolesManagement /> },
  // { path: 'teams', element: <TeamsManagement /> },
  { path: 'contracts', element: <ContractsManagement /> },
  { path: 'topics', element: <TopicsManagement /> },
  { path: 'skills', element: <SkillsManagement /> },

  { path: 'logs', element: <AuditLogs /> },
  { path: 'requests-all', element: <Navigate to="/manager/requests" replace /> },
  {
    path: 'requests-view/:id',
    element: <RedirectOldRequestsViewId />,
  },
  {
    path: 'requests',
    element: <RequestLayout />,
    children: [
      { index: true, element: <RequestPlaceholder /> },
      { path: 'assignments', element: <RequestPlaceholder /> },
      { path: 'assignments/:id', element: <RequestDetail /> },
      { path: 'approval', element: <RequestPlaceholder /> },
      { path: 'approval/:id', element: <RequestDetail /> },
      { path: 'all', element: <Navigate to="/manager/requests" replace /> },
      { path: 'all/:id', element: <RedirectOldRequestsAllId /> },
      { path: ':id', element: <RequestDetail /> },
    ],
  },
  {
    path: 'equipments/history',
    element: <Navigate to="/manager/borrowings" replace />,
  },
  {
    path: 'equipments/reservations',
    element: <Navigate to="/manager/borrowings/reservations" replace />,
  },
  {
    path: 'equipments/history/reservations',
    element: <Navigate to="/manager/borrowings/reservations" replace />,
  },
  { path: 'equipments', element: <EquipmentsManagement /> },
  { path: 'equipments/categories', element: <CategoriesManagement /> },
  { path: 'borrowings/reservations', element: <ReservationsManagement /> },
  { path: 'borrowings', element: <EquipmentsHistory /> },
  {
    path: 'transactions',
    element: <TransactionLayout />,
    children: [
      { index: true, element: <Transactions /> },
      { path: 'expenditure', element: <ExpenditureFund /> },
      { path: 'contribution', element: <ContributionFund /> },
      { path: 'wallets', element: <WalletsManagement /> },
    ],
  },
  { path: 'teams', element: <TeamsManagement /> },
];

export default ManagerRoutes;
