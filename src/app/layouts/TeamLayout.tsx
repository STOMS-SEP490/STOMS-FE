import { Outlet, useSearchParams } from 'react-router-dom';
import { StatCard } from '@/shared/components/common/StatCard';
import { Button } from '@/shared/components/ui/button';
import { GraduationCap, CheckCircle, Users, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { teamApi } from '@/modules/team/api/teamApi';
import memberApi from '@/modules/member/api/memberApi';

export default function TeamLayout() {
  const [, setSearchParams] = useSearchParams();

  const { data: teamsPaged, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams-summary'],
    queryFn: () => teamApi.getTeams({ pageNumber: 1, pageSize: 1 }),
  });

  const { data: teamsForLeaderCount } = useQuery({
    queryKey: ['teams-leader-count'],
    queryFn: () => teamApi.getTeams({ pageNumber: 1, pageSize: 1000 }),
  });

  const { data: membersPaged, isLoading: membersLoading } = useQuery({
    queryKey: ['members-summary'],
    queryFn: () => memberApi.getMembers({ pageNumber: 1, pageSize: 1 }),
  });

  const totalTeams = teamsPaged?.totalItems ?? 0;
  const teamsWithLeader =
    (teamsForLeaderCount?.items ?? []).filter((t) => t.leaderMemberId != null).length ?? 0;
  const totalMembers = membersPaged?.totalItems ?? 0;

  const statValue = (loading: boolean, value: number) =>
    loading ? '—' : value.toLocaleString('vi-VN');

  return (
    <div className="p-6 space-y-6 bg-[#f3f4f6]" style={{ minHeight: 'var(--content-height, 100vh)' }}>
      {/* HEADER */}
      <div className="bg-white flex justify-between px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">Quản lý nhóm</h2>
          <p className="text-xs text-gray-500">Quản lý nhóm trong hệ thống</p>
        </div>
        <Button
          onClick={() => {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('openCreate', '1');
              // tránh xung đột khi đang mở drawer detail
              next.delete('openDetail');
              next.delete('teamId');
              return next;
            });
          }}
          className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md"
        >
          <Plus size={16} />
          Thêm nhóm mới
        </Button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <StatCard
          icon={<GraduationCap />}
          label="Tổng nhóm"
          value={statValue(teamsLoading, totalTeams)}
          sub="Nhóm"
        />
        <StatCard
          icon={<CheckCircle />}
          label="Có trưởng nhóm"
          value={statValue(teamsLoading, teamsWithLeader)}
          sub="Nhóm"
          variant="green"
        />
        <StatCard
          icon={<Users />}
          label="Tổng thành viên"
          value={statValue(membersLoading, totalMembers)}
          sub="Thành viên"
        />
      </div>

      {/* TOOLBAR */}
      <div className="px-6 py-2">
        <Outlet context={{ position: 'toolbar' }} />
      </div>

      {/* CONTENT */}
      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
        <Outlet context={{ position: 'content' }} />
      </div>
    </div>
  );
}
