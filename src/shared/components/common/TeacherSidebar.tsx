import { useMemo } from 'react';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  ClipboardList,
  FileText,
  Package,
  UserCircle,
  Wallet,
} from 'lucide-react';
import RoleSidebar from '@/shared/components/common/RoleSidebar';

export default function TeacherSidebar() {
  const menus = useMemo(
    () => [
      { label: 'Hồ sơ', icon: UserCircle, path: '/teacher/profile' },
      { label: 'Sự kiện', icon: CalendarDays, path: '/teacher/events' },
      { label: 'Giáo trình', icon: BookOpen, path: '/teacher/courses' },
      {
        label: 'Thời khóa biểu & phân công',
        icon: Clock,
        path: '/teacher/timetable',
        matchPrefixPath: '/teacher/timetable',
      },
      { label: 'Danh sách phiên đã dạy', icon: Clock, path: '/teacher/teaching-history' },
      { label: 'Lịch sử điểm danh', icon: CheckCircle2, path: '/teacher/attendance-history' },
      { label: 'Báo cáo công việc', icon: ClipboardList, path: '/teacher/tasks' },
      { label: 'Hợp đồng', icon: FileText, path: '/teacher/contracts' },
      { label: 'Đóng góp quỹ', icon: Wallet, path: '/teacher/fund-contributions' },
      { label: 'Thiết bị', icon: Package, path: '/teacher/equipments' },
    ],
    []
  );

  return <RoleSidebar profilePath="/teacher/profile" menus={menus} />;
}

