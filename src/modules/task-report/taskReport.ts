/* ─── Response types (khớp BE TaskReportResponse / ExpenseResponse) ─── */

export type TaskReportExpense = {
  expenseId: number;
  taskReportId: number | null;
  transactionId: number | null;
  amount: number | null;
  description: string | null;
  paymentImg: string | null;
  approvedByMemberId: number | null;
  approvedAt: string | null;
  rejectReason: string | null;
  status: number;
  createdAt: string | null;
};

export type TaskReport = {
  taskReportId: number;
  memberId: number | null;
  requestId: number;
  sessionId: number | null;
  title: string;
  description: string;
  startAt: string | null;
  endAt: string | null;
  createdAt: string | null;
  member: { memberId: number; fullName: string } | null;
  expenses: TaskReportExpense[] | null;
};

/* ─── Filter params (khớp BE TaskReportFilterRequest) ─── */

export type TaskReportFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  taskReportId?: number;
  userId?: number;
  requestId?: number;
  sessionId?: number;
  title?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  createdAt?: string;
};

/* ─── Create payload (multipart/form-data → TaskReportSubmitRequest) ─── */

export type TaskReportExpenseInput = {
  amount: number;
  description: string;
  paymentImgIndex?: number;
};

export type TaskReportCreatePayload = {
  requestId?: number | null;
  sessionId?: number | null;
  title: string;
  description: string;
  startAt?: string | null;
  endAt?: string | null;
  expenses?: TaskReportExpenseInput[];
  paymentImages?: File[];
};

/* ─── Update payload (JSON → TaskReportUpdateRequest) ─── */

export type TaskReportUpdatePayload = {
  requestId?: number | null;
  sessionId?: number | null;
  title: string;
  description: string;
  startAt?: string | null;
  endAt?: string | null;
};

/* ─── Expense create payload (multipart/form-data → ExpenseCreateRequest) ─── */

export type ExpenseCreatePayload = {
  taskReportId: number;
  amount: number;
  description: string;
  paymentImg?: File | null;
};

/* ─── Expense filter params (khớp BE ExpenseFilterRequest) ─── */

export type ExpenseFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  expenseId?: number;
  taskReportId?: number;
  transactionId?: number;
  amount?: number;
  description?: string;
  approvedByMemberId?: number;
  status?: number;
};
