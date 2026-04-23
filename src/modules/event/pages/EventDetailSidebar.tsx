import type { LucideIcon } from 'lucide-react';
import { X, Clock, FileText, Layers, Sparkles, Tags } from 'lucide-react';
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
  if (!open || !event) return null;

  const eventSessions = (event.eventSessions as EventSession[] | null) ?? [];

  return (
    <>
      <div className="fixed inset-0 z-40 h-full bg-black/35" onClick={onClose} aria-hidden />

      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-[720px] max-w-[96vw]',
          'border-l border-slate-200 bg-white shadow-2xl',
          'translate-x-0 transition-transform duration-300 ease-out',
        )}
      >
        <div className="flex h-full w-full min-w-0 flex-col overflow-hidden">
          {/* ── HEADER ── */}
          <header className="w-full shrink-0 border-b border-slate-200 bg-white">
            <div className="flex w-full items-start justify-between gap-3 px-5 pb-3 pt-4">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-base font-semibold text-black">
                    {event.eventName}
                  </h2>
                  <Badge
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
                      event.isActive
                        ? 'border-0 bg-emerald-100 text-emerald-800'
                        : 'border-0 bg-slate-200 text-slate-700',
                    )}
                  >
                    {event.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}
                  </Badge>
                </div>
                <p className="text-sm text-[#2197C0]">{event.eventCode || '—'}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex w-full flex-col divide-y divide-slate-200 border-t border-slate-200 bg-white sm:flex-row sm:divide-x sm:divide-y-0">
              <div className="min-w-0 flex-1 px-5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2197C0]">Số buổi</p>
                <p className="mt-0.5 text-sm font-medium text-black">{event.numberOfSession ?? '—'}</p>
              </div>
              <div className="min-w-0 flex-1 px-5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2197C0]">Thời lượng</p>
                <p className="mt-0.5 text-sm font-medium text-black">{event.duration || '—'}</p>
              </div>
              <div className="min-w-0 flex-1 px-5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2197C0]">Ngày tạo</p>
                <p className="mt-0.5 text-sm font-medium text-black">{formatDateTime(event.createdAt)}</p>
              </div>
            </div>
          </header>

          {/* ── BODY ── */}
          <div className="min-h-0 w-full flex-1 overflow-y-auto bg-white px-5 py-4">
            <div className="space-y-4">

              {/* Mô tả */}
              <Section icon={FileText} title="Mô tả">
                <div className="pl-4">
                  <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {event.description?.trim() ? event.description : 'Chưa có mô tả.'}
                  </p>
                </div>
              </Section>

              {/* Các buổi */}
              <Section icon={Layers} title="Các buổi trong sự kiện">
                {eventSessions.length > 0 ? (
                  <ol className="pl-4 flex flex-col gap-0">
                    {eventSessions.map((es, index) => (
                      <SessionRow
                        key={es.eventSessionId ?? index}
                        session={es}
                        index={index}
                        isLast={index === eventSessions.length - 1}
                      />
                    ))}
                  </ol>
                ) : (
                  <div className="pl-4 py-2">
                    <p className="text-sm text-slate-500">Chưa có buổi nào trong sự kiện này.</p>
                  </div>
                )}
              </Section>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
        <Icon className="h-4 w-4 shrink-0 text-[#2197C0]" strokeWidth={2} aria-hidden />
        <h3 className="text-sm font-semibold text-black">{title}</h3>
      </div>
      <div>{children}</div>
    </section>
  );
}

function SessionRow({
  session,
  index,
  isLast,
}: {
  session: EventSession;
  index: number;
  isLast: boolean;
}) {
  const no = session.sessionNo ?? index + 1;
  const title = session.title || `Buổi ${no}`;
  const skills = (session.eventSessionSkills ?? []).filter((x) => x?.isActive !== false);
  const topics = (session.eventSessionTopics ?? []).filter((x) => x?.isActive !== false);
  const desc = session.description?.trim();

  return (
    <li className="relative flex gap-3">
      <div className="relative flex w-8 shrink-0 flex-col items-center self-stretch">
        {!isLast && (
          <div
            className="pointer-events-none absolute bottom-[-0.5rem] left-1/2 top-8 w-0.5 -translate-x-1/2 bg-sky-200"
            aria-hidden
          />
        )}
        <div
          className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-[11px] font-bold tabular-nums text-sky-700"
          aria-hidden
        >
          {no}
        </div>
      </div>
      <div className="min-w-0 flex-1 pb-3 pt-1">
        <div className="flex flex-wrap items-start justify-between gap-1 mb-0.5">
          <span className="text-sm font-semibold text-black">{title}</span>
          {session.duration ? (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" aria-hidden />
              {session.duration}
            </span>
          ) : null}
        </div>
        {desc ? <p className="text-xs leading-relaxed text-slate-600 mb-2">{desc}</p> : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-[#2197C0] mb-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3" aria-hidden /> Kỹ năng
            </p>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {skills.map((x, i) => (
                  <Badge
                    key={`${x.eventSessionId}-${x.skillId}-${i}`}
                    className="rounded-full border-0 bg-violet-50 text-violet-800 text-xs font-medium"
                  >
                    {x.skillName ?? `#${x.skillId}`}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-400">Chưa gán</span>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-[#2197C0] mb-1 flex items-center gap-1">
              <Tags className="h-3 w-3" aria-hidden /> Chủ đề
            </p>
            {topics.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {topics.map((x, i) => (
                  <Badge
                    key={`${x.eventSessionId}-${x.topicId}-${i}`}
                    className="rounded-full border-0 bg-amber-50 text-amber-800 text-xs font-medium"
                  >
                    {x.topicName ?? `#${x.topicId}`}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-400">Chưa gán</span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
