import {
  BookOpen,
  BarChart3,
  CalendarDays,
  Star,
  ClipboardList,
  Timer,
  FileText,
  Package,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react';
import RoleSidebar, { type RoleSidebarMenuItem } from './RoleSidebar';

export default function TeacherSidebar() {
  const menus: RoleSidebarMenuItem[] = [
      { label: 'Thống kê', icon: BarChart3, path: '/teacher/dashboard' },
      { label: 'Nhóm của tôi', icon: Users, path: '/teacher/teams' },
      { label: 'Hồ sơ', icon: UserCircle, path: '/teacher/profile' },
      { label: 'Sự kiện', icon: Star, path: '/teacher/events' },
      { label: 'Giáo trình', icon: BookOpen, path: '/teacher/courses' },
      {
        label: 'Thời khóa biểu',
        icon: CalendarDays,
        path: '/teacher/timetable',
        matchPrefixPath: '/teacher/timetable',
      },
      { label: 'Danh sách phiên đã dạy', icon: Timer, path: '/teacher/teaching-history' },
      { label: 'Báo cáo công việc', icon: ClipboardList, path: '/teacher/tasks' },
      { label: 'Hợp đồng', icon: FileText, path: '/teacher/contracts' },
      { label: 'Đóng góp quỹ', icon: Wallet, path: '/teacher/fund-contributions' },
      { label: 'Thiết bị', icon: Package, path: '/teacher/equipments' },
    ];

  return <RoleSidebar profilePath="/teacher/profile" menus={menus} />;
}

