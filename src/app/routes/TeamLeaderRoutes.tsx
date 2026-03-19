import UserProfile from '@/modules/user/pages/UserProfile';
import TeamLeaderTeamPage from '@/modules/team/pages/TeamLeaderTeamPage';
import EventCalendar from '@/modules/event/pages/EventCalendar';
import TeamLeaderAssignmentsPage from '@/modules/contract/pages/TeamLeaderAssignmentsPage';
import SessionAttendancePage from '@/modules/attendance/pages/SessionAttendancePage';
import TeamLeaderTimetableAssignments from '@/modules/contract/pages/TeamLeaderTimetableAssignments';

const TeamLeaderRoutes = [
  { path: 'profile', element: <UserProfile /> },
  { path: 'teams', element: <TeamLeaderTeamPage /> },
  { path: 'timetable', element: <EventCalendar /> },
  { path: 'timetable/assignments', element: <TeamLeaderTimetableAssignments /> },
  { path: 'assignments', element: <TeamLeaderAssignmentsPage /> },
  { path: 'attendance/:sessionId', element: <SessionAttendancePage /> },
];

export default TeamLeaderRoutes;

