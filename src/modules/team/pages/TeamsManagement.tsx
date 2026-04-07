import { RotateCcw, Eye, Pencil, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import { useOutletContext, useSearchParams } from 'react-router-dom';

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

const TEAM_PAGE_PARAM = 'teamPage';
const TEAM_Q_PARAM = 'teamQ';

function TeamsToolbar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get(TEAM_Q_PARAM) ?? '';

  const setSearch = (value: string) => {
    const trimmed = value.trim();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (trimmed) next.set(TEAM_Q_PARAM, trimmed);
      else next.delete(TEAM_Q_PARAM);
      next.set(TEAM_PAGE_PARAM, '1');
      return next;
    });
  };

  const reset = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete(TEAM_Q_PARAM);
      next.set(TEAM_PAGE_PARAM, '1');
      return next;
    });
  };

  return (
    <div className="flex gap-3 items-center justify-end">
      <HoverSearch placeholder="Tìm tên nhóm..." value={q} onChange={setSearch} />
      <Button variant="secondary" className="bg-white" onClick={reset} title="Đặt lại bộ lọc">
        <RotateCcw size={16} />
      </Button>
    </div>
  );
}

function TeamsContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const openDetailFromUrl = searchParams.get('openDetail');
  const teamIdFromUrl = searchParams.get('teamId');
  const openCreateFromUrl = searchParams.get('openCreate');

  const pageSize = 10;
  const pageNumber = Math.max(1, Number(searchParams.get(TEAM_PAGE_PARAM) || '1') || 1);
  const search = searchParams.get(TEAM_Q_PARAM) ?? '';

  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTeam, setDetailTeam] = useState<Team | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTeam, setEditTeam] = useState<Team | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, totalItems, loading, refetch } = useTeams(pageNumber, pageSize, search, refreshKey);

  const skipNextAutoOpenRef = useRef(false);

  const closeDetailFromUrl = useCallback(() => {
    skipNextAutoOpenRef.current = true;
    setDetailOpen(false);
    setDetailTeam(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openDetail');
      next.delete('teamId');
      return next;
    });
  }, [setSearchParams]);

  const closeCreateFromUrl = useCallback(() => {
    setOpenCreateModal(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openCreate');
      return next;
    });
  }, [setSearchParams]);

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

  useEffect(() => {
    if (openCreateFromUrl !== '1') return;
    setOpenCreateModal(true);
    // Xóa query ngay sau khi mở để tránh chạy lại effect
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openCreate');
      return next;
    });
  }, [openCreateFromUrl, setSearchParams]);

  const handleView = useCallback(async (team: Team) => {
    try {
      const full = await teamService.getTeamById(team.teamId);
      setDetailTeam(full);
      setDetailOpen(true);
    } catch {
      message.error('Không tải được thông tin nhóm');
    }
  }, []);

  const handleEdit = useCallback(async (team: Team) => {
    try {
      const full = await teamService.getTeamById(team.teamId);
      setEditTeam(full);
      setEditOpen(true);
    } catch {
      message.error('Không tải được thông tin nhóm để sửa');
    }
  }, []);

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

  const columns: ColumnDef<Team>[] = useMemo(
    () => [
      { accessorKey: 'teamId', header: 'Team ID' },
      {
        accessorKey: 'teamName',
        header: 'Tên nhóm',
        cell: ({ row }) => <span className="font-semibold text-gray-900">{row.original.teamName}</span>,
      },
      {
        id: 'leader',
        header: 'Trưởng nhóm',
        cell: ({ row }) => row.original.leaderMemberName ?? row.original.leaderMemberId ?? '—',
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
    ],
    [handleDeleteClick, handleEdit, handleView],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-lg font-semibold text-black">Danh sách nhóm</h3>
          <p className="text-xs text-gray-500">Quản lý các nhóm trong hệ thống</p>
        </div>
        {loading && <span className="text-xs text-gray-500">Đang tải dữ liệu...</span>}
      </div>

      <DataTable
        columns={columns}
        data={data}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={(page) => {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set(TEAM_PAGE_PARAM, String(page));
            return next;
          });
        }}
      />

      <CreateTeamModal
        open={openCreateModal}
        onClose={closeCreateFromUrl}
        onCreated={async () => {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set(TEAM_PAGE_PARAM, '1');
            return next;
          });
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
        onClose={closeDetailFromUrl}
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
          <Button
            type="button"
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handleDeleteConfirm}
          >
            Xóa
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

export default function TeamsManagement() {
  const ctx = useOutletContext<{ position: string }>();
  if (ctx.position === 'toolbar') return <TeamsToolbar />;
  return <TeamsContent />;
}