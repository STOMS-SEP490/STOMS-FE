import { Navigate } from 'react-router-dom';
import EventCalendar from '@/modules/timetable/pages/EventCalendar';
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
import PCTopicsPage from '@/modules/topic/pages/PCTopicsPage';
import ProgramCoordinatorTeamsPage from '@/modules/team/pages/ProgramCoordinatorTeamsPage';
import PCRequestLayout from '@/app/layouts/PCRequestLayout';

const ProgramCoordinatorRoutes = [
  { index: true, element: <Navigate to="dashboard" replace /> },
  { path: 'dashboard', element: <PCDashboard /> },
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
  { path: 'timetable', element: <EventCalendar /> },
  { path: 'timetable/assignments', element: <Navigate to="/pc/timetable" replace /> },
  {
    path: 'courses',
    element: <CoursesReadonlyLayout />,
    children: [
      { index: true, element: <CoursesReadonlyPage /> },
      { path: 'subjects', element: <SubjectsReadonlyPage /> },
    ],
  },
  { path: 'topics', element: <PCTopicsPage /> },
  { path: 'teams', element: <ProgramCoordinatorTeamsPage /> },
  { path: 'fund-contributions', element: <TeacherContributionHistoryPage /> },
  { path: 'profile', element: <UserProfile /> },
];

export default ProgramCoordinatorRoutes;
