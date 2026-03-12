import type { Member } from '@/modules/member/member';
import { useMembers } from '@/modules/member/hooks/useMembers';
import userApi from '@/modules/user/api/userApi';
import { teamApi } from '@/modules/team/api/teamApi';
import type { Team } from '@/modules/team/team';
import { DataTable } from '@/shared/components/common/DataTable';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil, Plus, Power, PowerOff, RotateCcw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { message, Modal } from 'antd';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import MemberDetailSidebar from './MemberDetailSidebar';
import CreateMemberModal from './CreateMemberModal';
import MemberEditModal from './MemberEditModal';
import { ROLE_MAP } from '@/constants/role';

export default function MembersManagement() {
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
    filterFullName,
    setFilterFullName,
    filterTeamId,
    setFilterTeamId,
    resetFilters,
  } = useMembers();

  const [openCreate, setOpenCreate] = useState(false);
  const [editMemberId, setEditMemberId] = useState<number | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    teamApi.getTeams({ pageSize: 500 }).then((res) => setTeams(res.items ?? [])).catch(() => {});
  }, []);

  const handleBan = (member: Member) => {
    const isActive = member.user?.isActive ?? true;
    Modal.confirm({
      title: isActive ? 'Vô hiệu hóa tài khoản?' : 'Kích hoạt lại tài khoản?',
      content: isActive
        ? `Thành viên ${member.fullName} sẽ không thể đăng nhập. Bạn có chắc?`
        : `Kích hoạt lại tài khoản của ${member.fullName}?`,
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          const userId = member.user?.userId;
          if (!userId) {
            message.error('Không tìm thấy tài khoản');
            return;
          }
          if (isActive) {
            await userApi.deactivateUser(userId);
            message.success('Đã vô hiệu hóa tài khoản');
          } else {
            await userApi.activateUser(userId);
            message.success('Đã kích hoạt tài khoản');
          }
          refetchMembers();
        } catch (err) {
          message.error(getErrorMessage(err));
        }
      },
    });
  };

  const columns: ColumnDef<Member>[] = [
    { accessorKey: 'memberId', header: 'Mã người dùng' },
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
        const roleName = ROLE_MAP[roleId] ?? `Vai trò ${roleId || ''}`;
        const roleColorMap: Record<number, string> = {
          1: 'bg-purple-100 text-purple-700',
          2: 'bg-blue-100 text-blue-700',
          3: 'bg-cyan-100 text-cyan-700',
          4: 'bg-green-100 text-green-700',
          5: 'bg-orange-100 text-orange-600',
          6: 'bg-rose-100 text-rose-600',
        };
        const roleColor = roleColorMap[roleId] || 'bg-gray-100 text-gray-700';
        return <Badge className={roleColor}>{roleName}</Badge>;
      },
    },
    { id: 'team', header: 'Nhóm', cell: ({ row }) => row.original.team?.teamName },
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
      cell: ({ row }) => (
        <div className="flex gap-3">
          {row.original.user?.isActive ? (
            <button type="button" onClick={() => handleBan(row.original)} title="Vô hiệu hóa">
              <PowerOff size={16} className="text-red-500 cursor-pointer" />
            </button>
          ) : (
            <button type="button" onClick={() => handleBan(row.original)} title="Kích hoạt">
              <Power size={16} className="text-green-600 cursor-pointer" />
            </button>
          )}
          <button type="button" onClick={() => handleViewMember(row.original.memberId)} title="Xem chi tiết">
            <Eye size={16} className="text-gray-800 cursor-pointer" />
          </button>
          <button type="button" onClick={() => setEditMemberId(row.original.memberId)} title="Chỉnh sửa">
            <Pencil size={16} className="text-blue-600 cursor-pointer" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">Quản lý thành viên</h2>
          <p className="text-xs text-gray-500">Quản lý thông tin cá nhân thành viên trong hệ thống</p>
        </div>
        <Button
          onClick={() => setOpenCreate(true)}
          className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md"
        >
          <Plus size={16} />
          Thêm thành viên
        </Button>
      </div>

      <div className="flex justify-end gap-3 mb-2">
        <HoverSearch placeholder="Tìm theo tên..." value={filterFullName} onChange={setFilterFullName} />
        <div className="flex items-center gap-3">
          <Select value={filterTeamId || 'all'} onValueChange={setFilterTeamId}>
            <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[160px]">
              <SelectValue placeholder="Nhóm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả nhóm</SelectItem>
              {teams.map((t) => (
                <SelectItem key={t.teamId} value={String(t.teamId)}>
                  {t.teamName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="secondary" className="bg-white" onClick={resetFilters} title="Đặt lại bộ lọc">
            <RotateCcw />
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm px-6 py-4">
        <DataTable
          columns={columns}
          data={members}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(page) => setPageNumber(page)}
        />

        <MemberDetailSidebar open={openDetail} onClose={() => setOpenDetail(false)} member={selectedMember} />

        <CreateMemberModal open={openCreate} onClose={() => setOpenCreate(false)} onCreated={refetchMembers} />

        <MemberEditModal
          open={editMemberId !== null}
          onClose={() => setEditMemberId(null)}
          memberId={editMemberId}
          onUpdated={() => {
            refetchMembers();
            setEditMemberId(null);
          }}
        />
      </div>
    </div>
  );
}
