import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

export default function TransactionLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  let currentTab = 'transactions';
  if (location.pathname.includes('categories')) currentTab = 'categories';
  else if (location.pathname.includes('expenditure')) currentTab = 'expenditure';
  else if (location.pathname.includes('contribution')) currentTab = 'contribution';
  else if (location.pathname.includes('wallets')) currentTab = 'wallets';

  const isExpenditureTab = currentTab === 'expenditure';

  return (
    <div className="p-6 pl-8 space-y-2 app-page-bg" style={{ minHeight: 'var(--content-height, 100vh)' }}>
      <div className="bg-white px-6 py-4 rounded-xl border shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#1a7a99]">Quản lý giao dịch</h2>
          <p className="text-xs text-gray-500">Quản lý các giao dịch trong hệ thống</p>
        </div>
        {isExpenditureTab && (
          <Outlet context={{ position: 'header-button' }} />
        )}
      </div>

      <div className="px-6 ">
        <Tabs value={currentTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="transactions" onClick={() => navigate('/manager/transactions')}>
                TẤT CẢ GIAO DỊCH
              </TabsTrigger>
              <TabsTrigger value="contribution" onClick={() => navigate('/manager/transactions/contribution')}>
                ĐÃ ĐÓNG GÓP
              </TabsTrigger>
              <TabsTrigger value="expenditure" onClick={() => navigate('/manager/transactions/expenditure')}>
                CÁC KHOẢN CHI
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
