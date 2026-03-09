import { useEffect, useState } from 'react';
import { message } from 'antd';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import memberApi from '../api/memberApi';
import type { Member, MemberDetail } from '../member';

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

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const params: Parameters<typeof memberApi.getMembers>[0] = { pageNumber, pageSize };
      if (filterFullName.trim()) params.FullName = filterFullName.trim();
      const tid = filterTeamId === '' || filterTeamId === 'all' ? undefined : Number(filterTeamId);
      if (tid !== undefined && !Number.isNaN(tid)) params.TeamId = tid;
      const res = await memberApi.getMembers(params);

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
  }, [pageNumber, filterFullName, filterTeamId]);

  const resetFilters = () => {
    setFilterFullName('');
    setFilterTeamId('all');
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
    resetFilters,
  };
};
