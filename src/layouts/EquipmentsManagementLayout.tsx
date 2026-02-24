import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatCard } from '@/components/common/StatCard';
import { GraduationCap, CheckCircle, BookOpen, Clock } from 'lucide-react';

export default function EquipmentsLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  let currentTab = 'equipments';

  if (location.pathname.includes('categories')) {
    currentTab = 'categories';
  } else if (location.pathname.includes('history')) {
    currentTab = 'history';
  }

  return (
    <div className="h-screen overflow-hidden p-6 space-y-6 bg-[#f3f4f6]">
      {/* HEADER */}
      <div className="bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm">
        <h2 className="text-xl font-semibold text-black">Quản lý thiết bị</h2>
        <p className="text-xs text-gray-500">Quản lý thiết bị và loại thiết bị trong hệ thống</p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4  mb-0">
        <StatCard icon={<GraduationCap />} label="Tổng thiết bị" value="48" sub="Thiết bị" />
        <StatCard
          icon={<CheckCircle />}
          label="Đang hoạt động"
          value="42"
          sub="Thiết bị"
          variant="green"
        />
        <StatCard icon={<BookOpen />} label="Tổng loại thiết bị" value="156" sub="Loại thiết bị" />
        <StatCard
          icon={<Clock />}
          label="Tổng số lượng tồn kho"
          value="1,248"
          sub="Sản phẩm tồn kho"
        />
      </div>

      {/* TABS */}
      <div className=" px-6 py-2 mb-1">
        <Tabs value={currentTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger
                value="categories"
                onClick={() => navigate('/manager/equipments/categories')}
              >
                DANH MỤC
              </TabsTrigger>

              <TabsTrigger value="equipments" onClick={() => navigate('/manager/equipments')}>
                TẤT CẢ THIẾT BỊ
              </TabsTrigger>

              <TabsTrigger value="history" onClick={() => navigate('/manager/equipments/history')}>
                LỊCH SỬ MƯỢN
              </TabsTrigger>
            </TabsList>

            <Outlet context={{ position: 'toolbar' }} />
          </div>
        </Tabs>
      </div>
      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
        <Outlet context={{ position: 'content' }} />
      </div>
    </div>
  );
}
