

import userService from '@/modules/user/api/userApi';
import type { Member, MemberDetail } from '@/modules/user/user';
import { DataTable } from '@/shared/components/common/DataTable';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import type { ColumnDef } from '@tanstack/react-table';
import { Ban, Eye, Pencil, Plus, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import RightSidebarUserDetail from './UserDetail';
import UserCreateForm from './UserCreateForm';

export default function UserManagement() {
  const context = useOutletContext<{ position: string }>();

  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberDetail | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const fetchMembers = async () => {
    try {
      const res = await userService.getMembers({
        pageNumber,
        pageSize,
      });

      setMembers(res.items ?? []);
      setTotalItems(res.totalItems ?? 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [pageNumber]);

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
        const handleView = async () => {
          try {
            const res = await userService.getMemberById(row.original.memberId);
            setSelectedMember(res);
            setOpen(true);
          } catch (err) {
            console.error(err);
          }
        };

        return (
          <div className="flex gap-3">
            <Ban size={16} className="text-red-500 cursor-pointer" />
            <Eye size={16} className="text-blue-600 cursor-pointer" onClick={handleView} />
            <Pencil size={16} className="text-blue-600 cursor-pointer" />
          </div>
        );
      },
    },
  ];

  /* ================= HEADER ================= */
  if (context.position === 'header') {
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
  if (context.position === 'toolbar') {
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

      <RightSidebarUserDetail open={open} onClose={() => setOpen(false)} member={selectedMember} />

      <UserCreateForm
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={fetchMembers}
      />
    </div>
  );
}
