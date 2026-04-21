import { Loader2, Plus, RotateCcw, Eye, Pencil, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

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
      <div>
        <HoverSearch placeholder="Tìm tên nhóm..." value={q} onChange={setSearch} />
      </div>
      <Button variant="outline" size="icon" className="h-9 w-9" onClick={reset} title="Đặt lại bộ lọc">
        <RotateCcw size={16} />
      </Button>
    </div>
  );
}

function TeamsContent() {
  const queryClient = useQueryClient();
  const invalidateTeamList = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['teams', 'list'] });
  }, [queryClient]);

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

  const {
    data: listData,
    isFetching: listFetching,
    refetch: refetchList,
  } = useTeams(pageNumber, pageSize, search);
  const data = listData?.items ?? [];
  const totalItems = listData?.totalItems ?? 0;

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

  const handleDeleteConfirm = useCallback(async () => {
    if (!teamToDelete) return;
    try {
      await teamService.deleteTeam(teamToDelete.teamId);
      message.success('Đã xóa nhóm');
      setDeleteOpen(false);
      setTeamToDelete(null);
      invalidateTeamList();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      message.error(msg || 'Xóa nhóm thất bại');
    }
  }, [teamToDelete, invalidateTeamList]);

  const columns: ColumnDef<Team>[] = useMemo(
    () => [
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
        id: 'totalMembers',
        header: 'Số thành viên',
        cell: ({ row }) => {
          const t = row.original as Team & { TotalMembers?: number };
          const n = t.totalMembers ?? t.TotalMembers;
          return (
            <span className="tabular-nums text-gray-800">
              {typeof n === 'number' && !Number.isNaN(n) ? n : '—'}
            </span>
          );
        },
      },
      {
        id: 'topics',
        header: 'Số topic',
        cell: ({ row }) =>
          row.original.teamTopics?.filter((tt) => tt.isActive !== false).length ?? 0,
      },
      {
        accessorKey: 'updatedAt',
        header: 'Cập nhật',
        cell: ({ row }) => (
          <div className=" tabular-nums text-gray-800">
            {row.original.updatedAt ? new Date(row.original.updatedAt).toLocaleString('vi-VN') : '—'}
          </div>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="block w-full text-center">Thao tác</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const team = row.original;
          return (
            <div className="flex items-center gap-3">
              <span title="Xem">
                <Eye
                  size={16}
                  className="cursor-pointer text-gray-800"
                  onClick={() => void handleView(team)}
                />
              </span>
              <span title="Sửa">
                <Pencil
                  size={16}
                  className="cursor-pointer text-blue-600"
                  onClick={() => void handleEdit(team)}
                />
              </span>
              <span title="Xóa">
                <Trash2
                  size={16}
                  className="cursor-pointer text-red-500"
                  onClick={() => handleDeleteClick(team)}
                />
              </span>
            </div>
          );
        },
      },
    ],
    [handleDeleteClick, handleEdit, handleView],
  );

  return (
    <div className="space-y-4">
      

      <div className="relative min-h-[220px]">
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
        {listFetching ? (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-md bg-white/80 backdrop-blur-[1px]"
            aria-busy="true"
            aria-live="polite"
          >
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-hidden />
            <span className="text-sm text-slate-500">Đang tải danh sách...</span>
          </div>
        ) : null}
      </div>

      <CreateTeamModal
        open={openCreateModal}
        onClose={closeCreateFromUrl}
        onCreated={async () => {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set(TEAM_PAGE_PARAM, '1');
            return next;
          });
          await refetchList();
          invalidateTeamList();
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
          await refetchList();
          invalidateTeamList();
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
  const [, setSearchParams] = useSearchParams();

  return (
    <div className="space-y-6 p-6 pl-8 app-page-bg" style={{ minHeight: 'var(--content-height, 100vh)' }}>
      <div className="mb-2 flex items-center justify-between rounded-xl border bg-white px-6 py-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-[#1a7a99]">Quản lý nhóm</h2>
          <p className="text-xs text-slate-500">Quản lý nhóm trong hệ thống</p>
        </div>
        <Button
          onClick={() => {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('openCreate', '1');
              next.delete('openDetail');
              next.delete('teamId');
              return next;
            });
          }}
          className="gap-2 rounded-md bg-[#2197C0] px-3 py-2 text-white hover:bg-[#208AAE]"
        >
          <Plus size={16} />
          Thêm nhóm mới
        </Button>
      </div>

      <div className="mb-2 flex justify-end">
        <TeamsToolbar />
      </div>

      <div className="rounded-xl border bg-white px-6 py-4 shadow-sm">
        <TeamsContent />
      </div>
    </div>
  );
}