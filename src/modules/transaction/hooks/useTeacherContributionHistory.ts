import { useCallback, useEffect, useMemo, useState } from 'react';
import { contributionApi, type ContributionListItem } from '../api/contributionApi';
import { walletApi, type WalletListItem } from '../api/walletApi';
import transactionApi from '../api/transactionApi';
import { MANAGER_ROLE_ID } from '@/constants/role';

const WALLET_VISIBLE_ROLE_IDS = new Set([2, 3, 4, 5]);

type LocalUser = {
  memberId: number;
  roleId: number;
};

function getLocalUser(): LocalUser {
  try {
    const raw = JSON.parse(localStorage.getItem('user') || '{}') as {
      memberId?: number;
      roleId?: number;
    };
    return {
      memberId: Number(raw.memberId || 0) || 0,
      roleId: Number(raw.roleId || 0) || 0,
    };
  } catch {
    return { memberId: 0, roleId: 0 };
  }
}

export function useTeacherContributionHistory() {
  const [items, setItems] = useState<ContributionListItem[]>([]);
  const [wallets, setWallets] = useState<WalletListItem[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [contributeOpen, setContributeOpen] = useState(false);

  const user = useMemo(() => getLocalUser(), []);
  const canViewWalletList = WALLET_VISIBLE_ROLE_IDS.has(user.roleId);
  const isManager = user.roleId === MANAGER_ROLE_ID;

  const fetchContributions = useCallback(async () => {
    if (!user.memberId) return;
    try {
      setLoading(true);
      if (selectedWalletId && canViewWalletList) {
        const res = await transactionApi.getTransactions({
          walletId: selectedWalletId,
          pageNumber,
          pageSize,
        });
        const mapped: ContributionListItem[] = (res.items ?? []).map((tx) => ({
          contributionId: tx.transactionId,
          memberId: Number(tx.createdBy ?? 0),
          memberName: tx.createdByName ?? null,
          memberEmail: tx.createdByEmail ?? null,
          memberAvatar: tx.createdByAvatar ?? null,
          transactionId: tx.transactionId,
          transactionType: tx.transactionType,
          amount: tx.amount ?? 0,
          description: tx.description ?? '',
          paymentImg: '',
          createdAt: tx.transactionDate ?? tx.createdAt ?? null,
        }));
        setItems(mapped);
        setTotalItems(res.totalItems ?? 0);
      } else {
        const res = await contributionApi.getContributions({
          memberId: user.memberId,
          pageNumber,
          pageSize,
        });
        setItems(res.items ?? []);
        setTotalItems(res.totalItems ?? 0);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('fetch teacher contributions error:', err);
    } finally {
      setLoading(false);
    }
  }, [canViewWalletList, pageNumber, pageSize, selectedWalletId, user.memberId]);

  const fetchWallets = useCallback(async () => {
    if (!canViewWalletList) return;
    try {
      setWalletLoading(true);
      const res = await walletApi.getWallets({ pageNumber: 1, pageSize: 50 });
      setWallets(res.items ?? []);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('fetch wallets error:', err);
    } finally {
      setWalletLoading(false);
    }
  }, [canViewWalletList]);

  useEffect(() => {
    void fetchContributions();
  }, [fetchContributions]);

  useEffect(() => {
    void fetchWallets();
  }, [fetchWallets]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (item) =>
        String(item.description || '').toLowerCase().includes(query) ||
        String(item.contributionId || '').includes(query),
    );
  }, [items, search]);

  const totalAmount = useMemo(
    () => {
      // Chỉ tính tổng khi xem "Tất cả khoản của tôi" (selectedWalletId == null)
      if (selectedWalletId != null) return 0;
      return items.reduce(
        (sum, item) => sum + (typeof item.amount === 'number' ? item.amount : 0),
        0,
      );
    },
    [items, selectedWalletId],
  );

  const onSearchChange = useCallback((value: string) => {
    setPageNumber(1);
    setSearch(value);
  }, []);

  const onSelectWallet = useCallback((walletId: number | null) => {
    setPageNumber(1);
    setSelectedWalletId(walletId);
  }, []);

  const onContributionSubmitted = useCallback(() => {
    setPageNumber(1);
    void fetchContributions();
  }, [fetchContributions]);

  return {
    loading,
    walletLoading,
    pageNumber,
    pageSize,
    totalItems,
    search,
    contributeOpen,
    wallets,
    selectedWalletId,
    filteredItems,
    totalAmount,
    canViewWalletList,
    isManager,
    setPageNumber,
    setContributeOpen,
    onSearchChange,
    onSelectWallet,
    onContributionSubmitted,
  };
}
