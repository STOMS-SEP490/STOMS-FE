import { StatCard } from '@/shared/components/common/StatCard'
import { Laptop, CheckCircle, Clock } from 'lucide-react'

export default function EquipmentDashboard() {
  return (
    <div className="h-full p-6 space-y-6 bg-[#f3f4f6]">
      <div className="bg-white flex justify-between items-center px-6 py-4 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-black">Dashboard thiết bị</h2>
          <p className="text-xs text-gray-500">
            Tổng quan nhanh về tình trạng và lịch sử thiết bị
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={<Laptop />} label="Tổng thiết bị" value="—" sub="Thiết bị" />
        <StatCard
          icon={<CheckCircle />}
          label="Đang sẵn sàng"
          value="—"
          sub="Thiết bị"
          variant="green"
        />
        <StatCard
          icon={<Clock />}
          label="Lượt mượn hôm nay"
          value="—"
          sub="Phiếu mượn"
        />
      </div>
    </div>
  )
}

