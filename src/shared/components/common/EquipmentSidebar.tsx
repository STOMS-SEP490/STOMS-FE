import { BarChart3, Laptop, ClipboardList, Wallet } from 'lucide-react'
import RoleSidebar, { type RoleSidebarMenuItem } from './RoleSidebar'

// Sidebar riêng cho Equipment Manager nhưng UI giống hệt Sidebar manager
export default function EquipmentSidebar() {
  /** Chỉ Dashboard cần khớp đúng path; Thiết bị / Phiếu mượn có tab con (categories, reservations) nên không dùng end. */
  const menus: RoleSidebarMenuItem[] = [
      { label: 'Thống kê', icon: BarChart3, path: '/em/dashboard' },
      {
        label: 'Thiết bị',
        icon: Laptop,
        path: '/em/equipments',
        matchPrefixPath: '/em/equipments',
      },
      {
        label: 'Phiếu mượn',
        icon: ClipboardList,
        path: '/em/borrowings',
        matchPrefixPath: '/em/borrowings',
      },
      {
        label: 'Đóng góp quỹ',
        icon: Wallet,
        path: '/em/fund-contributions',
      },
    ]

  return <RoleSidebar profilePath="/em/profile" menus={menus} />
}
