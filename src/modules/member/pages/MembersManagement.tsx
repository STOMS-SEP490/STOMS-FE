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
import { useRef, useState, useEffect } from 'react';
import { message, Modal } from 'antd';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import MemberDetailSidebar from './MemberDetailSidebar';
import CreateMemberModal from './CreateMemberModal';
import MemberEditModal from './MemberEditModal';
import { getRoleLabel, getRoleBadgeClass } from '@/constants/role';
import { useSearchParams } from 'react-router-dom';

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
    filterRole,
    setFilterRole,
    resetFilters,
  } = useMembers();

  const [searchParams, setSearchParams] = useSearchParams();
  const openDetailFromUrl = searchParams.get('openDetail');
  const memberIdFromUrl = searchParams.get('memberId');

  const skipNextAutoOpenRef = useRef(false);

  const closeDetailFromUrl = () => {
    skipNextAutoOpenRef.current = true;
    setOpenDetail(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openDetail');
      next.delete('memberId');
      return next;
    });
  };

  useEffect(() => {
    if (openDetailFromUrl !== '1') return;
    if (!memberIdFromUrl) return;

    if (skipNextAutoOpenRef.current) {
      skipNextAutoOpenRef.current = false;
      return;
    }

    const memberId = Number(memberIdFromUrl);
    if (!memberId || Number.isNaN(memberId)) return;
    if (openDetail && selectedMember?.memberId === memberId) return;

    handleViewMember(memberId);
  }, [openDetailFromUrl, memberIdFromUrl, openDetail, selectedMember?.memberId, handleViewMember]);

  const [openCreate, setOpenCreate] = useState(false);
  const [editMemberId, setEditMemberId] = useState<number | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    teamApi.getTeams({ pageSize: 500 }).then((res) => setTeams(res.items ?? [])).catch(() => {});
  }, []);

  const handleBan = (member: Member) => {
    const isActive = member.isActive ?? true;
    Modal.confirm({
      title: isActive ? 'Vô hiệu hóa tài khoản?' : 'Kích hoạt lại tài khoản?',
      content: isActive
        ? `Thành viên ${member.fullName} sẽ không thể đăng nhập. Bạn có chắc?`
        : `Kích hoạt lại tài khoản của ${member.fullName}?`,
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          const userId = member.userId;
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
            <p className="text-xs text-gray-500">{row.original.email ?? '—'}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'role',
      header: 'Vai trò',
      cell: ({ row }) => {
        const rawRoleId = row.original.roleId;
        const roleId = rawRoleId == null ? null : Number(rawRoleId);
        if (roleId == null || !Number.isFinite(roleId) || roleId <= 0) {
          return <Badge className="bg-slate-100 text-slate-600 border border-slate-200">Chưa có vai trò</Badge>;
        }
        return <Badge className={`${getRoleBadgeClass(roleId)} border`}>{getRoleLabel(roleId)}</Badge>;
      },
    },
    { id: 'team', header: 'Nhóm', cell: ({ row }) => row.original.team?.teamName },
    {
      accessorKey: 'createdAt',
      header: 'Ngày tạo',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString('vi-VN'),
    },
    {
      id: 'actions',
      header: 'Thao tác',
      enableSorting: false,
      cell: ({ row }) => {
        const m = row.original;
        return (
          <div className="flex gap-3">
            <span title="Xem chi tiết">
              <Eye
                size={16}
                className="cursor-pointer text-gray-800"
                onClick={() => void handleViewMember(m.memberId)}
              />
            </span>
            <span title="Chỉnh sửa">
              <Pencil
                size={16}
                className="cursor-pointer text-blue-600"
                onClick={() => setEditMemberId(m.memberId)}
              />
            </span>
            {m.isActive ? (
              <span title="Vô hiệu hóa">
                <PowerOff
                  size={16}
                  className="cursor-pointer text-red-500"
                  onClick={() => handleBan(m)}
                />
              </span>
            ) : (
              <span title="Kích hoạt">
                <Power
                  size={16}
                  className="cursor-pointer text-green-600"
                  onClick={() => handleBan(m)}
                />
              </span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 pl-8 space-y-6">
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
          <Select value={filterRole} onValueChange={(v) => setFilterRole(v as 'all' | 'teacher' | 'student')}>
            <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[220px]">
              <SelectValue placeholder="Vai trò" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="teacher">Giảng viên</SelectItem>
              <SelectItem value="student">Sinh viên</SelectItem>
            </SelectContent>
          </Select>
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

        <MemberDetailSidebar open={openDetail} onClose={closeDetailFromUrl} member={selectedMember} />

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
