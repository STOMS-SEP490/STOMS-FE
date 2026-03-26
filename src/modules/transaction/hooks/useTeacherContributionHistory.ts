import { useCallback, useEffect, useMemo, useState } from 'react';
import { contributionApi, type ContributionListItem } from '../api/contributionApi';
import { walletApi, type WalletListItem } from '../api/walletApi';

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
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [contributeOpen, setContributeOpen] = useState(false);

  const user = useMemo(() => getLocalUser(), []);
  const canViewWalletList = WALLET_VISIBLE_ROLE_IDS.has(user.roleId);

  const fetchContributions = useCallback(async () => {
    if (!user.memberId) return;
    try {
      setLoading(true);
      const res = await contributionApi.getContributions({
        memberId: user.memberId,
        pageNumber,
        pageSize,
      });
      setItems(res.items ?? []);
      setTotalItems(res.totalItems ?? 0);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('fetch teacher contributions error:', err);
    } finally {
      setLoading(false);
    }
  }, [pageNumber, pageSize, user.memberId]);

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
    () =>
      items.reduce(
        (sum, item) => sum + (typeof item.amount === 'number' ? item.amount : 0),
        0,
      ),
    [items],
  );

  const onSearchChange = useCallback((value: string) => {
    setPageNumber(1);
    setSearch(value);
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
    filteredItems,
    totalAmount,
    canViewWalletList,
    setPageNumber,
    setContributeOpen,
    onSearchChange,
    onContributionSubmitted,
  };
}
