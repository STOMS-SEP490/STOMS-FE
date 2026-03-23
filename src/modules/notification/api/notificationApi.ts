import axiosClient from '@/shared/lib/axios';

export interface NotificationItem {
  notificationId: number;
  memberId: number;
  type: string;
  title: string;
  message: string;
  createdAt?: string | null;
  readAt?: string | null;
}

export interface PagedNotifications {
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  items: NotificationItem[];
}

/** axiosClient đã unwrap response.data trong interceptor — kết quả get/put chính là body API */
function normalizeNotificationRow(raw: unknown): NotificationItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const notificationId = Number(o.notificationId ?? o.NotificationId);
  const memberId = Number(o.memberId ?? o.MemberId);
  if (!Number.isFinite(notificationId) || !Number.isFinite(memberId)) return null;
  return {
    notificationId,
    memberId,
    type: String(o.type ?? o.Type ?? ''),
    title: String(o.title ?? o.Title ?? ''),
    message: String(o.message ?? o.Message ?? ''),
    createdAt: (o.createdAt ?? o.CreatedAt) as string | null | undefined,
    readAt: (o.readAt ?? o.ReadAt) as string | null | undefined,
  };
}

function normalizePaged(raw: unknown): PagedNotifications {
  if (!raw || typeof raw !== 'object') {
    return { pageNumber: 1, pageSize: 0, totalItems: 0, totalPages: 0, items: [] };
  }
  const r = raw as Record<string, unknown>;
  const rawItems = r.items ?? r.Items;
  const list = Array.isArray(rawItems) ? rawItems : [];
  const items = list.map(normalizeNotificationRow).filter((x): x is NotificationItem => x !== null);
  return {
    pageNumber: Number(r.pageNumber ?? r.PageNumber ?? 1),
    pageSize: Number(r.pageSize ?? r.PageSize ?? 0),
    totalItems: Number(r.totalItems ?? r.TotalItems ?? 0),
    totalPages: Number(r.totalPages ?? r.TotalPages ?? 0),
    items,
  };
}

export async function fetchNotifications(params: {
  pageNumber?: number;
  pageSize?: number;
  isRead?: boolean | null;
}) {
  const body = await axiosClient.get<unknown>('/notifications/filter', {
    params: {
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 20,
      ...(params.isRead !== undefined && params.isRead !== null
        ? { isRead: params.isRead }
        : {}),
    },
  });
  return normalizePaged(body);
}

/** Chỉ lấy tổng chưa đọc — gọi nhẹ cho badge / polling */
export async function fetchUnreadCount(): Promise<number> {
  const paged = await fetchNotifications({ pageNumber: 1, pageSize: 1, isRead: false });
  return paged.totalItems ?? 0;
}

export async function markNotificationRead(id: number) {
  const body = await axiosClient.put<unknown>(`/notifications/${id}/read`);
  const n = normalizeNotificationRow(body);
  if (!n) throw new Error('Phản hồi đánh dấu đọc không hợp lệ');
  return n;
}
