import EquipmentSidebar from '@/shared/components/common/EquipmentSidebar'
import { Outlet } from 'react-router-dom'

export default function EquipmentLayout() {
  return (
    <div className="flex h-screen">
      <EquipmentSidebar />
      <main className="flex-1 bg-[#f3f4f6] overflow-y-auto no-scrollbar">
        <Outlet />
      </main>
    </div>
  )
}

