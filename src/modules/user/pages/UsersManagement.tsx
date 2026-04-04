
import { ROLE_MAP, getRoleLabel, getRoleBadgeClass } from '@/constants/role';
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
  BookOpen,
  CheckCircle,
  Clock,
  Eye,
  GraduationCap,
  Key,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RotateCcw,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { message, Modal } from 'antd';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import UserCreateForm from './UserCreateForm';
import UserDetailDrawer from './UserDetailDrawer';
import UserEditModal from './UserEditModal';
import ResetPasswordModal from './ResetPasswordModal';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalAllUsers, setTotalAllUsers] = useState(0);
  const [totalActiveUsers, setTotalActiveUsers] = useState(0);
  const [totalInactiveUsers, setTotalInactiveUsers] = useState(0);
  const [totalTeachersAndTAs, setTotalTeachersAndTAs] = useState(0);
  const [openCreate, setOpenCreate] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openResetPassword, setOpenResetPassword] = useState(false);
  const [filterEmail, setFilterEmail] = useState('');
  const [filterRoleId, setFilterRoleId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [searchParams, setSearchParams] = useSearchParams();
  const openDetailFromUrl = searchParams.get('openDetail');
  const userIdFromUrl = searchParams.get('userId');

  const skipNextAutoOpenRef = useRef(false);

  const closeDetailFromUrl = () => {
    skipNextAutoOpenRef.current = true;
    setOpenDetail(false);
    setSelectedUser(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openDetail');
      next.delete('userId');
      return next;
    });
  };

  useEffect(() => {
    if (openDetailFromUrl !== '1') return;
    if (!userIdFromUrl) return;

    if (skipNextAutoOpenRef.current) {
      skipNextAutoOpenRef.current = false;
      return;
    }

    const userId = Number(userIdFromUrl);
    if (!userId || Number.isNaN(userId)) return;
    if (openDetail && selectedUser?.userId === userId) return;

    (async () => {
      try {
        const user = await userService.getUserById(userId);
        setSelectedUser(user);
        setOpenDetail(true);
      } catch {
        message.error('Không tải được thông tin tài khoản');
      }
    })();
  }, [openDetailFromUrl, userIdFromUrl, openDetail, selectedUser?.userId]);

  const fetchUsers = async () => {
    try {
      const params: Record<string, unknown> = { pageNumber, pageSize };
      if (filterEmail.trim()) params.Email = filterEmail.trim();
      if (filterRoleId !== 'all') params.RoleId = Number(filterRoleId);
      if (filterStatus === 'active') params.IsActive = true;
      if (filterStatus === 'inactive') params.IsActive = false;
      const [res, allRes, activeRes, inactiveRes, teacherRes, taRes] = await Promise.all([
        userService.getUsers(params),
        userService.getUsers({ pageNumber: 1, pageSize: 1 }),
        userService.getUsers({ pageNumber: 1, pageSize: 1, IsActive: true }),
        userService.getUsers({ pageNumber: 1, pageSize: 1, IsActive: false }),
        userService.getUsers({ pageNumber: 1, pageSize: 1, RoleId: 4 }),
        userService.getUsers({ pageNumber: 1, pageSize: 1, RoleId: 5 }),
      ]);

      setUsers(res.items ?? []);
      setTotalItems(res.totalItems ?? 0);
      setTotalAllUsers(allRes.totalItems ?? 0);
      setTotalActiveUsers(activeRes.totalItems ?? 0);
      setTotalInactiveUsers(inactiveRes.totalItems ?? 0);
      setTotalTeachersAndTAs((teacherRes.totalItems ?? 0) + (taRes.totalItems ?? 0));
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [pageNumber, filterEmail, filterRoleId, filterStatus]);

  const handleResetFilters = () => {
    setFilterEmail('');
    setFilterRoleId('all');
    setFilterStatus('all');
    setPageNumber(1);
  };

  const handleBan = (user: User) => {
    const isActive = user.isActive;
    Modal.confirm({
      title: isActive ? 'Vô hiệu hóa tài khoản?' : 'Kích hoạt lại tài khoản?',
      content: isActive
        ? `Tài khoản ${user.email} sẽ không thể đăng nhập. Bạn có chắc?`
        : `Kích hoạt lại tài khoản ${user.email}?`,
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          if (isActive) {
            await userService.deactivateUser(user.userId);
            message.success('Đã vô hiệu hóa tài khoản');
          } else {
            await userService.activateUser(user.userId);
            message.success('Đã kích hoạt tài khoản');
          }
          fetchUsers();
        } catch (err) {
          message.error(getErrorMessage(err));
        }
      },
    });
  };

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
        const roleId = Number(row.original.roleId ?? 0);
        return (
          <Badge className={`${getRoleBadgeClass(roleId)} border`}>{getRoleLabel(roleId)}</Badge>
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
      id: 'actions',
      header: 'Thao tác',
      enableSorting: false,
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex gap-3">
            <span title="Xem chi tiết">
              <Eye
                size={16}
                className="text-gray-800 cursor-pointer"
                onClick={() => {
                  setSelectedUser(u);
                  setOpenDetail(true);
                }}
              />
            </span>
            <span title="Chỉnh sửa">
              <Pencil
                size={16}
                className="text-blue-600 cursor-pointer"
                onClick={() => {
                  setSelectedUser(u);
                  setOpenEdit(true);
                }}
              />
            </span>
            {u.isActive ? (
              <span title="Vô hiệu hóa">
                <PowerOff
                  size={16}
                  className="text-red-500 cursor-pointer"
                  onClick={() => handleBan(u)}
                />
              </span>
            ) : (
              <span title="Kích hoạt">
                <Power
                  size={16}
                  className="text-green-600 cursor-pointer"
                  onClick={() => handleBan(u)}
                />
              </span>
            )}
            <span title="Reset mật khẩu về stoms123">
              <Key
                size={16}
                className="text-yellow-600 cursor-pointer"
                onClick={() => {
                  setSelectedUser(u);
                  setOpenResetPassword(true);
                }}
              />
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <div className=" p-6 space-y-6 ">
      {/* HEADER */}
      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border border-border shadow-sm items-center">
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
          value={totalAllUsers.toLocaleString('vi-VN')}
          sub="tổng số tài khoản"
        />
        <StatCard
          icon={<CheckCircle />}
          label="Đang hoạt động"
          value={totalActiveUsers.toLocaleString('vi-VN')}
          sub="tài khoản đang hoạt động"
          variant="green"
        />
        <StatCard
          icon={<BookOpen />}
          label="Tổng giảng viên"
          value={totalTeachersAndTAs.toLocaleString('vi-VN')}
          sub="giảng viên và trợ giảng"
        />
        <StatCard
          icon={<Clock />}
          label="Vô hiệu hóa"
          value={totalInactiveUsers.toLocaleString('vi-VN')}
          sub="người dùng đã bị vô hiệu hóa"
        />
      </div>

      {/* Filter Bar */}
      <div className="flex justify-end gap-3 mb-2">
        <HoverSearch
          placeholder="Tìm theo email..."
          value={filterEmail}
          onChange={setFilterEmail}
        />
        <div className="flex items-center gap-3">
          <Select value={filterRoleId} onValueChange={setFilterRoleId}>
            <SelectTrigger className="text-sm bg-white w-[140px]">
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

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="text-sm bg-white w-[140px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="active">Hoạt động</SelectItem>
              <SelectItem value="inactive">Vô hiệu hóa</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="secondary" className="bg-white" onClick={handleResetFilters} title="Đặt lại bộ lọc">
            <RotateCcw size={16} />
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

      <UserDetailDrawer
        open={openDetail}
        onClose={closeDetailFromUrl}
        user={selectedUser}
      />

      <UserEditModal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        user={selectedUser}
        onUpdated={() => {
          fetchUsers();
          setOpenEdit(false);
        }}
      />

      <ResetPasswordModal
        open={openResetPassword}
        onClose={() => setOpenResetPassword(false)}
        user={selectedUser}
        onSuccess={() => {
          setOpenResetPassword(false);
          setSelectedUser(null);
        }}
      />
    </div>
  );
}
