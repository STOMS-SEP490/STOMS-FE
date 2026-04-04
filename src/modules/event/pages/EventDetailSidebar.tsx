import type { LucideIcon } from 'lucide-react';
import {
  X,
  CalendarClock,
  Clock,
  FileText,
  Hash,
  Layers,
  Sparkles,
  Tags,
} from 'lucide-react';
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
          className="fixed inset-0 z-40 h-full bg-black/35"
          onClick={onClose}
          aria-hidden
        />
      )}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-[720px] max-w-[96vw]',
          'border-l border-slate-200/80 bg-white shadow-2xl',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex h-full flex-col overflow-hidden">
          {/* HEADER */}
          <header className="shrink-0 border-b border-slate-100 bg-gradient-to-b from-slate-50/90 to-white px-5 pb-4 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-semibold tracking-tight text-slate-900">
                    {event.eventName}
                  </h2>
                  <Badge
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
                      event.isActive
                        ? 'border-0 bg-emerald-100 text-emerald-800'
                        : 'border-0 bg-slate-200 text-slate-700'
                    )}
                  >
                    {event.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <HeaderChip icon={Hash} label={event.eventCode || '—'} title="Mã sự kiện" />
                  <HeaderChip
                    icon={Clock}
                    label={event.duration || '—'}
                    title="Thời lượng tổng"
                  />
                  <HeaderChip
                    icon={Layers}
                    label={`${event.numberOfSession ?? '—'} buổi`}
                    title="Số buổi"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          {/* CONTENT */}
          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-5 py-5">
            <div className="space-y-8">
              <Section icon={CalendarClock} title="Thông tin chung">
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetaTile
                    icon={CalendarClock}
                    label="Ngày tạo"
                    value={formatDateTime(event.createdAt)}
                  />
                  <MetaTile
                    icon={CalendarClock}
                    label="Cập nhật lần cuối"
                    value={formatDateTime(event.updatedAt)}
                  />
                </div>
              </Section>

              <Section icon={FileText} title="Mô tả">
                <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                  {event.description?.trim() ? event.description : 'Chưa có mô tả.'}
                </p>
              </Section>

              <Section icon={Layers} title="Các buổi trong sự kiện">
                {eventSessions.length > 0 ? (
                  <ol className="flex flex-col gap-4">
                    {eventSessions.map((es, index) => (
                      <SessionBlock
                        key={es.eventSessionId ?? index}
                        session={es}
                        index={index}
                        isLast={index === eventSessions.length - 1}
                      />
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-slate-500">Chưa có buổi nào trong sự kiện này.</p>
                )}
              </Section>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function HeaderChip({
  icon: Icon,
  label,
  title,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
}) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1 text-xs text-slate-700 shadow-sm ring-1 ring-slate-200/80"
    >
      <Icon className="h-3.5 w-3.5 text-sky-600" aria-hidden />
      <span className="font-medium">{label}</span>
    </span>
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
    <section className="space-y-3">
      <div className="flex items-center gap-2.5">
        <Icon className="h-5 w-5 shrink-0 text-sky-600" strokeWidth={2} aria-hidden />
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div>{children}</div>
    </section>
  );
}

function MetaTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-xl bg-white px-3.5 py-3 shadow-sm ring-1 ring-slate-200/60">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-sky-600/90" aria-hidden />
      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className="mt-0.5 text-sm font-medium text-slate-900 break-words">{value}</div>
      </div>
    </div>
  );
}

function SessionBlock({
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
      <div className="relative flex w-9 shrink-0 flex-col items-center self-stretch">
        {!isLast ? (
          <div
            className="pointer-events-none absolute left-1/2 top-9 bottom-[-1rem] w-px -translate-x-1/2 rounded-full bg-gradient-to-b from-slate-300/90 via-slate-200/80 to-slate-200/50"
            aria-hidden
          />
        ) : null}
        <div
          className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/95 bg-white text-[11px] font-semibold tabular-nums tracking-tight text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.05)] ring-[3px] ring-slate-50"
          aria-hidden
        >
          {no}
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-3 rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-200/50">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
          {session.duration ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              <Clock className="h-3 w-3" aria-hidden />
              {session.duration}
            </span>
          ) : null}
        </div>

        {desc ? (
          <p className="text-xs leading-relaxed text-slate-600">{desc}</p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-violet-500" aria-hidden />
              Kỹ năng
            </div>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {skills.map((x, i) => (
                  <span
                    key={`${x.eventSessionId}-${x.skillId}-${i}`}
                    className="rounded-lg bg-violet-50 px-2 py-1 text-xs font-medium text-violet-900"
                  >
                    {x.skillName ?? `#${x.skillId}`}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-400">Chưa gán kỹ năng</span>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Tags className="h-3.5 w-3.5 text-amber-600" aria-hidden />
              Chủ đề
            </div>
            {topics.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {topics.map((x, i) => (
                  <span
                    key={`${x.eventSessionId}-${x.topicId}-${i}`}
                    className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900"
                  >
                    {x.topicName ?? `#${x.topicId}`}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-slate-400">Chưa gán chủ đề</span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
