import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { GraduationCap, CheckCircle, BookOpen, Clock } from 'lucide-react';
import { StatCard } from '@/shared/components/common/StatCard';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

type OutletContext = {
  position?: string;
  createBorrowingOpen?: boolean;
  setCreateBorrowingOpen?: (open: boolean) => void;
  hideSectionTitle?: boolean;
};

export default function BorrowingsManagementLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [createBorrowingOpen, setCreateBorrowingOpen] = useState(false);

  const isEquipmentManager = location.pathname.startsWith('/em/');
  const basePath = isEquipmentManager ? '/em/borrowings' : '/manager/borrowings';

  const currentTab: 'reservations' | 'borrowings' = location.pathname.includes('/reservations')
    ? 'reservations'
    : 'borrowings';

  return (
    <div className="p-6 space-y-6 bg-[#f3f4f6]" style={{ minHeight: 'var(--content-height, 100vh)' }}>
      <div className="bg-white flex justify-between items-center px-6 py-4 mb-2 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-black">Phiếu mượn &amp; đặt trước</h2>
          <p className="text-xs text-gray-500">
            Quản lý phiếu mượn thiết bị và lịch đặt trước trong hệ thống
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <Outlet
            context={
              {
                position: 'header',
                createBorrowingOpen,
                setCreateBorrowingOpen,
              } as OutletContext
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-0">
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

      <div className="px-6 py-2 mb-1">
        <div className="flex items-center justify-between">
          <Tabs value={currentTab}>
            <TabsList>
              <TabsTrigger value="borrowings" onClick={() => navigate(basePath)}>
                PHIẾU MƯỢN
              </TabsTrigger>
              <TabsTrigger value="reservations" onClick={() => navigate(`${basePath}/reservations`)}>
                ĐẶT TRƯỚC
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Outlet
            context={
              {
                position: 'toolbar',
                createBorrowingOpen,
                setCreateBorrowingOpen,
              } as OutletContext
            }
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
        <Outlet
          context={
            {
              position: 'content',
              createBorrowingOpen,
              setCreateBorrowingOpen,
              hideSectionTitle: true,
            } as OutletContext
          }
        />
      </div>
    </div>
  );
}
