export type TaskReportExpense = {
  expenseId: number;
  amount?: number | null;
  description?: string | null;
};

export type ExpenseItem = {
  expenseId: number;
  amount: number | null;
  description: string;
  name: string;
};

export type TaskReport = {
  taskReportId: number;
  userId: number | null;
  requestId: number;
  sessionId: number | null;
  title: string;
  description: string;
  startAt: string | null;
  endAt: string | null;
  createdAt: string | null;
  memberName?: string | null;
  expenses?: ExpenseItem[] | null;
};

export type TaskReportFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  userId?: number;
  requestId?: number;
  sessionId?: number;
};

/** Khoản chi phí gửi khi tạo/sửa báo cáo (ExpensesJson). paymentImgIndex: index 0-based trong PaymentImgs. */
export type TaskReportExpenseItem = {
  amount: number;
  description: string;
  expenseId?: number;
  paymentImgIndex?: number;
};

/** Body POST task-reports (multipart/form-data). */
export type TaskReportCreatePayload = {
  requestId?: number | null;
  sessionId?: number | null;
  title: string;
  description: string;
  startAt?: string | null;
  endAt?: string | null;
  expenses?: TaskReportExpenseItem[];
  paymentImages?: File[];
};

export type TaskReportUpdatePayload = {
  requestId?: number;
  sessionId?: number | null;
  title: string;
  description: string;
  startAt?: string | null;
  endAt?: string | null;
  expenses?: TaskReportExpenseItem[];
  paymentImages?: File[];
};
