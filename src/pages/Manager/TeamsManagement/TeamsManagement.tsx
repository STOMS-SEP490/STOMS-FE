import { DataTable } from '@/components/common/DataTable';
import HoverSearch from '@/components/ui/search';
import { Button } from '@/components/ui/button';
import { RotateCcw, Eye, Pencil, Ban, Plus } from 'lucide-react';
import teamService from '@/services/teamService';
import type { Team } from '@/types/team';
import type { ColumnDef } from '@tanstack/react-table';
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import CreateTeamModal from './CreateTeamModal';
import userService from '@/services/userService';

export default function TeamsManagement() {
  const context = useOutletContext<{ position: string }>();

  const [teams, setTeams] = useState<Team[]>([]);

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');

  const [openCreateModal, setOpenCreateModal] = useState(false);

  /* ================= FETCH TEAMS ================= */
  const fetchTeams = async () => {
    try {
      const res = await teamService.getTeams({
        pageNumber,
        pageSize,
      });

      setTeams(res.items ?? []);
      setTotalItems(res.totalItems ?? 0);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [pageNumber, search]);

  /* ================= COLUMNS ================= */
  const columns: ColumnDef<Team>[] = [
    { accessorKey: 'teamId', header: 'Team ID' },
    { accessorKey: 'teamName', header: 'Tên đội' },
    { accessorKey: 'leaderMemberId', header: 'Leader' },
    {
      id: 'topics',
      header: 'Số topic',
      cell: ({ row }) => row.original.teamTopics?.length ?? 0,
    },
    {
      accessorKey: 'createdAt',
      header: 'Ngày tạo',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
    },
    {
      id: 'actions',
      header: 'Thao tác',
      enableSorting: false,
      cell: () => (
        <div className="flex gap-3">
          <Ban size={16} className="text-red-500 cursor-pointer" />
          <Eye size={16} className="text-blue-600 cursor-pointer" />
          <Pencil size={16} className="text-blue-600 cursor-pointer" />
        </div>
      ),
    },
  ];

  /* ================= HEADER ================= */
  if (context.position === 'header') {
    return (
      <>
        <Button
          onClick={() => setOpenCreateModal(true)}
          className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md"
        >
          <Plus size={16} />
          Thêm nhóm mới
        </Button>

        <CreateTeamModal
          open={openCreateModal}
          onClose={() => setOpenCreateModal(false)}
          onCreated={fetchTeams}
        />
      </>
    );
  }

  /* ================= TOOLBAR ================= */
  if (context.position === 'toolbar') {
    return (
      <div className="flex gap-3 items-center">
        <HoverSearch placeholder="Tìm tên nhóm..." />

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
    );
  }

  /* ================= CONTENT ================= */
  return (
    <>
      <DataTable
        columns={columns}
        data={teams}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={(page) => setPageNumber(page)}
      />
    </>
  );
}
