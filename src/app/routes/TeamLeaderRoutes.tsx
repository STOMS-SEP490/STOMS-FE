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
import TeacherAttendanceHistoryPage from '@/modules/attendance/pages/TeacherAttendanceHistoryPage';
import TeacherTeachingHistoryPage from '@/modules/contract/pages/TeacherTeachingHistoryPage';
import ContractsManagement from '@/modules/contract/pages/ContractsManagement';
import TeacherTaskReportPage from '@/modules/task-report/pages/TeacherTaskReportPage';
import TeamLeaderAssignmentsLayout from '@/app/layouts/TeamLeaderAssignmentsLayout';
import TeamLeaderAssignmentsPage from '@/modules/attendance/pages/TeamLeaderAssignmentsPage';
import TeamLeaderAssignmentsTablePage from '@/modules/attendance/pages/TeamLeaderAssignmentsTablePage';
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
  { path: 'attendance', element: <TeacherAttendanceHistoryPage /> },
  { path: 'attendance-history', element: <TeacherAttendanceHistoryPage /> },
  { path: 'tasks', element: <TeacherTaskReportPage /> },
  { path: 'equipments', element: <AvailableEquipmentsPage /> },
];

export default TeamLeaderRoutes;

