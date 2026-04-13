import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

export default function TeamLeaderAssignmentsLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab: 'assigning' | 'rejected' = location.pathname.includes('/rejected')
    ? 'rejected'
    : 'assigning';

  return (
    <div
      className="p-6 bg-slate-50 flex flex-col gap-1 min-h-0 overflow-hidden"
      style={{ height: 'var(--content-height, 100vh)' }}
    >
      <div className="bg-white px-6 py-4 mb-0 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-semibold text-black">Trung tâm phê duyệt</h2>
        <p className="text-xs text-gray-500">Quản lý phê duyệt yêu cầu và phê duyệt phân công nhân sự</p>
      </div>

      <div className="px-4 pb-2 mb-1 pt-0">
        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            navigate(value === 'rejected' ? '/tl/assignments/rejected' : '/tl/assignments/assigning')
          }
        >
          <TabsList>
            <TabsTrigger value="assigning">Tất cả yêu cầu</TabsTrigger>
            <TabsTrigger value="rejected">Phân công bị từ chối</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 min-h-0 pb-4">
        <div className="h-full min-h-0 overflow-hidden pr-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
