import {
  BookOpen,
  Layers,
  Bookmark,
  BarChart3,
  CalendarDays,
  Star,
  LayoutTemplate,
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
      {
        kind: 'group',
        label: 'Loại yêu cầu',
        icon: LayoutTemplate,
        children: [
          { label: 'Mẫu sự kiện', icon: Star, path: '/teacher/events' },
          {
            label: 'Chương trình học',
            icon: BookOpen,
            path: '/teacher/courses',
            matchPrefixPath: '/teacher/courses',
          },
          { label: 'Môn học', icon: Layers, path: '/teacher/subjects', matchPrefixPath: '/teacher/subjects' },
        ],
      },
      { label: 'Chủ đề', icon: Bookmark, path: '/teacher/topics', matchPrefixPath: '/teacher/topics' },
      {
        label: 'Thời khóa biểu',
        icon: CalendarDays,
        path: '/teacher/timetable',
        matchPrefixPath: '/teacher/timetable',
      },
      { label: 'Các buổi đã tham gia', icon: Timer, path: '/teacher/teaching-history' },
      { label: 'Hợp đồng', icon: FileText, path: '/teacher/contracts' },
      { label: 'Đóng góp quỹ', icon: Wallet, path: '/teacher/fund-contributions' },
      { label: 'Thiết bị', icon: Package, path: '/teacher/equipments' },
    ];

  return <RoleSidebar profilePath="/teacher/profile" menus={menus} />;
}

