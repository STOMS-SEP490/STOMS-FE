import TeacherAssignments from '@/modules/contract/pages/TeacherAssignments';
import EventsManagement from '@/modules/event/pages/EventsManagement';
import EventCalendar from '@/modules/event/pages/EventCalendar';
import UserProfile from '@/modules/user/pages/UserProfile';
import TeacherTaskReportPage from '@/modules/task-report/pages/TeacherTaskReportPage';
import TeacherTeachingHistoryPage from '@/modules/contract/pages/TeacherTeachingHistoryPage';
import ContractsManagement from '@/modules/contract/pages/ContractsManagement';
import TeacherContributionHistoryPage from '@/modules/transaction/pages/TeacherContributionHistoryPage';
import TeacherAttendanceHistoryPage from '@/modules/attendance/pages/TeacherAttendanceHistoryPage';

const TeacherRoutes = [
  { path: 'events', element: <EventsManagement /> },
  { path: 'timetable', element: <EventCalendar /> },
  { path: 'assignments', element: <TeacherAssignments /> },
  { path: 'teaching-history', element: <TeacherTeachingHistoryPage /> },
  { path: 'contracts', element: <ContractsManagement /> },
  { path: 'contracts/:id', element: <ContractsManagement /> },
  { path: 'fund-contributions', element: <TeacherContributionHistoryPage /> },
  { path: 'attendance-history', element: <TeacherAttendanceHistoryPage /> },
  { path: 'tasks', element: <TeacherTaskReportPage /> },
  { path: 'profile', element: <UserProfile /> },
];

export default TeacherRoutes;

