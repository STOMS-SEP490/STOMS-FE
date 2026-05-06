import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

export default function TeamLeaderAssignmentsLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDetailRoute = /\/tl\/assignments\/(assigning|rejected)\/\d+$/i.test(location.pathname);
  const activeTab: 'assigning' | 'rejected' = location.pathname.includes('/rejected')
    ? 'rejected'
    : 'assigning';

  return (
    <div
      className={`app-page-bg flex flex-col gap-1 ${isDetailRoute ? 'p-4' : 'p-6'}`}
      style={{ height: 'var(--content-height, 100vh)' }}
    >
      {!isDetailRoute ? (
        <>
          <div className="bg-white px-6 py-4 mb-0 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-semibold text-[#1a7a99]">Trung tâm phê duyệt</h2>
            <p className="text-xs text-gray-500">Quản lý phê duyệt yêu cầu và phê duyệt phân công</p>
          </div>

          <div className="flex items-center justify-between px-4 pb-2 mb-1 pt-2">
            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                navigate(value === 'rejected' ? '/tl/assignments/rejected' : '/tl/assignments/assigning')
              }
            >
              <TabsList className="h-10">
                <TabsTrigger value="assigning" className="h-8">Tất cả yêu cầu</TabsTrigger>
                <TabsTrigger value="rejected" className="h-8">Phân công bị từ chối</TabsTrigger>
              </TabsList>
            </Tabs>
            <div id="tl-assignments-filters" className="flex items-center" />
          </div>
        </>
      ) : null}

      <div className="flex-1 pb-4">
        <div className="h-full">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
