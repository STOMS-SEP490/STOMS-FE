import { notification } from 'antd';
import type { NotificationItem } from '@/modules/notification/api/notificationApi';
import { getNotificationVisual } from '@/modules/notification/notificationTypeTheme';

/**
 * Toast notification when receiving SignalR events.
 * - Placement: top-right (slightly below top edge)
 * - Duration: 4 seconds
 * - Antd already animates + fades out on close.
 */
export function showSignalRToast(n: NotificationItem) {
  const vis = getNotificationVisual(n.type);

  notification.open({
    key: `signalr-noti-${n.notificationId}`,
    placement: 'bottomRight',
    duration: 4,
    message: (
      <div className="flex items-start gap-3 max-w-[22rem] p-4">
        <div className={`${vis.iconWrapClass} rounded-xl p-2.5 flex-shrink-0`}>
          <vis.Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          {vis.label ? (
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-600/90 mb-1">
              {vis.label}
            </div>
          ) : null}

          <div className="text-sm font-semibold text-slate-900 leading-5 break-words">{n.title}</div>

          <div className="text-xs text-slate-600 leading-4 mt-1 break-words whitespace-pre-wrap">
            {n.message}
          </div>
        </div>
      </div>
    ),
    // Tắt hẳn vùng description để tránh tạo "khung xám" rỗng phía dưới.
    description: <div style={{ display: 'none' }} />,
    style: {
      marginBottom: 6,
      borderRadius: 16,
      padding: 0,
      boxShadow: '0 10px 30px rgba(21, 43, 94, 0.12)',
    },
  });
}

