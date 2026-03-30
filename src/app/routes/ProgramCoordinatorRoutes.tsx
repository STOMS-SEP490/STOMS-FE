import { Navigate } from 'react-router-dom';
import PCDashboard from '@/modules/dashboard/pages/PCDashboard';
import CreateRequestPage from '@/modules/request/pages/CreateRequestPage';
import RequestsManagement from '@/modules/request/pages/RequestsManagement';
import RequestDetailPC from '@/modules/request/pages/RequestDetailPC';
import UserProfile from '@/modules/user/pages/UserProfile';
import EventsManagement from '@/modules/event/pages/EventsManagement';
import TeacherContributionHistoryPage from '@/modules/transaction/pages/TeacherContributionHistoryPage';
import CoursesReadonlyLayout from '@/modules/course/pages/CoursesReadonlyLayout';
import CoursesReadonlyPage from '@/modules/course/pages/CoursesReadonlyPage';
import SubjectsReadonlyPage from '@/modules/subject/pages/SubjectsReadonlyPage';
import ProgramCoordinatorTeamsPage from '@/modules/team/pages/ProgramCoordinatorTeamsPage';
import PCRequestLayout from '@/app/layouts/PCRequestLayout';

const ProgramCoordinatorRoutes = [
  { path: 'dashboard', element: <PCDashboard /> },
  { index: true, element: <Navigate to="dashboard" replace /> },
  {
    path: 'requests',
    children: [
      { index: true, element: <RequestsManagement /> },
      { path: 'create', element: <CreateRequestPage /> },
      { path: 'edit/:id', element: <CreateRequestPage /> },
      {
        path: ':id',
        element: <PCRequestLayout />,
        children: [{ index: true, element: <RequestDetailPC /> }],
      },
    ],
  },
  { path: 'events', element: <EventsManagement /> },
  {
    path: 'courses',
    element: <CoursesReadonlyLayout />,
    children: [
      { index: true, element: <CoursesReadonlyPage /> },
      { path: 'subjects', element: <SubjectsReadonlyPage /> },
    ],
  },
  { path: 'teams', element: <ProgramCoordinatorTeamsPage /> },
  { path: 'fund-contributions', element: <TeacherContributionHistoryPage /> },
  { path: 'profile', element: <UserProfile /> },
];

export default ProgramCoordinatorRoutes;
