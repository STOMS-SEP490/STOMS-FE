import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { CheckCircle2, Layers, Package, PackageOpen } from 'lucide-react';
import { StatCard } from '@/shared/components/common/StatCard';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useEquipmentsManagementStats } from '@/modules/equipment/hooks/useEquipmentsManagementStats';

const iconClass = 'h-6 w-6';

function formatStatValue(loading: boolean, n: number) {
  if (loading) return '—';
  return n.toLocaleString('vi-VN');
}

export default function EquipmentsLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [createBorrowingOpen, setCreateBorrowingOpen] = useState(false);
  const { loading: statsLoading, stats } = useEquipmentsManagementStats();

  type EquipmentsTab = 'categories' | 'equipments';
  let currentTab: EquipmentsTab = 'equipments';

  const isEquipmentManager = location.pathname.startsWith('/em/');
  const basePath = isEquipmentManager ? '/em/equipments' : '/manager/equipments';

  if (location.pathname.includes('/categories')) {
    currentTab = 'categories';
  }

  return (
    <div className="p-6 space-y-6 bg-[#f3f4f6]" style={{ minHeight: 'var(--content-height, 100vh)' }}>
      {/* HEADER */}
      <div className="bg-white flex justify-between items-center px-6 py-4 mb-2 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-black">Quản lý thiết bị</h2>
          <p className="text-xs text-gray-500">Quản lý thiết bị và loại thiết bị trong hệ thống</p>
        </div>
        <div className="flex gap-3 items-center">
          <Outlet
            context={{
              position: 'header',
              createBorrowingOpen,
              setCreateBorrowingOpen,
            }}
          />
        </div>
      </div>

      {/* STATS — dữ liệu thật từ API thiết bị / danh mục */}
      <div className="grid grid-cols-4 gap-4 mb-0">
        <StatCard
          icon={<Package className={iconClass} strokeWidth={2} />}
          label="Tổng thiết bị"
          value={formatStatValue(statsLoading, stats.totalEquipment)}
          sub="Tất cả trạng thái"
          variant="blue"
        />
        <StatCard
          icon={<CheckCircle2 className={iconClass} strokeWidth={2} />}
          label="Khả dụng"
          value={formatStatValue(statsLoading, stats.available)}
          sub="Có thể mượn ngay"
          variant="green"
        />
        <StatCard
          icon={<Layers className={iconClass} strokeWidth={2} />}
          label="Tổng danh mục"
          value={formatStatValue(statsLoading, stats.totalCategories)}
          sub="Phân loại thiết bị"
          variant="violet"
        />
        <StatCard
          icon={<PackageOpen className={iconClass} strokeWidth={2} />}
          label="Đang mượn"
          value={formatStatValue(statsLoading, stats.borrowed)}
          sub="Thiết bị đang cho mượn"
          variant="orange"
        />
      </div>

      {/* TABS */}
      <div className=" px-6 py-2 mb-1">
        <Tabs value={currentTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger
                value="categories"
                onClick={() => navigate(`${basePath}/categories`)}
              >
                DANH MỤC
              </TabsTrigger>

              <TabsTrigger value="equipments" onClick={() => navigate(basePath)}>
                TẤT CẢ THIẾT BỊ
              </TabsTrigger>
            </TabsList>

            <Outlet
              context={{
                position: 'toolbar',
                createBorrowingOpen,
                setCreateBorrowingOpen,
              }}
            />
          </div>
        </Tabs>
      </div>
      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
        <Outlet
          context={{
            position: 'content',
            createBorrowingOpen,
            setCreateBorrowingOpen,
          }}
        />
      </div>
    </div>
  );
}
