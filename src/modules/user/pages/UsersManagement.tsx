
import { ROLE_MAP, getRoleLabel, getRoleBadgeClass } from '@/constants/role';
import { dashboardApi } from '@/modules/dashboard/api/dashboardApi';
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
  CheckCircle,
  Clock,
  Eye,
  Key,
  LogIn,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RotateCcw,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  /** Backend: `lockedUsers` = tài khoản vô hiệu hóa (cùng ý thẻ này). */
  const [lockedUsers, setLockedUsers] = useState(0);
  const [loggedInTodayUsers, setLoggedInTodayUsers] = useState(0);
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

  /** Chỉ tải danh sách + phân trang (1 API). Đổi filter / trang chỉ cần gọi hàm này. */
  const fetchTable = useCallback(async () => {
    try {
      const params: Record<string, unknown> = { pageNumber, pageSize };
      if (filterEmail.trim()) params.Email = filterEmail.trim();
      if (filterRoleId !== 'all') params.RoleId = Number(filterRoleId);
      if (filterStatus === 'active') params.IsActive = true;
      if (filterStatus === 'inactive') params.IsActive = false;
      const res = await userService.getUsers(params);
      setUsers(res.items ?? []);
      setTotalItems(res.totalItems ?? 0);
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  }, [pageNumber, pageSize, filterEmail, filterRoleId, filterStatus]);

  /** Thống kê: GET /dashboard/users/statistics — dùng trực tiếp `summary` từ API. */
  const fetchStats = useCallback(async () => {
    try {
      const data = await dashboardApi.getUsersOverview();
      const s = data.summary;
      setTotalAllUsers(s.totalUsers ?? 0);
      setTotalActiveUsers(s.activeUsers ?? 0);
      setLockedUsers(s.lockedUsers ?? 0);
      setLoggedInTodayUsers(s.loggedInTodayUsers ?? 0);
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  }, []);

  const refreshTableAndStats = useCallback(async () => {
    await Promise.all([fetchTable(), fetchStats()]);
  }, [fetchTable, fetchStats]);

  /** Bảng: mỗi lần đổi filter/trang → 1 request. */
  useEffect(() => {
    void fetchTable();
  }, [fetchTable]);

  /** Thống kê: 1 request /dashboard/users/statistics (Strict Mode dev có thể gọi ×2). */
  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const handleResetFilters = () => {
    setFilterEmail('');
    setFilterRoleId('all');
    setFilterStatus('all');
    setPageNumber(1);
  };

  /** Đổi bộ lọc → luôn về trang 1 (tránh đang page 5 + search mới → API trả rỗng dù có dữ liệu ở page 1). */
  const setFilterEmailAndResetPage = (v: string) => {
    setFilterEmail(v);
    setPageNumber(1);
  };
  const setFilterRoleIdAndResetPage = (v: string) => {
    setFilterRoleId(v);
    setPageNumber(1);
  };
  const setFilterStatusAndResetPage = (v: string) => {
    setFilterStatus(v);
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
          void refreshTableAndStats();
        } catch (err) {
          message.error(getErrorMessage(err));
        }
      },
    });
  };

  const columns: ColumnDef<User>[] = [
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
      header: () => <span className="block w-full text-center">Thao tác</span>,
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
            <span title="Đặt lại mật khẩu về stoms123">
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
    <div className="p-6 pl-8 space-y-6 ">
      {/* HEADER */}
      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border border-border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-[#1a7a99]">Quản lý tài khoản</h2>
          <p className="text-xs text-slate-500">Quản lý tài khoản người dùng trong hệ thống</p>
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

      {/* STATS — theo `summary` của /dashboard/users/statistics */}
      <div className="grid grid-cols-2 gap-4 mb-2 md:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Tổng người dùng"
          value={totalAllUsers.toLocaleString('vi-VN')}
          sub="tổng số tài khoản trong hệ thống"
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5" />}
          label="Đang hoạt động"
          value={totalActiveUsers.toLocaleString('vi-VN')}
          sub="tài khoản đang được kích hoạt"
          variant="green"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Vô hiệu hóa"
          value={lockedUsers.toLocaleString('vi-VN')}
          sub="tài khoản đã vô hiệu hóa"
          variant="rose"
        />
        <StatCard
          icon={<LogIn className="h-5 w-5" />}
          label="Đăng nhập hôm nay"
          value={loggedInTodayUsers.toLocaleString('vi-VN')}
          sub="số người dùng đăng nhập hôm nay"
          variant="orange"
        />
      </div>

      <div className="flex justify-end gap-3 mb-2 flex-wrap">
        <div>
          <HoverSearch
            placeholder="Tìm theo email..."
            value={filterEmail}
            onChange={setFilterEmailAndResetPage}
          />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Select value={filterRoleId} onValueChange={setFilterRoleIdAndResetPage}>
              <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[180px]">
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả vai trò</SelectItem>
                {Object.entries(ROLE_MAP).map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatusAndResetPage}>
              <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[180px]">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="inactive">Vô hiệu hóa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleResetFilters} title="Đặt lại bộ lọc">
            <RotateCcw size={16} />
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
        <DataTable
          columns={columns}
          data={users}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(page) => setPageNumber(page)}
          comfortable
        />
      </div>

      <UserCreateForm
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={() => {
          void refreshTableAndStats();
          setOpenCreate(false);
        }}
      />

      <UserDetailDrawer
        open={openDetail}
        onClose={closeDetailFromUrl}
        userId={openDetail ? selectedUser?.userId ?? null : null}
      />

      <UserEditModal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        user={selectedUser}
        onUpdated={() => {
          void refreshTableAndStats();
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