import ContractsManagement from '@/modules/contract/pages/ContractsManagement';
import TeacherAssignments from '@/modules/contract/pages/TeacherAssignments';
import EventsManagement from '@/modules/event/pages/EventsManagement';
import EventCalendar from '@/modules/event/pages/EventCalendar';
import UserProfile from '@/modules/user/pages/UserProfile';
import TeacherTaskReportPage from '@/modules/task-report/pages/TeacherTaskReportPage';

const TeacherRoutes = [
  { path: 'events', element: <EventsManagement /> },
  { path: 'timetable', element: <EventCalendar /> },
  { path: 'assignments', element: <TeacherAssignments /> },
  { path: 'contracts', element: <ContractsManagement /> },
  { path: 'tasks', element: <TeacherTaskReportPage /> },
  { path: 'profile', element: <UserProfile /> },
];

export default TeacherRoutes;

