/**
 * Types for task report form and expense management
 */

export type ReportFormState = {
  title: string;
  description: string;
  startAt: string;
  endAt: string;
};

export type CreateExpenseRow = {
  key: string;
  amount: string;
  description: string;
  file: File | null;
  preview: string;
};

export type TaskItem = {
  TaskId?: number;
  Title?: string | null;
  Description?: string | null;
  Status?: string | null;
};
