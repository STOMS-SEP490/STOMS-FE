/** Bộ lọc trạng thái yêu cầu (manager / PC layout). */
export type ManagerRequestStatusFilter =
  | 'all'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'assigning'
  | 'published'
  | 'completed'
  | 'cancelled';

export const STATUS_FILTER_TO_REQUEST_CODE: Record<Exclude<ManagerRequestStatusFilter, 'all'>, number> = {
  pending: 1,
  approved: 3,
  rejected: 2,
  assigning: 4,
  published: 5,
  completed: 6,
  cancelled: 7,
};

export const STATUS_FILTER_TO_API: Record<Exclude<ManagerRequestStatusFilter, 'all'>, string> = {
  pending: 'PENDING',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  assigning: 'ASSIGNING',
  published: 'PUBLISHED',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
};
