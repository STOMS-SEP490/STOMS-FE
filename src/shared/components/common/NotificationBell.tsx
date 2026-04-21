import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { HubConnectionBuilder } from '@microsoft/signalr';
import { Badge, Empty, Popover, Spin, Typography } from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

import { getNotificationHubUrl } from '@/shared/lib/hubUrl';
import { cn } from '@/shared/lib/utils';
import * as notificationApi from '@/modules/notification/api/notificationApi';
import type { NotificationItem } from '@/modules/notification/api/notificationApi';
import { showSignalRToast } from '@/modules/notification/ui/signalrToast';
import {
  getNotificationVisual,
} from '@/modules/notification/notificationTypeTheme';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const POLL_UNREAD_MS = 60_000; // Giảm từ 25s xuống 60s để giảm tải

type NotificationBellProps = {
  /** Sidebar thu gọn: popover mở xuống giữa, tránh tràn khi cột hẹp */
  variant?: 'default' | 'sidebarCollapsed';
};

function coerceIsoDate(v: unknown): string | null | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return new Date(v).toISOString();
  if (typeof v === 'object' && v !== null && 'toString' in v) {
    const s = String(v);
    if (s && s !== '[object Object]') return s;
  }
  return undefined;
}

function normalizePayload(raw: unknown): NotificationItem | null {
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
    createdAt: coerceIsoDate(o.createdAt ?? o.CreatedAt) ?? null,
    readAt: coerceIsoDate(o.readAt ?? o.ReadAt) ?? null,
  };
}

export default function NotificationBell({ variant = 'default' }: NotificationBellProps) {
  const isCollapsedBar = variant === 'sidebarCollapsed';
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const loadIdRef = useRef(0);

  /** Số badge luôn lấy từ API — tránh lệch khi chỉ cộng tay */
  const refreshUnreadOnly = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    try {
      const n = await notificationApi.fetchUnreadCount();
      setUnreadTotal(n);
    } catch {
      // ignore
    }
  }, []);

  const load = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const id = ++loadIdRef.current;
    setLoading(true);
    try {
      const listRes = await notificationApi.fetchNotifications({ pageNumber: 1, pageSize: 20 });
      if (id !== loadIdRef.current) return;
      setItems(listRes.items ?? []);
      await refreshUnreadOnly();
    } catch {
      // ignore
    } finally {
      if (id === loadIdRef.current) setLoading(false);
    }
  }, [refreshUnreadOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  /** Polling + focus tab: badge cập nhật kể cả khi SignalR lỗi / miss event */
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      void refreshUnreadOnly();
    };

    const id = window.setInterval(tick, POLL_UNREAD_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') void refreshUnreadOnly();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [refreshUnreadOnly]);

  /** SignalR: mỗi sự kiện đều refresh số chưa đọc từ server để badge khớp DB */
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const hubUrl = getNotificationHubUrl();
    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => localStorage.getItem('accessToken') || '',
        withCredentials: false,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .build();

    const onReceive = (payload: unknown) => {
      const n = normalizePayload(payload);
      if (n) {
        setItems((prev) => {
          if (prev.some((x) => x.notificationId === n.notificationId)) return prev;
          return [n, ...prev].slice(0, 50);
        });

        // Show toast only when tab is visible (avoid stacking when user is away).
        if (document.visibilityState === 'visible') {
          showSignalRToast(n);
        }
      }
      void refreshUnreadOnly();
    };

    connection.on('ReceiveNotification', onReceive);

    connection.onreconnected(() => {
      void refreshUnreadOnly();
    });

    connection.start().catch(() => {
      /* negotiate lỗi — badge vẫn cập nhật nhờ polling */
    });

    return () => {
      connection.off('ReceiveNotification');
      void connection.stop();
    };
  }, [refreshUnreadOnly]);

  const handleMarkRead = async (n: NotificationItem) => {
    if (n.readAt) return;
    try {
      const updated = await notificationApi.markNotificationRead(n.notificationId);
      setItems((prev) =>
        prev.map((x) => (x.notificationId === n.notificationId ? { ...x, ...updated } : x))
      );
      await refreshUnreadOnly();
    } catch {
      // ignore
    }
  };

  const toggleExpand = (notificationId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(notificationId)) {
        next.delete(notificationId);
      } else {
        next.add(notificationId);
      }
      return next;
    });
  };

  const handleMarkAllRead = async () => {
    const unreadItems = items.filter((x) => !x.readAt);
    if (unreadItems.length === 0 || markingAll) return;

    setMarkingAll(true);
    try {
      await notificationApi.markAllNotificationsRead();
      const now = new Date().toISOString();
      setItems((prev) =>
        prev.map((x) => (x.readAt ? x : { ...x, readAt: now }))
      );
      await refreshUnreadOnly();
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  };

  const content = (
    <div className="w-[min(92vw,19rem)] max-h-[min(70vh,22rem)] overflow-y-auto rounded-xl bg-white px-1.5 py-1">
      {loading ? (
        <div className="flex justify-center py-6">
          <Spin />
        </div>
      ) : items.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thông báo" />
      ) : (
        <ul className="relative divide-y divide-slate-200/80">
          <span className="pointer-events-none absolute bottom-2 left-[1rem] top-2 w-px bg-slate-200/90" />
          {items.map((n) => {
            const vis = getNotificationVisual(n.type);
            const Icon = vis.Icon;
            const unread = !n.readAt;
            const isExpanded = expandedIds.has(n.notificationId);
            return (
              <li key={n.notificationId} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    toggleExpand(n.notificationId);
                    void handleMarkRead(n);
                  }}
                  className={cn(
                    'w-full text-left px-1 py-2 transition',
                    unread ? 'bg-white hover:bg-slate-50/80' : 'bg-white/90 hover:bg-slate-50/70'
                  )}
                >
                  <div className="grid grid-cols-[30px_1fr] items-start gap-2">
                    <div
                      className={cn(
                        'relative z-[1] mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-slate-200',
                        vis.iconWrapClass
                      )}
                    >
                      <Icon className="h-3 w-3" strokeWidth={2} aria-hidden />
                    </div>
                    <div className="min-w-0 pr-1">
                      <Typography.Text
                        strong
                        className="!block !text-[11px] !leading-4 !text-slate-800 line-clamp-1"
                      >
                        {n.title}
                      </Typography.Text>
                      <Typography.Paragraph
                        type="secondary"
                        className={cn(
                          '!mb-0 !mt-0.5 !text-[10px] !leading-4 !text-slate-500',
                          isExpanded ? '' : 'line-clamp-1'
                        )}
                      >
                        {n.message}
                      </Typography.Paragraph>
                      <div className="mt-0.5 flex items-center gap-1">
                        {unread && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" title="Chưa đọc" />
                        )}
                        <span className="text-[9px] font-medium text-slate-400">
                        {n.createdAt ? dayjs(n.createdAt).fromNow() : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      placement={isCollapsedBar ? 'bottom' : 'bottomRight'}
      align={isCollapsedBar ? { offset: [0, 6] } : undefined}
      trigger="click"
      title={
        <div className="flex items-center justify-between gap-2 pr-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-800">Thông báo</span>
            {items.length > 0 && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-medium text-slate-500">
                {items.length} gần đây
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            disabled={markingAll || unreadTotal === 0}
            className={cn(
              'text-[9px] font-medium transition',
              markingAll || unreadTotal === 0
                ? 'cursor-not-allowed text-slate-300'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            Đánh dấu tất cả đã đọc
          </button>
        </div>
      }
      content={content}
    >
      <button
        type="button"
        className={`relative inline-flex shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-200/80 transition ${
          isCollapsedBar ? 'h-8 w-8' : 'h-9 w-9'
        }`}
        aria-label="Thông báo"
      >
        <Badge count={unreadTotal > 99 ? '99+' : unreadTotal} size="small" offset={[-2, 2]}>
          <Bell size={isCollapsedBar ? 18 : 20} strokeWidth={2} />
        </Badge>
      </button>
    </Popover>
  );
}
