export type TaskReportInfo = {
  taskReportId: number;
  title: string;
  description: string;
  startAt: string | null;
  endAt: string | null;
  sessionId: number | null;
  sessionNo: number | null;
  requestCode: string | null;
};

export type ExpenseInfo = {
  expenseId: number;
  taskReportId: number | null;
  taskReport: TaskReportInfo | null;
  paymentImg: string;
  approvedByMemberId: number | null;
  approvedByMemberFullName: string | null;
  approvedAt: string | null;
  createdAt: string | null;
};

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
  createdByEmail: string | null;
  createdByAvatar: string | null;
  createdAt: string | null;
  expenses?: ExpenseInfo[];
};

export type TransactionFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  transactionId?: number;
  walletId?: number;
  transactionType?: number;
  createdBy?: number;
};

