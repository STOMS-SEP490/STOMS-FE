import { Navigate } from 'react-router-dom';
import EventsManagement from '@/modules/event/pages/EventsManagement';
import EventCalendar from '@/modules/timetable/pages/EventCalendar';
import UserProfile from '@/modules/user/pages/UserProfile';
import TeacherTaskReportPage from '@/modules/task-report/pages/TeacherTaskReportPage';
import TeacherTeachingHistoryPage from '@/modules/contract/pages/TeacherTeachingHistoryPage';
import ContractsManagement from '@/modules/contract/pages/ContractsManagement';
import TeacherContributionHistoryPage from '@/modules/transaction/pages/TeacherContributionHistoryPage';
import TeacherAttendanceHistoryPage from '@/modules/attendance/pages/TeacherAttendanceHistoryPage';
import AvailableEquipmentsPage from '@/modules/equipment/pages/AvailableEquipmentsPage';
import CoursesReadonlyPage from '@/modules/course/pages/CoursesReadonlyPage';
import SubjectsReadonlyPage from '@/modules/subject/pages/SubjectsReadonlyPage';
import TopicsReadonlyPage from '@/modules/topic/pages/TopicsReadonlyPage';
import TeacherDashboard from '@/modules/dashboard/pages/TeacherDashboard';
import MyTeamPage from '@/modules/team/pages/MyTeamPage';

const TeacherRoutes = [
  { index: true, element: <Navigate to="dashboard" replace /> },
  { path: 'dashboard', element: <TeacherDashboard /> },
  { path: 'teams', element: <MyTeamPage /> },
  { path: 'events', element: <EventsManagement /> },
  { path: 'courses', element: <CoursesReadonlyPage /> },
  { path: 'subjects', element: <SubjectsReadonlyPage /> },
  { path: 'topics', element: <TopicsReadonlyPage /> },
  { path: 'timetable', element: <EventCalendar /> },
  { path: 'timetable/assignments', element: <Navigate to="/teacher/timetable" replace /> },
  { path: 'teaching-history', element: <TeacherTeachingHistoryPage /> },
  { path: 'contracts', element: <ContractsManagement /> },
  { path: 'contracts/:id', element: <ContractsManagement /> },
  { path: 'fund-contributions', element: <TeacherContributionHistoryPage /> },
  { path: 'attendance-history', element: <TeacherAttendanceHistoryPage /> },
  { path: 'tasks', element: <TeacherTaskReportPage /> },
  { path: 'equipments', element: <AvailableEquipmentsPage /> },
  { path: 'profile', element: <UserProfile /> },
];

export default TeacherRoutes;

