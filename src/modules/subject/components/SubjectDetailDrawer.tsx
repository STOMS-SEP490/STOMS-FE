import { useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import dayjs from 'dayjs';
import { Skeleton } from 'antd';
import {
  BookOpen,
  Calendar,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  Hash,
  Layers,
  Link2,
  Sparkles,
  X,
} from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';
import type { SubjectListItem, SubjectRequestSummary } from '../subject';

type Props = {
  open: boolean;
  onClose: () => void;
  detailSubject: SubjectListItem | null;
  detailLoading: boolean;
};

function formatTimeSpan(raw: string | null | undefined): string | null {
  if (raw == null || raw === '') return null;
  const withDays = raw.match(/^(\d+)\.(\d{2}):(\d{2}):(\d{2})$/);
  if (withDays) {
    const days = parseInt(withDays[1], 10);
    const h = parseInt(withDays[2], 10) + days * 24;
    const m = parseInt(withDays[3], 10);
    const parts: string[] = [];
    if (h) parts.push(`${h} giờ`);
    if (m) parts.push(`${m} phút`);
    return parts.join(' ') || raw;
  }
  const t = raw.match(/^(\d{1,3}):(\d{2}):(\d{2})/);
  if (t) {
    const h = parseInt(t[1], 10);
    const m = parseInt(t[2], 10);
    const parts: string[] = [];
    if (h) parts.push(`${h} giờ`);
    if (m) parts.push(`${m} phút`);
    return parts.join(' ') || raw;
  }
  return raw;
}

function formatDateTime(date?: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleString('vi-VN');
}

function skillDisplayName(ss: NonNullable<SubjectListItem['subjectSkills']>[number]) {
  return ss.skillName ?? ss.skill?.skillName ?? `Skill #${ss.skillId}`;
}

export function SubjectDetailDrawer({ open, onClose, detailSubject, detailLoading }: Props) {
  const [requestsExpanded, setRequestsExpanded] = useState(false);

  if (!open) return null;

  const showBody = detailSubject != null;
  const sessionCount = detailSubject
    ? String(detailSubject.numberOfSession ?? detailSubject.subjectSessions?.length ?? 0)
    : '—';
  const topicLabel =
    detailSubject?.topicName?.trim() ||
    (detailSubject?.topicId != null ? `Chủ đề #${detailSubject.topicId}` : '—');

  const activeSkills =
    detailSubject != null
      ? (detailSubject.subjectSkills ?? []).filter((ss) =>
          ss?.isActive === undefined ? true : ss.isActive === true,
        )
      : [];

  const sortedSessions = detailSubject?.subjectSessions
    ? [...detailSubject.subjectSessions].sort((a, b) => (a.sessionNo ?? 0) - (b.sessionNo ?? 0))
    : [];

  const courseLinks = detailSubject?.courseSubjects ?? [];
  const courseCount = courseLinks.length;
  const relatedRequests = detailSubject?.requests ?? [];

  return (
    <>
      <div className="fixed inset-0 z-40 h-full bg-black/35" onClick={onClose} aria-hidden />

      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-[720px] max-w-[96vw]',
          'border-l border-slate-200/80 bg-white shadow-2xl',
          'transition-transform duration-300 ease-out translate-x-0',
        )}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <header className="shrink-0 border-b border-slate-100 bg-gradient-to-b from-slate-50/90 to-white px-5 pb-4 pt-5">
            {detailLoading && !detailSubject ? (
              <div className="space-y-3 pr-10">
                <Skeleton active title={{ width: '60%' }} paragraph={{ rows: 1 }} />
                <Skeleton.Button active size="small" style={{ width: 200 }} />
              </div>
            ) : detailSubject ? (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold tracking-tight text-slate-900">
                      {detailSubject.subjectName || '—'}
                    </h2>
                    <Badge
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
                        detailSubject.isActive
                          ? 'border-0 bg-emerald-100 text-emerald-800'
                          : 'border-0 bg-slate-200 text-slate-700',
                      )}
                    >
                      {detailSubject.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <HeaderChip icon={Hash} label={detailSubject.subjectCode || '—'} title="Mã môn học" />
                    <HeaderChip icon={BookOpen} label={topicLabel} title="Chủ đề" />
                    <HeaderChip icon={Layers} label={`${sessionCount} buổi`} title="Số buổi (môn)" />
                    {courseCount > 0 ? (
                      <HeaderChip
                        icon={GraduationCap}
                        label={`${courseCount} khóa`}
                        title="Số khóa học đang dùng môn này"
                      />
                    ) : null}
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
            {detailLoading && detailSubject && (
              <div className="pointer-events-none absolute inset-0 z-10 bg-white/45" aria-hidden />
            )}
            {detailLoading && detailSubject && (
              <p className="absolute left-1/2 top-6 z-20 -translate-x-1/2 rounded-full bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm ring-1 ring-slate-200/60">
                Đang cập nhật…
              </p>
            )}

            {detailLoading && !detailSubject ? (
              <div className="space-y-4">
                <Skeleton active paragraph={{ rows: 4 }} />
                <Skeleton active paragraph={{ rows: 6 }} />
              </div>
            ) : showBody && detailSubject ? (
              <div className="space-y-8">
                <Section icon={CalendarClock} title="Thông tin chung">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <MetaTile icon={Hash} label="Subject ID" value={String(detailSubject.subjectId)} />
                    <MetaTile
                      icon={CalendarClock}
                      label="Ngày tạo"
                      value={formatDateTime(detailSubject.createdAt)}
                    />
                    <MetaTile
                      icon={CalendarClock}
                      label="Cập nhật lần cuối"
                      value={formatDateTime(detailSubject.updatedAt)}
                    />
                    <MetaTile
                      icon={Layers}
                      label="Số buổi (theo cấu hình)"
                      value={String(detailSubject.numberOfSession ?? '—')}
                    />
                  </div>
                </Section>

                <Section icon={FileText} title="Mô tả">
                  <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {detailSubject.description?.trim()
                      ? detailSubject.description
                      : 'Chưa có mô tả.'}
                  </p>
                </Section>

                {courseCount > 0 && (
                  <Section icon={Link2} title="Khóa học đang sử dụng môn này">
                    <div className="flex flex-wrap gap-2">
                      {courseLinks.map((cs) => (
                        <span
                          key={`${cs.courseId}-${cs.subjectId}`}
                          className="inline-flex items-center rounded-xl bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm ring-1 ring-slate-200/60"
                        >
                          Khóa #{cs.courseId}
                          {cs.createdAt ? (
                            <span className="ml-1.5 font-normal text-slate-500">
                              · gắn {dayjs(cs.createdAt).format('DD/MM/YYYY')}
                            </span>
                          ) : null}
                        </span>
                      ))}
                    </div>
                  </Section>
                )}

                <Section icon={Sparkles} title="Kỹ năng liên quan">
                  {activeSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {activeSkills.map((ss) => (
                        <span
                          key={`${ss.subjectId}-${ss.skillId}`}
                          className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-900 ring-1 ring-violet-100/80"
                        >
                          {skillDisplayName(ss)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Chưa gán kỹ năng cho môn học này.</p>
                  )}
                </Section>

                <Section icon={Layers} title="Buổi học">
                  {sortedSessions.length > 0 ? (
                    <ol className="flex flex-col gap-3">
                      {sortedSessions.map((ss, index) => (
                        <SessionRow
                          key={ss.subjectSessionId ?? index}
                          sessionNo={ss.sessionNo ?? index + 1}
                          title={ss.title ?? '—'}
                          duration={
                            ss.duration != null && ss.duration !== ''
                              ? formatTimeSpan(String(ss.duration))
                              : null
                          }
                          description={ss.description?.trim() ?? ''}
                          isLast={index === sortedSessions.length - 1}
                        />
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Chưa có danh sách các buổi
                    </p>
                  )}
                </Section>

                <Section icon={ClipboardList} title="Yêu cầu liên quan">
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
                      {relatedRequests.map((req) => (
                        <RelatedRequestBlock key={req.requestId} req={req} />
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

function RelatedRequestBlock({ req }: { req: SubjectRequestSummary }) {
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
    </div>
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
      className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1 text-xs text-slate-700 shadow-sm ring-1 ring-slate-200/80"
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-[#2197C0]" aria-hidden />
      <span className="min-w-0 truncate font-medium">{label}</span>
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
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2.5">
        <Icon className="h-5 w-5 shrink-0 text-[#2197C0]" strokeWidth={2} aria-hidden />
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
            className="pointer-events-none absolute bottom-[-0.75rem] left-1/2 top-9 w-px -translate-x-1/2 bg-slate-200"
            aria-hidden
          />
        ) : null}
        <div
          className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/95 bg-white text-[11px] font-semibold tabular-nums text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.05)] ring-[3px] ring-slate-50"
          aria-hidden
        >
          {sessionNo}
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5 rounded-2xl bg-white px-3.5 py-3 shadow-sm ring-1 ring-slate-200/50">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <span className="text-sm font-semibold text-slate-900">{title}</span>
          {duration ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              <Clock className="h-3 w-3" aria-hidden />
              {duration}
            </span>
          ) : null}
        </div>
        {description ? <p className="text-xs leading-relaxed text-slate-600">{description}</p> : null}
      </div>
    </li>
  );
}
