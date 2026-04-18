import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { StatCard } from '@/shared/components/common/StatCard';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { ArrowDownCircle, ArrowUpCircle, ClipboardList, Wallet } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import transactionApi from '@/modules/transaction/api/transactionApi';
import { walletApi } from '@/modules/transaction/api/walletApi';

export default function TransactionLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  let currentTab = 'transactions';

  if (location.pathname.includes('categories')) {
    currentTab = 'categories';
  } else if (location.pathname.includes('expenditure')) {
    currentTab = 'expenditure';
  } else if (location.pathname.includes('contribution')) {
    currentTab = 'contribution';
  } else if (location.pathname.includes('wallets')) {
    currentTab = 'wallets';
  }

  const { data: txAll, isLoading: txAllLoading } = useQuery({
    queryKey: ['transactions-summary', 'all'],
    queryFn: () => transactionApi.getTransactions({ pageNumber: 1, pageSize: 1 }),
  });

  // transactionType: BE đang dùng number. 1 = contribution, 2 = expenditure (theo naming route hiện tại)
  const { data: txContribution, isLoading: txContributionLoading } = useQuery({
    queryKey: ['transactions-summary', 'contribution'],
    queryFn: () => transactionApi.getTransactions({ pageNumber: 1, pageSize: 1, transactionType: 2 }),
  });

  const { data: txExpenditure, isLoading: txExpenditureLoading } = useQuery({
    queryKey: ['transactions-summary', 'expenditure'],
    queryFn: () => transactionApi.getTransactions({ pageNumber: 1, pageSize: 1, transactionType: 1 }),
  });

  const { data: walletsPaged, isLoading: walletsLoading } = useQuery({
    queryKey: ['wallets-summary'],
    queryFn: () => walletApi.getWallets({ pageNumber: 1, pageSize: 1 }),
  });

  const totalTx = txAll?.totalItems ?? 0;
  const totalContribution = txContribution?.totalItems ?? 0;
  const totalExpenditure = txExpenditure?.totalItems ?? 0;
  const totalWallets = walletsPaged?.totalItems ?? 0;

  const statValue = (loading: boolean, value: number) => (loading ? '—' : value.toLocaleString('vi-VN'));

  return (
    <div className="p-6 pl-8 space-y-2 app-page-bg" style={{ minHeight: 'var(--content-height, 100vh)' }}>
      {/* HEADER */}
      <div className="bg-white px-6 py-4 rounded-xl border shadow-sm">
        <h2 className="text-xl font-semibold text-black">Quản lý giao dịch</h2>
        <p className="text-xs text-gray-500">Quản lý các giao dịch trong hệ thống</p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <StatCard
          icon={<ClipboardList />}
          label="Tổng giao dịch"
          value={statValue(txAllLoading, totalTx)}
          sub="Giao dịch"
        />
        <StatCard
          icon={<ArrowUpCircle />}
          label="Đã đóng góp"
          value={statValue(txContributionLoading, totalContribution)}
          sub="Giao dịch"
          variant="green"
        />
        <StatCard
          icon={<ArrowDownCircle />}
          label="Các khoản chi"
          value={statValue(txExpenditureLoading, totalExpenditure)}
          sub="Giao dịch"
        />
        <StatCard
          icon={<Wallet />}
          label="Tổng quỹ"
          value={statValue(walletsLoading, totalWallets)}
          sub="Quỹ"
        />
      </div>

      {/* TABS */}
      <div className=" px-6 py-2 ">
        <Tabs value={currentTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="transactions" onClick={() => navigate('/manager/transactions')}>
                TẤT CẢ GIAO DỊCH
              </TabsTrigger>

              <TabsTrigger
                value="contribution"
                onClick={() => navigate('/manager/transactions/contribution')}
              >
                ĐÃ ĐÓNG GÓP
              </TabsTrigger>
              <TabsTrigger
                value="expenditure"
                onClick={() => navigate('/manager/transactions/expenditure')}
              >
                CÁC KHOẢN CHI
              </TabsTrigger>
              <TabsTrigger
                value="wallets"
                onClick={() => navigate('/manager/transactions/wallets')}
              >
                QUỸ
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
