import { X } from 'lucide-react';
import type { EventListItem, EventSession } from '../event';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  event: EventListItem | null;
};

function formatDateTime(date?: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleString('vi-VN');
}

export default function EventDetailSidebar({ open, onClose, event }: Props) {
  if (!event) return null;

  const eventSessions = (event.eventSessions as EventSession[] | null) ?? [];

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/35 z-40 h-full"
          onClick={onClose}
          aria-hidden
        />
      )}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-[560px] z-50',
          'bg-white border-l shadow-2xl',
          'transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          {/* HEADER */}
          <div className="sticky top-0 z-10 bg-white border-b px-5 pt-5 pb-3 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-black truncate">
                  {event.eventName}
                </h2>
                <Badge
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium',
                    event.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                  )}
                >
                  {event.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}
                </Badge>
              </div>
              <p className="text-xs text-gray-500">
                Mã sự kiện: <span className="font-medium">{event.eventCode}</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Thời lượng: {event.duration || '—'} · Số buổi: {event.numberOfSession ?? '—'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>

          {/* CONTENT */}
          <div className="px-5 py-4 space-y-4 bg-[#f7f7f8]">
            <Card title="Thông tin chung">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow label="Ngày tạo" value={formatDateTime(event.createdAt)} />
                <InfoRow label="Cập nhật" value={formatDateTime(event.updatedAt)} />
              </div>
            </Card>

            <Card title="Mô tả">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {event.description || '—'}
              </p>
            </Card>

            <Card title="Các buổi trong sự kiện">
              {eventSessions.length > 0 ? (
                <ul className="space-y-3 text-sm">
                  {eventSessions.map((es, index) => (
                    <li
                      key={es.eventSessionId ?? index}
                      className="rounded-xl border bg-white overflow-hidden"
                    >
                      <div className="px-3 py-2 border-b bg-gray-50/80 flex items-center justify-between gap-2">
                        <span className="font-medium text-gray-900 truncate">
                          {es.title || `Buổi ${es.sessionNo ?? index + 1}`}
                        </span>
                        <span className="text-xs text-gray-500 shrink-0">
                          {es.sessionNo != null && `#${es.sessionNo}`}
                          {es.duration ? ` · ${es.duration}` : ''}
                        </span>
                      </div>
                      {es.sessions && es.sessions.length > 0 ? (
                        <ul className="divide-y divide-gray-100">
                          {es.sessions.map((slot, i) => (
                            <li
                              key={slot.sessionId ?? i}
                              className="px-3 py-2 flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0 text-xs text-gray-600">
                                {slot.startAt ? formatDateTime(slot.startAt) : '—'}
                                {slot.endAt && ` → ${formatDateTime(slot.endAt)}`}
                              </div>
                              {slot.location && (
                                <span className="text-xs text-gray-500 whitespace-nowrap truncate max-w-[180px]">
                                  {slot.location}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="px-3 py-2 text-xs text-gray-500">
                          Chưa có lịch cụ thể
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState text="Chưa có buổi nào trong sự kiện này." />
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm">
      <div className="px-4 py-2.5 border-b">
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
      <div className="mt-0.5 text-sm text-gray-900 break-words">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border bg-gray-50 px-3 py-3 text-sm text-gray-600">
      {text}
    </div>
  );
}

