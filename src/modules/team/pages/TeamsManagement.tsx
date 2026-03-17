import { RotateCcw, Eye, Pencil, Trash2, Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import { message } from 'antd';
import CreateTeamModal from './CreateTeamModal';
import EditTeamModal from './EditTeamModal';
import TeamDetailSidebar from './TeamDetailSidebar';
import teamService from '../services/teamService';
import type { Team } from '../team';
import { useTeams } from '../hooks/useTeams';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
import { DataTable } from '@/shared/components/common/DataTable';
import { Dialog } from '@/shared/components/ui/dialog';

export default function TeamsManagement() {
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 10;
  const [search, setSearch] = useState('');
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTeam, setDetailTeam] = useState<Team | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, totalItems, loading, refetch } = useTeams(
    pageNumber,
    pageSize,
    search,
    refreshKey
  );

  const handleView = async (team: Team) => {
    try {
      const full = await teamService.getTeamById(team.teamId);
      setDetailTeam(full);
      setDetailOpen(true);
    } catch {
      message.error('Không tải được thông tin nhóm');
    }
  };

  const handleEdit = async (team: Team) => {
    try {
      const full = await teamService.getTeamById(team.teamId);
      setEditTeam(full);
      setEditOpen(true);
    } catch {
      message.error('Không tải được thông tin nhóm để sửa');
    }
  };

  const handleDeleteClick = (team: Team) => {
    setTeamToDelete(team);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!teamToDelete) return;
    try {
      await teamService.deleteTeam(teamToDelete.teamId);
      message.success('Đã xóa nhóm');
      setDeleteOpen(false);
      setTeamToDelete(null);
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      message.error(msg || 'Xóa nhóm thất bại');
    }
  };

  const columns: ColumnDef<Team>[] = [
    { accessorKey: 'teamId', header: 'Team ID' },
    {
      accessorKey: 'teamName',
      header: 'Tên nhóm',
      cell: ({ row }) => (
        <span className="font-semibold text-gray-900">
          {row.original.teamName}
        </span>
      ),
    },
    {
      id: 'leader',
      header: 'Trưởng nhóm',
      cell: ({ row }) =>
        row.original.leaderMemberName ?? row.original.leaderMemberId ?? '—',
    },
    {
      id: 'topics',
      header: 'Số topic',
      cell: ({ row }) =>
        row.original.teamTopics?.filter((tt) => tt.isActive !== false).length ?? 0,
    },
    {
      accessorKey: 'createdAt',
      header: 'Ngày tạo',
      cell: ({ row }) =>
        row.original.createdAt
          ? new Date(row.original.createdAt).toLocaleString('vi-VN')
          : '—',
    },
    {
      id: 'actions',
      header: 'Thao tác',
      enableSorting: false,
      cell: ({ row }) => {
        const team = row.original;
        return (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleView(team)}
              className="text-gray-800 hover:text-gray-950"
              title="Xem"
            >
              <Eye size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleEdit(team)}
              className="text-blue-600 hover:text-blue-800"
              title="Sửa"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleDeleteClick(team)}
              className="text-red-500 hover:text-red-700"
              title="Xóa"
            >
              <Trash2 size={16} />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-black">Danh sách nhóm</h3>
          <p className="text-xs text-gray-500">Quản lý các nhóm trong hệ thống</p>
        </div>
        <Button
          onClick={() => setOpenCreateModal(true)}
          className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white"
        >
          <Plus size={16} />
          Thêm nhóm mới
        </Button>
      </div>

      {/* TOOLBAR */}
      <div className="flex gap-3 items-center justify-end">
        <HoverSearch
          placeholder="Tìm tên nhóm..."
          value={search}
          onChange={setSearch}
        />
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

      {/* TABLE */}
      <DataTable
        columns={columns}
        data={data}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={(page) => setPageNumber(page)}
      />

      <CreateTeamModal
        open={openCreateModal}
        onClose={() => setOpenCreateModal(false)}
        onCreated={async () => {
          setPageNumber(1);
          await refetch();
        }}
      />

      <EditTeamModal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditTeam(null);
        }}
        team={editTeam}
        onUpdated={async () => {
          setEditOpen(false);
          setEditTeam(null);
          await refetch();
        }}
      />

      <TeamDetailSidebar
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setDetailTeam(null);
        }}
        team={detailTeam}
      />

      <Dialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setTeamToDelete(null);
        }}
        title="Xóa nhóm"
        description={
          teamToDelete
            ? `Bạn có chắc muốn xóa nhóm "${teamToDelete.teamName}" (ID ${teamToDelete.teamId})?`
            : 'Bạn có chắc muốn xóa nhóm này?'
        }
      >
        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDeleteOpen(false);
              setTeamToDelete(null);
            }}
          >
            Hủy
          </Button>
          <Button type="button" className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteConfirm}>
            Xóa
          </Button>
        </div>
      </Dialog>
    </div>
  );
}