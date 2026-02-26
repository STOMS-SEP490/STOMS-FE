import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatCard } from '@/components/common/StatCard';
import { GraduationCap, CheckCircle, BookOpen, Clock } from 'lucide-react';

export default function TeamLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab = location.pathname.includes('members') ? 'members' : 'teams';

  return (
    <div className="h-screen p-6 space-y-6 bg-[#f3f4f6]">
      {/* HEADER */}
      <div className="bg-white flex justify-between px-6 py-4 mb-2 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-black">Quản lý nhóm</h2>
          <p className="text-xs text-gray-500">Quản lý nhóm và thành viên trong các nhóm</p>
        </div>

        {/* Button từ page con */}
        <div className="flex gap-3 items-center">
          <Outlet context={{ position: 'header' }} />
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4 mb-0">
        <StatCard icon={<GraduationCap />} label="Tổng nhóm" value="48" sub="Nhóm" />
        <StatCard
          icon={<CheckCircle />}
          label="Đang hoạt động"
          value="42"
          sub="Nhóm"
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

      {/* TABS + TOOLBAR */}
      <div className="px-6 py-2 mb-1">
        <Tabs value={currentTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="teams" onClick={() => navigate('/manager/teams')}>
                NHÓM
              </TabsTrigger>

              <TabsTrigger value="members" onClick={() => navigate('/manager/teams/members')}>
                THÀNH VIÊN
              </TabsTrigger>
            </TabsList>

            {/* Search / Filter từ page con */}
            <Outlet context={{ position: 'toolbar' }} />
          </div>
        </Tabs>
      </div>

      {/* CONTENT */}
      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
        <Outlet context={{ position: 'content' }} />
      </div>
    </div>
  );
}
