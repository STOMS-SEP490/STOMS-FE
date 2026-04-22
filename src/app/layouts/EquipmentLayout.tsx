import MainContent from '@/app/layouts/MainContent';
import RoleSidebar, { type RoleSidebarMenuItem } from '@/shared/components/common/RoleSidebar';
import { BarChart3, CalendarClock, ClipboardList, Laptop, Layers, Wallet } from 'lucide-react';
import { Outlet } from 'react-router-dom';

export default function EquipmentLayout() {
  const menus: RoleSidebarMenuItem[] = [
    { label: 'Thống kê', icon: BarChart3, path: '/em/dashboard' },
    { label: 'Thiết bị', icon: Laptop, path: '/em/equipments', matchPrefixPath: '/em/equipments' },
    { label: 'Danh mục', icon: Layers, path: '/em/categories' },
    { label: 'Phiếu mượn', icon: ClipboardList, path: '/em/borrowings' },
    { label: 'Đơn yêu cầu thiết bị', icon: CalendarClock, path: '/em/reservations' },
    { label: 'Đóng góp quỹ', icon: Wallet, path: '/em/fund-contributions' },
  ];

  return (
    <div className="flex h-screen">
      <RoleSidebar profilePath="/em/profile" menus={menus} />
      <main className="flex-1 app-page-bg overflow-y-auto no-scrollbar">
        <MainContent>
          <Outlet />
        </MainContent>
      </main>
    </div>
  );
}

