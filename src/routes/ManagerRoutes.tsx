import UserManagement from '@/pages/Manager/UsersManagement';
import ManagerDashboard from '../pages/Manager/Dashboard';
import CoursesManagement from '../pages/Manager/CoursesManagement';
import TopicsManagement from '@/pages/Manager/TopicsManagement';
import CoursesLayout from '@/layouts/CoursesManagementLayout';
import SubjectsManagement from '@/pages/Manager/SubjectsManagement';
import EquipmentsManagement from '@/pages/Manager/EquipmentsManagement';
import CategoriesManagement from '@/pages/Manager/CategoriesManagement';
import EquipmentsManagementLayout from '@/layouts/EquipmentsManagementLayout';
import EquipmentsHistory from '@/pages/Manager/EquipmentsHistory';
import TeamsManagement from '@/pages/Manager/TeamsManagement';
import ContractsManagement from '@/pages/Manager/ContractsManagement';
import EventsManagement from '@/pages/Manager/EventsManagement';
import TransactionLayout from '@/layouts/TransactionsLayout';
import Transactions from '@/pages/Manager/Transaction';
import ExpenditureFund from '@/pages/Manager/ExpenditureFund';
import ContributionFund from '@/pages/Manager/ContributionFund';

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
  { path: 'teams', element: <TeamsManagement /> },
  { path: 'contracts', element: <ContractsManagement /> },

  { path: 'topics', element: <TopicsManagement /> },
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
];

export default ManagerRoutes;
