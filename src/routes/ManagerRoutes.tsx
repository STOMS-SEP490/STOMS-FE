import ManagerDashboard from '../pages/Manager/Dashboard';
import CoursesManagement from '../pages/Manager/CoursesManagement/CoursesManagement';
import TopicsManagement from '@/pages/Manager/TopicsManagement/TopicsManagement';
import CoursesLayout from '@/layouts/CoursesManagementLayout';
import SubjectsManagement from '@/pages/Manager/SubjectsManagement/SubjectsManagement';
import EquipmentsManagement from '@/pages/Manager/EquipmentsManagement/EquipmentsManagement';
import CategoriesManagement from '@/pages/Manager/CategoriesManagement/CategoriesManagement';
import EquipmentsManagementLayout from '@/layouts/EquipmentsManagementLayout';
import EquipmentsHistory from '@/pages/Manager/EquipmentsManagement/EquipmentsHistory';
import TeamsManagement from '@/pages/Manager/TeamsManagement/TeamsManagement';
import ContractsManagement from '@/pages/Manager/ContractsManagement/ContractsManagement';
import EventsManagement from '@/pages/Manager/EventsManagement/EventsManagement';
import TransactionLayout from '@/layouts/TransactionsLayout';
import Transactions from '@/pages/Manager/Transactions/Transaction';
import ExpenditureFund from '@/pages/Manager/Transactions/ExpenditureFund';
import ContributionFund from '@/pages/Manager/Transactions/ContributionFund';
import AuditLogs from '@/pages/Manager/AuditLog/AuditLogs';
import UserManagement from '@/pages/Manager/UsersManagement/UsersManagement';
import RequestLayout from '@/layouts/RequestLayout';
import RequestDetail from '@/pages/Manager/RequestManagement/RequestDetail';
import SkillsManagement from '@/pages/Manager/SkillsManagement/SkillMangagement';
import MembersManagement from '@/pages/Manager/UsersManagement/MembersManagement';
import TeamLayout from '@/layouts/TeamLayout';

const ManagerRoutes = [
  { path: 'dashboard', element: <ManagerDashboard /> },
  { path: 'events', element: <EventsManagement /> },
  {
    path: 'courses',
    element: <CoursesLayout />,
    children: [
      { index: true, element: <CoursesManagement /> },
      { path: 'subjects', element: <SubjectsManagement /> },
    ],
  },
  { path: 'users', element: <UserManagement /> },
  // { path: 'teams', element: <TeamsManagement /> },
  { path: 'contracts', element: <ContractsManagement /> },
  { path: 'topics', element: <TopicsManagement /> },
  { path: 'skills', element: <SkillsManagement /> },

  { path: 'logs', element: <AuditLogs /> },
  {
    path: 'requests',
    element: <RequestLayout />,
    children: [
      { index: true, element: <RequestDetail /> },
      { path: ':id', element: <RequestDetail /> },
    ],
  },
  {
    path: 'equipments',
    element: <EquipmentsManagementLayout />,
    children: [
      { index: true, element: <EquipmentsManagement /> },
      { path: 'categories', element: <CategoriesManagement /> },
      { path: 'history', element: <EquipmentsHistory /> },
    ],
  },
  {
    path: 'transactions',
    element: <TransactionLayout />,
    children: [
      { index: true, element: <Transactions /> },
      { path: 'expenditure', element: <ExpenditureFund /> },
      { path: 'contribution', element: <ContributionFund /> },
    ],
  },
  {
    path: 'teams',
    element: <TeamLayout />,
    children: [
      { index: true, element: <TeamsManagement /> },
      { path: 'members', element: <MembersManagement /> },
    ],
  },
];

export default ManagerRoutes;
