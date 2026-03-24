import { Navigate } from 'react-router-dom';
import UserProfile from '@/modules/user/pages/UserProfile';
import TeamLeaderTeamPage from '@/modules/team/pages/TeamLeaderTeamPage';
import EventCalendar from '@/modules/event/pages/EventCalendar';
import TeamLeaderAssignmentsPage from '@/modules/contract/pages/TeamLeaderAssignmentsPage';
import SessionAttendancePage from '@/modules/attendance/pages/SessionAttendancePage';
import TeamLeaderTimetableAssignments from '@/modules/contract/pages/TeamLeaderTimetableAssignments';
import AvailableEquipmentsPage from '@/modules/equipment/pages/AvailableEquipmentsPage';
import EventsManagement from '@/modules/event/pages/EventsManagement';
import TeacherContributionHistoryPage from '@/modules/transaction/pages/TeacherContributionHistoryPage';
import CoursesReadonlyPage from '@/modules/course/pages/CoursesReadonlyPage';
import CoursesReadonlyLayout from '@/modules/course/pages/CoursesReadonlyLayout';
import SubjectsReadonlyPage from '@/modules/subject/pages/SubjectsReadonlyPage';
import TeacherAttendanceHistoryPage from '@/modules/attendance/pages/TeacherAttendanceHistoryPage';
import TeacherTeachingHistoryPage from '@/modules/contract/pages/TeacherTeachingHistoryPage';
import ContractsManagement from '@/modules/contract/pages/ContractsManagement';
import TeacherTaskReportPage from '@/modules/task-report/pages/TeacherTaskReportPage';
import TeamLeaderAssignmentsLayout from '@/app/layouts/TeamLeaderAssignmentsLayout';

const TeamLeaderRoutes = [
  { path: 'profile', element: <UserProfile /> },
  { path: 'teams', element: <TeamLeaderTeamPage /> },
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
  { path: 'timetable/assignments', element: <TeamLeaderTimetableAssignments /> },
  { path: 'teaching-history', element: <TeacherTeachingHistoryPage /> },
  { path: 'contracts', element: <ContractsManagement /> },
  { path: 'contracts/:id', element: <ContractsManagement /> },
  { path: 'fund-contributions', element: <TeacherContributionHistoryPage /> },
  { path: 'attendance', element: <TeacherAttendanceHistoryPage /> },
  { path: 'attendance-history', element: <TeacherAttendanceHistoryPage /> },
  { path: 'tasks', element: <TeacherTaskReportPage /> },
  { path: 'equipments', element: <AvailableEquipmentsPage /> },
  {
    path: 'assignments',
    element: <TeamLeaderAssignmentsLayout />,
    children: [
      { index: true, element: <Navigate to="assigning" replace /> },
      { path: 'assigning', element: <TeamLeaderAssignmentsPage tab="assigning" /> },
      { path: 'rejected', element: <TeamLeaderAssignmentsPage tab="rejected" /> },
    ],
  },
  { path: 'attendance/:sessionId', element: <SessionAttendancePage /> },
];

export default TeamLeaderRoutes;

