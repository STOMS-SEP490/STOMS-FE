export type TransactionListItem = {
  transactionId: number;
  walletId: number;
  walletName: string;
  amount: number;
  transactionType: number;
  description: string;
  transactionDate: string | null;
  createdBy: number | null;
  createdByName: string | null;
  createdAt: string | null;
};

export type TransactionFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  transactionId?: number;
  walletId?: number;
  transactionType?: number;
  createdBy?: number;
};

