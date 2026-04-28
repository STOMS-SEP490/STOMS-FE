import { useEffect, useState } from 'react';
import { message } from 'antd';
import { walletApi, type WalletListItem } from '@/modules/transaction/api/walletApi';

export function useWalletSelection(isManager: boolean) {
  const [wallets, setWallets] = useState<WalletListItem[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null);
  const [walletsLoading, setWalletsLoading] = useState(false);

  useEffect(() => {
    if (!isManager) return;
    let cancelled = false;
    
    const loadWallets = async () => {
      setWalletsLoading(true);
      try {
        const res = await walletApi.getWallets({ pageNumber: 1, pageSize: 50 });
        if (cancelled) return;
        setWallets(res.items ?? []);
        if (res.items && res.items.length > 0) {
          setSelectedWalletId(res.items[0].walletId);
        }
      } catch {
        if (cancelled) return;
        message.error('Không tải được danh sách ví.');
      } finally {
        if (cancelled) return;
        setWalletsLoading(false);
      }
    };
    
    void loadWallets();
    return () => { cancelled = true; };
  }, [isManager]);

  return {
    wallets,
    selectedWalletId,
    setSelectedWalletId,
    walletsLoading,
  };
}
