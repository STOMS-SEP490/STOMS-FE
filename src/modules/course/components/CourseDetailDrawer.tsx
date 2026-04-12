import { useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import dayjs from 'dayjs';
import { Skeleton } from 'antd';
import {
  BookOpen,
  Calendar,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  Hash,
  Layers,
  X,
} from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';
import { formatCourseDuration } from '../formatCourseDuration';
import type { CourseListItem, CourseRequestSummary, CourseSubjectSummary } from '../courseType';

type Props = {
  open: boolean;
  onClose: () => void;
  detailCourse: CourseListItem | null;
  detailLoading: boolean;
  onSubjectClick?: (subjectId: number) => void;
};

function formatDateTime(date?: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleString('vi-VN');
}

export function CourseDetailDrawer({
  open,
  onClose,
  detailCourse,
  detailLoading,
  onSubjectClick,
}: Props) {
  const [requestsExpanded, setRequestsExpanded] = useState(false);

  if (!open) return null;

  const showBody = detailCourse != null;
  const subjectCount = detailCourse
    ? String(detailCourse.numberOfSubject ?? detailCourse.courseSubjects?.length ?? 0)
    : '—';
  const sessionCount = detailCourse ? String(detailCourse.numberOfSession ?? '—') : '—';
  const durationLabel =
    detailCourse != null ? formatCourseDuration(detailCourse.duration ?? undefined) ?? '—' : '—';
  const relatedRequests = detailCourse?.requests ?? [];

  return (
    <>
      <div className="fixed inset-0 z-40 h-full bg-black/35" onClick={onClose} aria-hidden />

      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-[720px] max-w-[96vw]',
          'border-l border-slate-200 bg-white',
          'transition-transform duration-300 ease-out',
          'translate-x-0',
        )}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <header className="shrink-0 border-b border-slate-100 bg-white px-5 pb-4 pt-5">
            {detailLoading && !detailCourse ? (
              <div className="space-y-3 pr-10">
                <Skeleton active title={{ width: '60%' }} paragraph={{ rows: 1 }} />
                <Skeleton.Button active size="small" style={{ width: 200 }} />
              </div>
            ) : detailCourse ? (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold tracking-tight text-slate-900">
                      {detailCourse.courseName}
                    </h2>
                    <Badge
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
                        detailCourse.isActive
                          ? 'border-0 bg-emerald-100 text-emerald-800'
                          : 'border-0 bg-slate-200 text-slate-700',
                      )}
                    >
                      {detailCourse.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <HeaderChip icon={Hash} label={detailCourse.courseCode || '—'} title="Mã khóa học" />
                    <HeaderChip icon={Layers} label={`${subjectCount} môn`} title="Số môn học" />
                    <HeaderChip icon={BookOpen} label={`${sessionCount} buổi`} title="Tổng buổi (khóa)" />
                    <HeaderChip icon={Clock} label={durationLabel} title="Thời lượng tổng" />
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
            ) : (
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-slate-500">Không có dữ liệu.</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Đóng"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </header>

          <div className="relative min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-5 py-5">
            {detailLoading && detailCourse && (
              <div className="pointer-events-none absolute inset-0 z-10 bg-white/45" aria-hidden />
            )}
            {detailLoading && detailCourse && (
              <p className="absolute left-1/2 top-6 z-20 -translate-x-1/2 rounded-full bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm ring-1 ring-slate-200/60">
                Đang cập nhật…
              </p>
            )}

            {detailLoading && !detailCourse ? (
              <div className="space-y-4">
                <Skeleton active paragraph={{ rows: 4 }} />
                <Skeleton active paragraph={{ rows: 6 }} />
              </div>
            ) : showBody && detailCourse ? (
              <div className="space-y-8">
                <Section icon={CalendarClock} title="Thông tin chung" accent="amber">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <MetaTile
                      icon={CalendarClock}
                      label="Cập nhật lần cuối"
                      value={formatDateTime(detailCourse.updatedAt)}
                    />
                    <MetaTile icon={Hash} label="Mã số khóa" value={String(detailCourse.courseId)} />
                  </div>
                </Section>

                <Section icon={FileText} title="Mô tả" accent="sky">
                  <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {detailCourse.description?.trim()
                      ? detailCourse.description
                      : 'Chưa có mô tả'}
                  </p>
                </Section>

                <Section icon={BookOpen} title="Môn học trong khóa" accent="emerald">
                  {detailCourse.courseSubjects && detailCourse.courseSubjects.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white">
                      {detailCourse.courseSubjects.map((cs: CourseSubjectSummary) => (
                        <SubjectBlock
                          key={`${cs.courseId ?? 'c'}-${cs.subjectId}`}
                          cs={cs}
                          onSubjectClick={onSubjectClick}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Chưa có môn học nào trong khóa.</p>
                  )}
                </Section>

                <Section icon={ClipboardList} title="Yêu cầu liên quan" accent="violet">
                  <button
                    type="button"
                    onClick={() => setRequestsExpanded((v) => !v)}
                    className="flex w-full items-center justify-between rounded-xl bg-white px-3.5 py-2.5 text-left shadow-sm ring-1 ring-slate-200/70 transition-colors hover:bg-slate-50"
                  >
                    <span className="text-sm font-medium text-slate-800">
                      {relatedRequests.length > 0
                        ? `Có ${relatedRequests.length} yêu cầu liên quan`
                        : 'Không có yêu cầu liên quan'}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200',
                        requestsExpanded && 'rotate-180',
                      )}
                      aria-hidden
                    />
                  </button>
                  {requestsExpanded && relatedRequests.length > 0 ? (
                    <div className="mt-3 flex flex-col gap-4">
                      {relatedRequests.map((req: CourseRequestSummary) => (
                        <RequestBlock key={req.requestId} req={req} />
                      ))}
                    </div>
                  ) : null}
                </Section>
              </div>
            ) : null}
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
      <Icon className="h-3.5 w-3.5 text-[#2197C0]" aria-hidden />
      <span className="font-medium">{label}</span>
    </span>
  );
}

const SECTION_ACCENTS = {
  amber: { wrap: 'bg-amber-100/90 ring-amber-200/50', icon: 'text-amber-700' },
  sky: { wrap: 'bg-sky-100/90 ring-sky-200/50', icon: 'text-sky-700' },
  emerald: { wrap: 'bg-emerald-100/90 ring-emerald-200/50', icon: 'text-emerald-700' },
  violet: { wrap: 'bg-violet-100/90 ring-violet-200/50', icon: 'text-violet-700' },
} as const;

type SectionAccent = keyof typeof SECTION_ACCENTS;

function Section({
  icon: Icon,
  title,
  accent = 'sky',
  children,
}: {
  icon: LucideIcon;
  title: string;
  accent?: SectionAccent;
  children: ReactNode;
}) {
  const a = SECTION_ACCENTS[accent];
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
            a.wrap,
          )}
        >
          <Icon className={cn('h-5 w-5', a.icon)} strokeWidth={2} aria-hidden />
        </span>
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
  value: ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-xl bg-white px-3.5 py-3 shadow-sm ring-1 ring-slate-200/60">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#2197C0]/90" aria-hidden />
      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className="mt-0.5 break-words text-sm font-medium text-slate-900">{value}</div>
      </div>
    </div>
  );
}

function SubjectBlock({
  cs,
  onSubjectClick,
}: {
  cs: CourseSubjectSummary;
  onSubjectClick?: (subjectId: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const subjectId = Number(cs.subjectId);
  const canClick = Boolean(onSubjectClick) && Number.isFinite(subjectId) && subjectId > 0;
  const sub = cs.subject;
  const subjectCode = sub?.subjectCode ?? `#${cs.subjectId}`;
  const subjectName = sub?.subjectName ?? cs.subjectName ?? `Môn #${cs.subjectId}`;
  const topic = sub?.topicName;
  const desc = sub?.description?.trim();
  const sessions = sub?.subjectSessions ?? [];
  const sessionTotal = sub?.numberOfSession ?? sessions.length;
  return (
    <div className="min-w-0 border-b border-slate-100 bg-white last:border-b-0">
      <div className="group flex min-h-[2.75rem] items-stretch gap-0">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-slate-50/95 sm:gap-3 sm:px-3.5 sm:py-2.5"
        >
          <span
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50 text-slate-500 transition-all duration-200',
              'group-hover:border-[#2197C0]/25 group-hover:bg-[#2197C0]/[0.07] group-hover:text-[#2197C0]',
              expanded && 'border-[#2197C0]/30 bg-[#2197C0]/10 text-[#2197C0]',
            )}
          >
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform duration-200', expanded && 'rotate-180')}
              aria-hidden
            />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2.5">
            <span className="inline-flex w-fit max-w-full shrink-0 rounded-md bg-[#2197C0]/[0.09] px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#2197C0]">
              {subjectCode}
            </span>
            <span className="min-w-0 text-[13px] font-medium leading-snug text-slate-900 sm:text-sm">
              {subjectName}
            </span>
          </div>
        </button>
        {canClick ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSubjectClick?.(subjectId);
            }}
            className="inline-flex shrink-0 items-center gap-0.5 self-stretch border-l border-transparent px-2.5 text-xs font-medium text-[#2197C0] transition-colors hover:border-slate-100 hover:bg-slate-50 sm:px-3"
            title="Xem chi tiết môn học"
          >
            Chi tiết
            <ChevronRight className="h-3.5 w-3.5 opacity-80" aria-hidden />
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div className="border-t border-slate-200/90 bg-slate-100/80 px-2.5 pb-2.5 pt-2.5 sm:px-3">
          <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 sm:p-4">
            <div className="space-y-4 border-l-[3px] border-[#2197C0] pl-3.5">
              {topic ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Chủ đề</p>
                  <p className="mt-1 text-sm font-semibold leading-snug text-slate-900">{topic}</p>
                </div>
              ) : null}

              {desc ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Mô tả</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-800">{desc}</p>
                </div>
              ) : null}

              {sessions.length > 0 ? (
                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <p className="text-sm font-semibold text-slate-800">
                    Gồm {sessionTotal} buổi
                  </p>
                  <ol className="flex flex-col gap-3">
                    {sessions.map((ss, index) => (
                      <SessionRow
                        key={ss.subjectSessionId}
                        sessionNo={ss.sessionNo ?? index + 1}
                        title={ss.title ?? '—'}
                        duration={
                          ss.duration != null && ss.duration !== '' ? formatCourseDuration(String(ss.duration)) : null
                        }
                        description={ss.description?.trim() ?? ''}
                        isLast={index === sessions.length - 1}
                      />
                    ))}
                  </ol>
                </div>
              ) : (
                <p className="text-sm font-medium text-slate-800">Chưa có buổi mẫu cho môn này.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SessionRow({
  sessionNo,
  title,
  duration,
  description,
  isLast,
}: {
  sessionNo: number;
  title: string;
  duration: string | null;
  description: string;
  isLast: boolean;
}) {
  return (
    <li className="relative flex gap-3">
      <div className="relative flex w-9 shrink-0 flex-col items-center self-stretch">
        {!isLast ? (
          <div
            className="pointer-events-none absolute bottom-[-0.75rem] left-1/2 top-9 w-0.5 -translate-x-1/2 bg-sky-200/70"
            aria-hidden
          />
        ) : null}
        <div
          className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sky-200/90 bg-sky-50/95 text-[12px] font-bold tabular-nums text-sky-800 shadow-sm"
          aria-hidden
        >
          {sessionNo}
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2 rounded-xl border border-slate-200/90 bg-slate-50/40 px-3.5 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <span className="text-sm font-bold leading-snug text-slate-900">{title}</span>
          {duration ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-sky-100 px-2 py-1 text-xs font-bold text-sky-950 ring-1 ring-sky-300/70">
              <Clock className="h-3.5 w-3.5 text-sky-800" aria-hidden />
              {duration}
            </span>
          ) : null}
        </div>
        {description ? (
          <p className="text-sm leading-relaxed text-slate-800">{description}</p>
        ) : null}
      </div>
    </li>
  );
}

function RequestBlock({ req }: { req: CourseRequestSummary }) {
  return (
    <div className="space-y-3 rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-200/50">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900">
          {req.requestCode} — {req.requestName}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" aria-hidden />
            {req.startDate ? dayjs(req.startDate).format('DD/MM/YYYY') : '—'}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
        {req.approvedAt ? <span>Duyệt {formatDateTime(req.approvedAt)}</span> : null}
        {req.createdAt ? <span>Tạo {formatDateTime(req.createdAt)}</span> : null}
        {req.updatedAt ? <span>Sửa {formatDateTime(req.updatedAt)}</span> : null}
      </div>
    </div>
  );
}
