import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { CheckCircle2, CircleX, Package, PackageOpen, Wrench } from 'lucide-react';
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
    <div className="p-6 space-y-6 app-page-bg" style={{ minHeight: 'var(--content-height, 100vh)' }}>
      {/* HEADER */}
      <div className="bg-white flex justify-between items-center px-6 py-4 mb-2 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-[#1a7a99]">Quản lý thiết bị</h2>
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

      {currentTab === 'equipments' ? (
        <div className="grid grid-cols-5 gap-4 mb-0">
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
            value={formatStatValue(statsLoading, stats.availableEquipment)}
            sub="Có thể mượn ngay"
            variant="green"
          />
          <StatCard
            icon={<PackageOpen className={iconClass} strokeWidth={2} />}
            label="Đang mượn"
            value={formatStatValue(statsLoading, stats.borrowedEquipment)}
            sub="Thiết bị đang cho mượn"
            variant="orange"
          />
          <StatCard
            icon={<Wrench className={iconClass} strokeWidth={2} />}
            label="Hư hỏng"
            value={formatStatValue(statsLoading, stats.damagedEquipment)}
            sub="Cần sửa chữa/bảo trì"
            variant="violet"
          />
          <StatCard
            icon={<CircleX className={iconClass} strokeWidth={2} />}
            label="Mất"
            value={formatStatValue(statsLoading, stats.lostEquipment)}
            sub="Thiết bị đã thất lạc"
            variant="rose"
          />
        </div>
      ) : null}

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
