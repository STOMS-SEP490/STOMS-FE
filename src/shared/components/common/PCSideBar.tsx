import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Star,
  Users,
  Wallet,
  CheckCircle,
  Bookmark,
  User,
} from 'lucide-react';
import RoleSidebar, { type RoleSidebarMenuItem } from './RoleSidebar';

export default function PCSidebar() {
  const menus: RoleSidebarMenuItem[] = [
      { label: 'Thống kê', icon: BarChart3, path: '/pc/dashboard' },
      { label: 'Yêu cầu', icon: CheckCircle, path: '/pc/requests', matchPrefixPath: '/pc/requests' },
      { label: 'Nhóm', icon: Users, path: '/pc/teams' },
      { label: 'Sự kiện', icon: Star, path: '/pc/events' },
      {
        label: 'Thời khóa biểu',
        icon: CalendarDays,
        path: '/pc/timetable',
        matchPrefixPath: '/pc/timetable',
      },
      { label: 'Giáo trình', icon: BookOpen, path: '/pc/courses', matchPrefixPath: '/pc/courses' },
      { label: 'Chủ đề', icon: Bookmark, path: '/pc/topics', matchPrefixPath: '/pc/topics' },
      { label: 'Quỹ', icon: Wallet, path: '/pc/fund-contributions' },
      { label: 'Hồ sơ', icon: User, path: '/pc/profile' },
    ];

  return <RoleSidebar profilePath="/pc/profile" menus={menus} />;
}
