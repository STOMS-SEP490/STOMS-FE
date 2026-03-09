

import type { Member } from '@/modules/user/user';
import { useMembers } from '@/modules/user/hooks/useMembers';
import { DataTable } from '@/shared/components/common/DataTable';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import type { ColumnDef } from '@tanstack/react-table';
import { Ban, Eye, Pencil, Plus, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import RightSidebarUserDetail from './UserDetail';
import CreateMemberModal from './CreateMemberModal';

type OutletContext = {
  position?: string;
  createMemberOpen?: boolean;
  setCreateMemberOpen?: (open: boolean) => void;
};

export default function MembersManagement() {
  const context = useOutletContext<OutletContext>();

  const {
    members,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
    selectedMember,
    openDetail,
    setOpenDetail,
    handleViewMember,
    refetch: refetchMembers,
  } = useMembers();

  const [openCreateLocal, setOpenCreateLocal] = useState(false);

  const openCreate = context?.createMemberOpen ?? openCreateLocal;
  const setOpenCreate = context?.setCreateMemberOpen ?? setOpenCreateLocal;

  const columns: ColumnDef<Member>[] = [
    {
      accessorKey: 'memberId',
      header: 'Mã người dùng',
    },
    {
      id: 'user',
      header: 'Tên người dùng',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <img
            src={row.original.avatarUrl || '/img/ava.png'}
            alt="avatar"
            className="w-8 h-8 rounded-full object-cover"
          />
          <div>
            <p className="font-medium text-sm">{row.original.fullName}</p>
            <p className="text-xs text-gray-500">{row.original.user.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'role',
      header: 'Vai trò',
      cell: ({ row }) => {
        const roleId = row.original.user.roleId;

        const roleName = roleId === 1 ? 'Trưởng nhóm' : roleId === 2 ? 'Giảng viên' : 'Trợ giảng';

        const roleColor =
          roleId === 1
            ? 'bg-blue-100 text-blue-700'
            : roleId === 2
              ? 'bg-green-100 text-green-700'
              : 'bg-orange-100 text-orange-600';

        return <Badge className={roleColor}>{roleName}</Badge>;
      },
    },
    {
      id: 'team',
      header: 'Nhóm',
      cell: ({ row }) => row.original.team?.teamName,
    },
    {
      id: 'status',
      header: 'Trạng thái',
      cell: ({ row }) =>
        row.original.user.isActive ? (
          <Badge className="bg-green-100 text-green-700">Hoạt động</Badge>
        ) : (
          <Badge className="bg-red-100 text-red-600">Vô hiệu hóa</Badge>
        ),
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
      cell: ({ row }) => {
        return (
          <div className="flex gap-3">
            <Ban size={16} className="text-red-500 cursor-pointer" />
            <Eye
              size={16}
              className="text-blue-600 cursor-pointer"
              onClick={() => handleViewMember(row.original.memberId)}
            />
            <Pencil size={16} className="text-blue-600 cursor-pointer" />
          </div>
        );
      },
    },
  ];

  /* ================= HEADER ================= */
  if (context?.position === 'header') {
    return (
      <Button
        onClick={() => setOpenCreate(true)}
        className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md"
      >
        <Plus size={16} />
        Thêm thành viên
      </Button>
    );
  }

  /* ================= TOOLBAR ================= */
  if (context?.position === 'toolbar') {
    return (
      <div className="flex gap-3">
        <HoverSearch placeholder="Tìm tên nhóm..." />

        <div className="flex items-center gap-3">
          <Select>
            <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white ">
              <SelectValue placeholder="Vai trò" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="coordinator">Program Coordinator</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
              <SelectItem value="ta">Teaching Assistant</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white">
              <SelectValue placeholder="Nhóm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="group-a">Group A</SelectItem>
              <SelectItem value="group-b">Group B</SelectItem>
              <SelectItem value="group-c">Group C</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="secondary" className="bg-white">
            <RotateCcw />
          </Button>
        </div>
      </div>
    );
  }

  /* ================= CONTENT ================= */
  return (
    <div>
      <DataTable
        columns={columns}
        data={members}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={(page) => setPageNumber(page)}
      />

      <RightSidebarUserDetail
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        member={selectedMember}
      />

      <CreateMemberModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={refetchMembers}
      />
    </div>
  );
}
