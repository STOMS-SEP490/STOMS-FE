import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
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

  const currentTab: 'reservations' | 'borrowings' = location.pathname.includes('/reservations')
    ? 'reservations'
    : 'borrowings';

  return (
    <div
      className="p-6 space-y-6 bg-[#f3f4f6] flex flex-col"
      style={{ minHeight: 'var(--content-height, 100vh)' }}
    >
      <div className="bg-white flex justify-between items-center px-6 py-4 mb-2 rounded-xl border shadow-sm shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-black">Phiếu mượn thiết bị</h2>
          <p className="text-xs text-gray-500">Quản lý phiếu mượn, theo dõi trạng thái trả thiết bị</p>
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

      <div className="shrink-0 px-6 py-0 mb-2">
        <div className="flex items-center justify-between ">
          <Tabs value={currentTab}>
            <TabsList>
            <TabsTrigger value="borrowings" onClick={() => navigate('/em/equipments/history')}>
                PHIẾU MƯỢN
              </TabsTrigger>
              <TabsTrigger
                value="reservations"
                onClick={() => navigate('/em/equipments/history/reservations')}
              >
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

      <div className="bg-white rounded-xl border shadow-sm px-6 py-4 flex-1 min-h-0">
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

