import TeacherAssignments from '@/modules/contract/pages/TeacherAssignments';
import EventsManagement from '@/modules/event/pages/EventsManagement';
import EventCalendar from '@/modules/event/pages/EventCalendar';
import UserProfile from '@/modules/user/pages/UserProfile';
import TeacherTaskReportPage from '@/modules/task-report/pages/TeacherTaskReportPage';
import TeacherTeachingHistoryPage from '@/modules/contract/pages/TeacherTeachingHistoryPage';
import ContractsManagement from '@/modules/contract/pages/ContractsManagement';
import TeacherContributionHistoryPage from '@/modules/transaction/pages/TeacherContributionHistoryPage';
import TeacherAttendanceHistoryPage from '@/modules/attendance/pages/TeacherAttendanceHistoryPage';
import AvailableEquipmentsPage from '@/modules/equipment/pages/AvailableEquipmentsPage';
import CoursesReadonlyPage from '@/modules/course/pages/CoursesReadonlyPage';
import CoursesReadonlyLayout from '@/modules/course/pages/CoursesReadonlyLayout';
import SubjectsReadonlyPage from '@/modules/subject/pages/SubjectsReadonlyPage';

const TeacherRoutes = [
  { path: 'events', element: <EventsManagement /> },
  {
    path: 'courses',
    element: <CoursesReadonlyLayout />,
    children: [
      { index: true, element: <CoursesReadonlyPage /> },
      { path: 'subjects', element: <SubjectsReadonlyPage /> },
    ],
  },
  { path: 'timetable', element: <EventCalendar /> },
  { path: 'timetable/assignments', element: <TeacherAssignments /> },
  { path: 'teaching-history', element: <TeacherTeachingHistoryPage /> },
  { path: 'contracts', element: <ContractsManagement /> },
  { path: 'contracts/:id', element: <ContractsManagement /> },
  { path: 'fund-contributions', element: <TeacherContributionHistoryPage /> },
  { path: 'attendance', element: <TeacherAttendanceHistoryPage /> },
  { path: 'attendance-history', element: <TeacherAttendanceHistoryPage /> },
  { path: 'tasks', element: <TeacherTaskReportPage /> },
  { path: 'equipments', element: <AvailableEquipmentsPage /> },
  { path: 'profile', element: <UserProfile /> },
];

export default TeacherRoutes;

