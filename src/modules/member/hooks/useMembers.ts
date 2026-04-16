import { useEffect, useState } from 'react';
import { message } from 'antd';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import memberApi from '../api/memberApi';
import type { Member, MemberDetail } from '../member';
import { ROLE_ID } from '@/constants/role';

type MemberRoleFilter = 'all' | 'teacher' | 'student';

export const useMembers = (options?: { filterFullName?: string; filterTeamId?: number | string }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberDetail | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [filterFullName, setFilterFullName] = useState(options?.filterFullName ?? '');
  const [filterTeamId, setFilterTeamId] = useState<string>(
    options?.filterTeamId !== undefined ? String(options.filterTeamId) : ''
  );
  const [filterRole, setFilterRole] = useState<MemberRoleFilter>('all');

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const baseParams: Parameters<typeof memberApi.getMembers>[0] = { pageNumber, pageSize };
      if (filterFullName.trim()) baseParams.FullName = filterFullName.trim();
      const tid = filterTeamId === '' || filterTeamId === 'all' ? undefined : Number(filterTeamId);
      if (tid !== undefined && !Number.isNaN(tid)) baseParams.TeamId = tid;

      const roleId =
        filterRole === 'teacher'
          ? ROLE_ID.TEACHER
          : filterRole === 'student'
            ? ROLE_ID.ASSISTANT
            : undefined;

      const res = await memberApi.getMembers({ ...baseParams, RoleId: roleId });
      setMembers(res.items ?? []);
      setTotalItems(res.totalItems ?? 0);
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleViewMember = async (memberId: number) => {
    try {
      const res = await memberApi.getMemberById(memberId);
      setSelectedMember(res);
      setOpenDetail(true);
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [pageNumber, filterFullName, filterTeamId, filterRole]);

  const resetFilters = () => {
    setFilterFullName('');
    setFilterTeamId('all');
    setFilterRole('all');
    setPageNumber(1);
  };

  return {
    members,
    loading,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
    refetch: fetchMembers,
    selectedMember,
    openDetail,
    setOpenDetail,
    handleViewMember,
    filterFullName,
    setFilterFullName,
    filterTeamId,
    setFilterTeamId,
    filterRole,
    setFilterRole,
    resetFilters,
  };
};
