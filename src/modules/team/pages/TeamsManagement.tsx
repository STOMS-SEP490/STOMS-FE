
import { RotateCcw, Eye, Pencil, Ban, Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import CreateTeamModal from './CreateTeamModal';
import type { Team } from '../team';
import { useTeams } from '../hooks/useTeams';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
import { DataTable } from '@/shared/components/common/DataTable';

export default function TeamsManagement() {
  const context = useOutletContext<{ position: string }>();

  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 10;
  const [search, setSearch] = useState('');
  const [openCreateModal, setOpenCreateModal] = useState(false);

  const { data, totalItems, loading } = useTeams(
    pageNumber,
    pageSize,
    search
  );

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
      cell: ({ row }) =>
        new Date(row.original.createdAt).toLocaleString(),
    },
    {
      id: 'actions',
      header: 'Thao tác',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex gap-3">
          <Ban
            size={16}
            className="text-red-500 cursor-pointer"
          />
          <Eye
            size={16}
            className="text-blue-600 cursor-pointer"
          />
          <Pencil
            size={16}
            className="text-blue-600 cursor-pointer"
          />
        </div>
      ),
    },
  ];

  /* HEADER */
  if (context.position === 'header') {
    return (
      <>
        <Button
          onClick={() => setOpenCreateModal(true)}
          className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white"
        >
          <Plus size={16} />
          Thêm nhóm mới
        </Button>

        <CreateTeamModal
          open={openCreateModal}
          onClose={() => setOpenCreateModal(false)}
          onCreated={() => setPageNumber(1)}
        />
      </>
    );
  }

  /* TOOLBAR */
  if (context.position === 'toolbar') {
    return (
      <div className="flex gap-3 items-center">
        <HoverSearch
          placeholder="Tìm tên nhóm..."
          value={search}
          
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
    );
  }

  /* CONTENT */
  return (
    <DataTable
      columns={columns}
      data={data}
      pageNumber={pageNumber}
      pageSize={pageSize}
      totalItems={totalItems}
      onPageChange={(page) => setPageNumber(page)}
    />
  );
}