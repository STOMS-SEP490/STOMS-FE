import UserProfile from '@/modules/user/pages/UserProfile';
import TeamsManagement from '@/modules/team/pages/TeamsManagement';
import EventCalendar from '@/modules/event/pages/EventCalendar';
import TeamLeaderAssignmentsPage from '@/modules/contract/pages/TeamLeaderAssignmentsPage';
import SessionAttendancePage from '@/modules/attendance/pages/SessionAttendancePage';

const TeamLeaderRoutes = [
  { path: 'profile', element: <UserProfile /> },
  { path: 'teams', element: <TeamsManagement /> },
  { path: 'timetable', element: <EventCalendar /> },
  { path: 'assignments', element: <TeamLeaderAssignmentsPage /> },
  { path: 'attendance/:sessionId', element: <SessionAttendancePage /> },
];

export default TeamLeaderRoutes;

