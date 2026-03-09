import { useEffect, useState } from 'react';
import userService from '../api/userApi';
import type { Member, MemberDetail } from '../user';

export const useMembers = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberDetail | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await userService.getMembers({
        pageNumber,
        pageSize,
      });

      setMembers(res.items ?? []);
      setTotalItems(res.totalItems ?? 0);
    } catch (err) {
      console.error('fetch members error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewMember = async (memberId: number) => {
    try {
      const res = await userService.getMemberById(memberId);
      setSelectedMember(res);
      setOpenDetail(true);
    } catch (err) {
      console.error('fetch member detail error:', err);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [pageNumber]);

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
  };
};

