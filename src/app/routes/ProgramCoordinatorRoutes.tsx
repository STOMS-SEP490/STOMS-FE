import { Navigate } from 'react-router-dom';
import CreateRequestPage from '@/modules/request/pages/CreateRequestPage';
import RequestsManagement from '@/modules/request/pages/RequestsManagement';
import UserProfile from '@/modules/user/pages/UserProfile';
import EventsManagement from '@/modules/event/pages/EventsManagement';
import TeacherContributionHistoryPage from '@/modules/transaction/pages/TeacherContributionHistoryPage';
import CoursesReadonlyLayout from '@/modules/course/pages/CoursesReadonlyLayout';
import CoursesReadonlyPage from '@/modules/course/pages/CoursesReadonlyPage';
import SubjectsReadonlyPage from '@/modules/subject/pages/SubjectsReadonlyPage';

const ProgramCoordinatorRoutes = [
  // { path: 'dashboard', element: <PCDashboard /> },
  { index: true, element: <Navigate to="requests" replace /> },
  {
    path: 'requests',
    children: [
      { index: true, element: <RequestsManagement /> },
      { path: 'create', element: <CreateRequestPage /> },
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
  { path: 'fund-contributions', element: <TeacherContributionHistoryPage /> },
  { path: 'profile', element: <UserProfile /> },
];

export default ProgramCoordinatorRoutes;
