
import { ROLE_MAP } from '@/constants/role';
import userService from '@/modules/user/api/userApi';
import type { User } from '@/modules/user/user';
import { DataTable } from '@/shared/components/common/DataTable';
import { StatCard } from '@/shared/components/common/StatCard';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Ban,
  BookOpen,
  CheckCircle,
  Clock,
  Eye,
  GraduationCap,
  Key,
  Pencil,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import UserCreateForm from './UserCreateForm';


export default function UserManagement() {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [openCreate, setOpenCreate] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await userService.getUsers({
        pageNumber,
        pageSize,
      });

      setUsers(res.items);
      setTotalItems(res.totalItems);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [pageNumber]);

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'userId',
      header: 'User ID',
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      id: 'role',
      header: 'Vai trò',
      cell: ({ row }) => {
        const roleId = row.original.roleId;
        const roleName = ROLE_MAP[roleId] || 'Không xác định';

        const roleColorMap: Record<number, string> = {
          1: 'bg-purple-100 text-purple-700',
          2: 'bg-blue-100 text-blue-700',
          3: 'bg-cyan-100 text-cyan-700',
          4: 'bg-green-100 text-green-700',
          5: 'bg-orange-100 text-orange-600',
        };

        return (
          <Badge className={roleColorMap[roleId] || 'bg-gray-100 text-gray-700'}>{roleName}</Badge>
        );
      },
    },
    {
      id: 'status',
      header: 'Trạng thái',
      cell: ({ row }) =>
        row.original.isActive ? (
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
      accessorKey: 'updatedAt',
      header: 'Cập nhật',
      cell: ({ row }) => new Date(row.original.updatedAt).toLocaleString(),
    },

    {
      id: 'actions',
      header: 'Thao tác',
      enableSorting: false,
      cell: ({ row }) => {
        const handleView = async () => {
          // const user = await userService.getUserById(row.original.userId);
          // setSelectedUser(user);
          setOpen(true);
        };

        return (
          <div className="flex gap-3">
            <Key size={16} className="text-yellow-600 cursor-pointer" />
            <Ban size={16} className="text-red-500 cursor-pointer" />
            <Eye size={16} className="text-blue-600 cursor-pointer" onClick={handleView} />
            <Pencil size={16} className="text-blue-600 cursor-pointer" />
          </div>
        );
      },
    },
  ];

  return (
    <div className=" p-6 space-y-6 ">
      {/* HEADER */}
      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">Quản lý tài khoản</h2>
          <p className="text-xs text-gray-500">Quản lý tài khoản người dùng trong hệ thống</p>
        </div>

        <div className="flex gap-3 items-center">
          <Button
            onClick={() => setOpenCreate(true)}
            className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md"
          >
            <Plus size={16} />
            Thêm tài khoản mới
          </Button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4 mb-2">
        <StatCard
          icon={<GraduationCap />}
          label="Tổng người dùng"
          value="186"
          sub="tài khoản đang hoạt động"
        />
        <StatCard
          icon={<CheckCircle />}
          label="Tổng giảng viên"
          value="42"
          sub="giảng viên và trợ giảng"
          variant="green"
        />
        <StatCard
          icon={<BookOpen />}
          label="Vô hiệu hóa"
          value="156"
          sub="người dùng đã bị vô hiệu hóa"
        />
        <StatCard icon={<Clock />} label="Tổng buổi học" value="1,248" sub="Buổi học" />
      </div>

      {/* Filter Bar */}
      <div className="flex justify-end gap-3 mb-2">
        <HoverSearch />
        <div className="flex items-center gap-3">
          <Select>
            <SelectTrigger className="text-sm bg-white">
              <SelectValue placeholder="Vai trò" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {Object.entries(ROLE_MAP).map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger className="text-sm bg-white">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="active">Hoạt động</SelectItem>
              <SelectItem value="inactive">Vô hiệu hóa</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="secondary" className="bg-white">
            <RotateCcw size={16} />
          </Button>
          {/* Reset Button */}
          <Button variant="secondary" className="bg-white">
            <RotateCcw />
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={users}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={(page) => setPageNumber(page)}
      />

      <UserCreateForm
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={() => {
          fetchUsers();
          setOpenCreate(false);
        }}
      />
    </div>
  );
}
