import { Navigate } from 'react-router-dom';
import UserProfile from '@/modules/user/pages/UserProfile';
import MyTeamPage from '@/modules/team/pages/MyTeamPage';
import EventCalendar from '@/modules/timetable/pages/EventCalendar';
import AvailableEquipmentsPage from '@/modules/equipment/pages/AvailableEquipmentsPage';
import EventsManagement from '@/modules/event/pages/EventsManagement';
import TeacherContributionHistoryPage from '@/modules/transaction/pages/TeacherContributionHistoryPage';
import CoursesReadonlyPage from '@/modules/course/pages/CoursesReadonlyPage';
import SubjectsReadonlyPage from '@/modules/subject/pages/SubjectsReadonlyPage';
import TopicsReadonlyPage from '@/modules/topic/pages/TopicsReadonlyPage';
import TeacherTeachingHistoryPage from '@/modules/contract/pages/TeacherTeachingHistoryPage';
import ContractsManagement from '@/modules/contract/pages/ContractsManagement';
import MyTasksPage from '@/modules/task-report/pages/MyTasksPage';
import TaskSessionDetailPage from '@/modules/task-report/pages/TaskSessionDetailPage';
import TaskReportsManagement from '@/modules/task-report/pages/TaskReportsManagement';
import TeamLeaderAssignmentsLayout from '@/app/layouts/TeamLeaderAssignmentsLayout';
import TeamLeaderAssignmentsPage from '@/modules/request/pages/TeamLeaderAssignmentsPage';
import TeamLeaderAssignmentsTablePage from '@/modules/request/pages/TeamLeaderAssignmentsTablePage';
import TeamLeaderDashboard from '@/modules/dashboard/pages/TeamLeaderDashboard';

const TeamLeaderRoutes = [
  { index: true, element: <Navigate to="dashboard" replace /> },
  { path: 'dashboard', element: <TeamLeaderDashboard /> },
  {
    path: 'assignments',
    element: <TeamLeaderAssignmentsLayout />,
    children: [
      { index: true, element: <Navigate to="assigning" replace /> },
      { path: 'assigning', element: <TeamLeaderAssignmentsTablePage tab="assigning" /> },
      { path: 'assigning/:id', element: <TeamLeaderAssignmentsPage tab="assigning" /> },
      { path: 'rejected', element: <TeamLeaderAssignmentsTablePage tab="rejected" /> },
      { path: 'rejected/:id', element: <TeamLeaderAssignmentsPage tab="rejected" /> },
    ],
  },
  { path: 'profile', element: <UserProfile /> },
  { path: 'teams', element: <MyTeamPage /> },
  { path: 'events', element: <EventsManagement /> },
  { path: 'courses', element: <CoursesReadonlyPage /> },
  { path: 'subjects', element: <SubjectsReadonlyPage /> },
  { path: 'topics', element: <TopicsReadonlyPage /> },
  { path: 'timetable', element: <EventCalendar /> },
  { path: 'timetable/assignments', element: <Navigate to="/tl/timetable" replace /> },
  { path: 'teaching-history', element: <TeacherTeachingHistoryPage /> },
  { path: 'contracts', element: <ContractsManagement /> },
  { path: 'contracts/:id', element: <ContractsManagement /> },
  { path: 'fund-contributions', element: <TeacherContributionHistoryPage /> },
  { path: 'task-reports', element: <TaskReportsManagement /> },
  { path: 'tasks', element: <MyTasksPage /> },
  { path: 'tasks/:sessionId', element: <TaskSessionDetailPage /> },
  { path: 'equipments', element: <AvailableEquipmentsPage /> },
];

export default TeamLeaderRoutes;

