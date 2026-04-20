import {
  BarChart3,
  BookOpen,
  Layers,
  Bookmark,
  CalendarDays,
  Star,
  LayoutTemplate,
  ClipboardCheck,
  ClipboardList,
  Timer,
  FileText,
  Package,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react';
import RoleSidebar, { type RoleSidebarMenuItem } from './RoleSidebar';
export default function TeamLeaderSidebar() {
  const menus: RoleSidebarMenuItem[] = [
      { label: 'Thống kê', icon: BarChart3, path: '/tl/dashboard' },
      { label: 'Hồ sơ', icon: UserCircle, path: '/tl/profile' },
      { label: 'Nhóm', icon: Users, path: '/tl/teams' },
      {
        kind: 'group',
        label: 'Loại yêu cầu',
        icon: LayoutTemplate,
        children: [
          { label: 'Mẫu sự kiện', icon: Star, path: '/tl/events' },
          { label: 'Chương trình học', icon: BookOpen, path: '/tl/courses', matchPrefixPath: '/tl/courses' },
          { label: 'Môn học', icon: Layers, path: '/tl/subjects', matchPrefixPath: '/tl/subjects' },
        ],
      },
      { label: 'Chủ đề', icon: Bookmark, path: '/tl/topics', matchPrefixPath: '/tl/topics' },
      {
        label: 'Thời khóa biểu',
        icon: CalendarDays,
        path: '/tl/timetable',
        matchPrefixPath: '/tl/timetable',
      },
      { label: 'Danh sách buổi đã dạy', icon: Timer, path: '/tl/teaching-history' },
      { label: 'Báo cáo công việc', icon: ClipboardList, path: '/tl/tasks' },
      { label: 'Hợp đồng', icon: FileText, path: '/tl/contracts' },
      { label: 'Đóng góp quỹ', icon: Wallet, path: '/tl/fund-contributions' },
      { label: 'Thiết bị', icon: Package, path: '/tl/equipments' },
      { label: 'Phân công', icon: ClipboardCheck, path: '/tl/assignments' },
    ];

  return <RoleSidebar profilePath="/tl/profile" menus={menus} />;
}
