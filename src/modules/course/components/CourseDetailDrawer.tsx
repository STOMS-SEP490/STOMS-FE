import { useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import dayjs from 'dayjs';
import { Skeleton } from 'antd';
import {
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  Hash,
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

export function CourseDetailDrawer({ open, onClose, detailCourse, detailLoading, onSubjectClick }: Props) {
  const [requestsExpanded, setRequestsExpanded] = useState(false);

  if (!open) return null;

  const activeCourseSubjects =
    detailCourse?.courseSubjects?.filter((cs) => (cs.isActive ?? true) === true) ?? [];

  const subjectCount = detailCourse
    ? String(activeCourseSubjects.length)
    : '—';
  const sessionCount = detailCourse ? String(detailCourse.numberOfSession ?? '—') : '—';
  const durationLabel = detailCourse != null ? formatCourseDuration(detailCourse.duration ?? undefined) ?? '—' : '—';
  const relatedRequests = detailCourse?.requests ?? [];

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
            {detailLoading && !detailCourse ? (
              <div className="space-y-3 px-5 py-4 pr-10">
                <Skeleton active title={{ width: '60%' }} paragraph={{ rows: 1 }} />
              </div>
            ) : detailCourse ? (
              <>
                <div className="flex w-full items-start justify-between gap-3 px-5 pb-3 pt-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-semibold text-black">
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
                    <p className="text-sm text-[#2197C0]">{detailCourse.courseCode || '—'}</p>
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
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2197C0]">Số môn</p>
                    <p className="mt-0.5 text-sm font-medium text-black">{subjectCount}</p>
                  </div>
                  <div className="min-w-0 flex-1 px-5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2197C0]">Tổng buổi</p>
                    <p className="mt-0.5 text-sm font-medium text-black">{sessionCount}</p>
                  </div>
                  <div className="min-w-0 flex-1 px-5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2197C0]">Thời lượng</p>
                    <p className="mt-0.5 text-sm font-medium text-black">{durationLabel}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-start justify-between gap-3 px-5 py-4">
                <p className="text-sm text-slate-500">Không có dữ liệu.</p>
                <button type="button" onClick={onClose} className="shrink-0 p-2 text-slate-400 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </header>

          {/* ── BODY ── */}
          <div className="relative min-h-0 w-full flex-1 overflow-y-auto bg-white px-5 py-4">
            {detailLoading && detailCourse && (
              <div className="pointer-events-none absolute inset-0 z-10 bg-white/45" aria-hidden />
            )}

            {detailLoading && !detailCourse ? (
              <div className="space-y-4">
                <Skeleton active paragraph={{ rows: 4 }} />
                <Skeleton active paragraph={{ rows: 6 }} />
              </div>
            ) : detailCourse ? (
              <div className="space-y-4">

                {/* Thông tin chung */}
                <Section icon={Hash} title="Thông tin chung">
                  <div className="pl-4 divide-y divide-slate-200">
                    <MetaRow label="Mã số khóa" value={String(detailCourse.courseId)} />
                    <MetaRow label="Cập nhật lần cuối" value={formatDateTime(detailCourse.updatedAt)} />
                  </div>
                </Section>

                {/* Mô tả */}
                <Section icon={FileText} title="Mô tả">
                  <div className="pl-4">
                    <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                      {detailCourse.description?.trim() ? detailCourse.description : 'Chưa có mô tả'}
                    </p>
                  </div>
                </Section>

                {/* Môn học */}
                <Section icon={BookOpen} title="Môn học trong khóa">
                  {activeCourseSubjects.length > 0 ? (
                    <div className="pl-4 divide-y divide-slate-200">
                      {activeCourseSubjects.map((cs: CourseSubjectSummary) => (
                        <SubjectBlock
                          key={`${cs.courseId ?? 'c'}-${cs.subjectId}`}
                          cs={cs}
                          onSubjectClick={onSubjectClick}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="pl-4 py-2">
                      <p className="text-sm text-slate-500">Không có môn học đang hoạt động trong khóa.</p>
                    </div>
                  )}
                </Section>

                {/* Yêu cầu liên quan */}
                <Section icon={ClipboardList} title="Yêu cầu liên quan">
                  <div className="pl-4">
                    <button
                      type="button"
                      onClick={() => setRequestsExpanded((v) => !v)}
                      className="flex w-full items-center justify-between py-2 text-left"
                    >
                      <span className="text-sm text-slate-700">
                        {relatedRequests.length > 0
                          ? `Có ${relatedRequests.length} yêu cầu liên quan`
                          : 'Không có yêu cầu liên quan'}
                      </span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200',
                          requestsExpanded && 'rotate-180',
                        )}
                        aria-hidden
                      />
                    </button>
                    {requestsExpanded && relatedRequests.length > 0 ? (
                      <div className="divide-y divide-slate-200">
                        {relatedRequests.map((req: CourseRequestSummary) => (
                          <RequestBlock key={req.requestId} req={req} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </Section>

              </div>
            ) : null}
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
  children: ReactNode;
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

function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="py-1.5">
      <div className="text-xs font-medium text-[#2197C0]">{label}</div>
      <div className="mt-0.5 break-words text-sm text-black">{value}</div>
    </div>
  );
}

function SubjectBlock({ cs, onSubjectClick }: { cs: CourseSubjectSummary; onSubjectClick?: (subjectId: number) => void }) {
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
    <div className="min-w-0">
      <div className="flex min-h-[2.5rem] items-stretch gap-0">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-2.5 py-2 text-left transition-colors hover:bg-slate-50"
        >
          <ChevronDown
            className={cn('h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200', expanded && 'rotate-180')}
            aria-hidden
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
            <span className="shrink-0 rounded bg-[#2197C0]/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#2197C0]">
              {subjectCode}
            </span>
            <span className="min-w-0 text-sm font-medium text-black">{subjectName}</span>
          </div>
        </button>
        {canClick ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSubjectClick?.(subjectId); }}
            className="inline-flex shrink-0 items-center gap-0.5 self-stretch px-2.5 text-xs font-medium text-[#2197C0] hover:bg-slate-50"
            title="Xem chi tiết môn học"
          >
            Chi tiết <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div className="pl-6 pb-2.5 space-y-2">
          {topic ? (
            <div>
              <p className="text-xs font-medium text-[#2197C0]">Chủ đề</p>
              <p className="text-sm text-black">{topic}</p>
            </div>
          ) : null}
          {desc ? (
            <div>
              <p className="text-xs font-medium text-[#2197C0]">Mô tả</p>
              <p className="text-sm leading-relaxed text-slate-700">{desc}</p>
            </div>
          ) : null}
          {sessions.length > 0 ? (
            <div className="pt-1">
              <p className="text-xs font-medium text-[#2197C0] mb-2">Gồm {sessionTotal} buổi</p>
              <ol className="flex flex-col gap-0">
                {sessions.map((ss, index) => (
                  <SessionRow
                    key={ss.subjectSessionId}
                    sessionNo={ss.sessionNo ?? index + 1}
                    title={ss.title ?? '—'}
                    duration={ss.duration != null && ss.duration !== '' ? formatCourseDuration(String(ss.duration)) : null}
                    description={ss.description?.trim() ?? ''}
                    isLast={index === sessions.length - 1}
                  />
                ))}
              </ol>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Chưa có buổi mẫu cho môn này.</p>
          )}
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
      {/* timeline line */}
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
          {sessionNo}
        </div>
      </div>
      {/* content */}
      <div className="min-w-0 flex-1 pb-3 pt-1">
        <div className="flex flex-wrap items-start justify-between gap-1 mb-0.5">
          <span className="text-sm font-semibold text-black">{title}</span>
          {duration ? (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" aria-hidden />
              {duration}
            </span>
          ) : null}
        </div>
        {description ? (
          <p className="text-xs leading-relaxed text-slate-600">{description}</p>
        ) : null}
      </div>
    </li>
  );
}

function RequestBlock({ req }: { req: CourseRequestSummary }) {
  return (
    <div className="py-2">
      <div className="text-sm font-medium text-black">
        {req.requestCode} — {req.requestName}
      </div>
      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3 w-3" aria-hidden />
          {req.startDate ? dayjs(req.startDate).format('DD/MM/YYYY') : '—'}
        </span>
        {req.approvedAt ? <span>Duyệt {formatDateTime(req.approvedAt)}</span> : null}
        {req.createdAt ? <span>Tạo {formatDateTime(req.createdAt)}</span> : null}
      </div>
    </div>
  );
}
