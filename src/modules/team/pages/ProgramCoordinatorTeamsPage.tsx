import { Eye, RotateCcw } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import { useSearchParams } from 'react-router-dom';
import TeamDetailSidebar from './TeamDetailSidebar';
import teamService from '../services/teamService';
import type { Team } from '../team';
import { useTeams } from '../hooks/useTeams';
import HoverSearch from '@/shared/components/ui/search';
import { Button } from '@/shared/components/ui/button';
import { DataTable } from '@/shared/components/common/DataTable';

export default function ProgramCoordinatorTeamsPage() {
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 10;
  const [search, setSearch] = useState('');

  const { data: listData, isFetching: loading } = useTeams(pageNumber, pageSize, search);
  const data = listData?.items ?? [];
  const totalItems = listData?.totalItems ?? 0;

  const [searchParams, setSearchParams] = useSearchParams();
  const openDetailFromUrl = searchParams.get('openDetail');
  const teamIdFromUrl = searchParams.get('teamId');
  const skipNextAutoOpenRef = useRef(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTeam, setDetailTeam] = useState<Team | null>(null);

  const closeDetailFromUrl = () => {
    skipNextAutoOpenRef.current = true;
    setDetailOpen(false);
    setDetailTeam(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openDetail');
      next.delete('teamId');
      return next;
    });
  };

  useEffect(() => {
    if (openDetailFromUrl !== '1') return;
    if (!teamIdFromUrl) return;
    if (skipNextAutoOpenRef.current) {
      skipNextAutoOpenRef.current = false;
      return;
    }

    const teamId = Number(teamIdFromUrl);
    if (!teamId || Number.isNaN(teamId)) return;
    if (detailOpen && detailTeam?.teamId === teamId) return;

    (async () => {
      try {
        const full = await teamService.getTeamById(teamId);
        setDetailTeam(full);
        setDetailOpen(true);
      } catch {
        message.error('Không tải được thông tin nhóm');
      }
    })();
  }, [openDetailFromUrl, teamIdFromUrl, detailOpen, detailTeam?.teamId]);

  const handleView = async (team: Team) => {
    try {
      const full = await teamService.getTeamById(team.teamId);
      setDetailTeam(full);
      setDetailOpen(true);
    } catch {
      message.error('Không tải được thông tin nhóm');
    }
  };

  const columns: ColumnDef<Team>[] = [
    { accessorKey: 'teamId', header: 'Team ID' },
    {
      accessorKey: 'teamName',
      header: 'Tên nhóm',
      cell: ({ row }) => <span className="font-semibold text-[#1a7a99]">{row.original.teamName}</span>,
    },
    {
      id: 'leader',
      header: 'Trưởng nhóm',
      cell: ({ row }) => row.original.leaderMemberName ?? row.original.leaderMemberId ?? '—',
    },
    {
      id: 'topics',
      header: 'Số topic',
      cell: ({ row }) => row.original.teamTopics?.filter((tt) => tt.isActive !== false).length ?? 0,
    },
    {
      accessorKey: 'createdAt',
      header: 'Ngày tạo',
      cell: ({ row }) =>
        row.original.createdAt ? new Date(row.original.createdAt).toLocaleString('vi-VN') : '—',
    },
    {
      id: 'actions',
      header: 'Thao tác',
      enableSorting: false,
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => void handleView(row.original)}
          className="text-gray-800 hover:text-gray-950"
          title="Xem"
        >
          <Eye size={16} />
        </button>
      ),
    },
  ];

  return (
    <div
      className="relative p-6 space-y-3 app-page-bg flex flex-col min-h-0 overflow-hidden"
      style={{ height: 'var(--content-height, 100vh)' }}
    >
      <div className="shrink-0 flex justify-between bg-white px-6 py-4 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-[#1a7a99]">Danh sách nhóm</h2>
          <p className="text-xs text-gray-500">
            Xem toàn bộ nhóm trong hệ thống (chỉ có quyền xem, không thêm/sửa/xóa)
          </p>
        </div>
      </div>

      <div className="shrink-0 flex gap-3 items-center justify-end">
        <HoverSearch placeholder="Tìm tên nhóm..." value={search} onChange={setSearch} />
        <Button
          variant="secondary"
          className="bg-white"
          onClick={() => {
            setSearch('');
            setPageNumber(1);
          }}
        >
          <RotateCcw size={16} />
        </Button>
      </div>

      <div className="relative bg-white rounded-xl border shadow-sm px-6 py-4 flex-1 min-h-0 overflow-auto">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-white/60">
            <span className="text-sm text-slate-500">Đang tải danh sách nhóm...</span>
          </div>
        )}
        <DataTable
          columns={columns}
          data={data}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(page) => setPageNumber(page)}
          comfortable
        />
      </div>

      <TeamDetailSidebar
        open={detailOpen}
        onClose={() => {
          closeDetailFromUrl();
        }}
        team={detailTeam}
      />
    </div>
  );
}
