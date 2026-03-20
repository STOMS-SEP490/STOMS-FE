import UserProfile from '@/modules/user/pages/UserProfile';
import TeamLeaderTeamPage from '@/modules/team/pages/TeamLeaderTeamPage';
import EventCalendar from '@/modules/event/pages/EventCalendar';
import TeamLeaderAssignmentsPage from '@/modules/contract/pages/TeamLeaderAssignmentsPage';
import SessionAttendancePage from '@/modules/attendance/pages/SessionAttendancePage';
import TeamLeaderTimetableAssignments from '@/modules/contract/pages/TeamLeaderTimetableAssignments';
import TeamLeaderTimetableAssignmentsLayout from '@/app/layouts/TeamLeaderTimetableAssignmentsLayout';

const TeamLeaderRoutes = [
  { path: 'profile', element: <UserProfile /> },
  { path: 'teams', element: <TeamLeaderTeamPage /> },
  { path: 'timetable', element: <EventCalendar /> },
  {
    path: 'timetable/assignments',
    element: <TeamLeaderTimetableAssignmentsLayout />,
    children: [
      { index: true, element: <TeamLeaderTimetableAssignments /> },
      { path: 'attendance', element: <TeamLeaderTimetableAssignments /> },
    ],
  },
  { path: 'assignments', element: <TeamLeaderAssignmentsPage /> },
  { path: 'attendance/:sessionId', element: <SessionAttendancePage /> },
];

export default TeamLeaderRoutes;

