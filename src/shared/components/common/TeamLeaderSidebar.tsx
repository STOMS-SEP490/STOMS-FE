import { useMemo } from 'react';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileText,
  Package,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react';
import RoleSidebar from '@/shared/components/common/RoleSidebar';
export default function TeamLeaderSidebar() {
  const menus = useMemo(
    () => [
      { label: 'Hồ sơ', icon: UserCircle, path: '/tl/profile' },
      { label: 'Nhóm', icon: Users, path: '/tl/teams' },
      { label: 'Sự kiện', icon: CalendarDays, path: '/tl/events' },
      { label: 'Giáo trình', icon: BookOpen, path: '/tl/courses' },
      {
        label: 'Thời khóa biểu & phân công',
        icon: Clock,
        path: '/tl/timetable',
        matchPrefixPath: '/tl/timetable',
      },
      { label: 'Danh sách phiên đã dạy', icon: Clock, path: '/tl/teaching-history' },
      { label: 'Lịch sử điểm danh', icon: CheckCircle2, path: '/tl/attendance-history' },
      { label: 'Báo cáo công việc', icon: ClipboardList, path: '/tl/tasks' },
      { label: 'Hợp đồng', icon: FileText, path: '/tl/contracts' },
      { label: 'Đóng góp quỹ', icon: Wallet, path: '/tl/fund-contributions' },
      { label: 'Thiết bị', icon: Package, path: '/tl/equipments' },
      { label: 'Phân công', icon: ClipboardCheck, path: '/tl/assignments' },
    ],
    []
  );

  return <RoleSidebar profilePath="/tl/profile" menus={menus} />;
}
