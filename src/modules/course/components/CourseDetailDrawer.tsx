import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import dayjs from 'dayjs';
import { Skeleton } from 'antd';
import {
  BookOpen,
  Calendar,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  Hash,
  Layers,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';
import type { CourseListItem, CourseRequestSummary, CourseSubjectSummary } from '../courseType';

type Props = {
  open: boolean;
  onClose: () => void;
  detailCourse: CourseListItem | null;
  detailLoading: boolean;
  onSubjectClick?: (subjectId: number) => void;
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

function requestStatusStyle(status: string | undefined): string {
  const s = (status ?? '').toLowerCase();
  if (s.includes('approved') || s.includes('duyệt') || s.includes('hoàn')) {
    return 'border-0 bg-emerald-100 text-emerald-800';
  }
  if (s.includes('reject') || s.includes('từ chối') || s.includes('hủy')) {
    return 'border-0 bg-red-100 text-red-800';
  }
  if (s.includes('pending') || s.includes('chờ')) {
    return 'border-0 bg-amber-100 text-amber-900';
  }
  return 'border-0 bg-slate-200 text-slate-700';
}

export function CourseDetailDrawer({
  open,
  onClose,
  detailCourse,
  detailLoading,
  onSubjectClick,
}: Props) {
  if (!open) return null;

  const showBody = detailCourse != null;
  const subjectCount = detailCourse
    ? String(detailCourse.numberOfSubject ?? detailCourse.courseSubjects?.length ?? 0)
    : '—';
  const sessionCount = detailCourse ? String(detailCourse.numberOfSession ?? '—') : '—';
  const durationLabel =
    detailCourse != null ? formatTimeSpan(detailCourse.duration ?? undefined) ?? '—' : '—';

  return (
    <>
      <div className="fixed inset-0 z-40 h-full bg-black/35" onClick={onClose} aria-hidden />

      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-[720px] max-w-[96vw]',
          'border-l border-slate-200/80 bg-white shadow-2xl',
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
                <Section icon={CalendarClock} title="Thông tin chung">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <MetaTile
                      icon={CalendarClock}
                      label="Cập nhật lần cuối"
                      value={formatDateTime(detailCourse.updatedAt)}
                    />
                    <MetaTile icon={Hash} label="Course ID" value={String(detailCourse.courseId)} />
                  </div>
                </Section>

                <Section icon={FileText} title="Mô tả">
                  <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {detailCourse.description?.trim()
                      ? detailCourse.description
                      : 'Chưa có mô tả (API chi tiết có thể chưa trả về trường này).'}
                  </p>
                </Section>

                <Section icon={BookOpen} title="Môn học trong khóa">
                  {detailCourse.courseSubjects && detailCourse.courseSubjects.length > 0 ? (
                    <div className="flex flex-col gap-5">
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

                <Section icon={ClipboardList} title="Yêu cầu liên quan">
                  {detailCourse.requests && detailCourse.requests.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      {detailCourse.requests.map((req: CourseRequestSummary) => (
                        <RequestBlock key={req.requestId} req={req} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Không có yêu cầu nào được tải kèm chi tiết khóa (hoặc danh sách trống).
                    </p>
                  )}
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
  children: ReactNode;
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
  value: ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-xl bg-white px-3.5 py-3 shadow-sm ring-1 ring-slate-200/60">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-sky-600/90" aria-hidden />
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
  const subjectId = Number(cs.subjectId);
  const canClick = Boolean(onSubjectClick) && Number.isFinite(subjectId) && subjectId > 0;
  const sub = cs.subject;
  const title =
    sub != null ? `${sub.subjectCode} — ${sub.subjectName}` : `${cs.subjectName ?? `Môn #${cs.subjectId}`}`;
  const topic = sub?.topicName;
  const desc = sub?.description?.trim();
  const sessions = sub?.subjectSessions ?? [];
  const skillItems =
    sub?.subjectSkills
      ?.map((sk) => ({
        id: sk.skillId,
        name: sk.skillName ?? sk.skill?.skillName ?? '',
      }))
      .filter((x) => x.name) ?? [];

  const inner = (
    <div className="min-w-0 flex-1 space-y-3 rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-200/50">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
          <p className="mt-1 text-xs text-slate-500">
            ID môn {cs.subjectId}
            {cs.createdAt ? ` · Gắn khóa ${dayjs(cs.createdAt).format('DD/MM/YYYY')}` : ''}
            {sub?.updatedAt ? ` · Sửa môn ${dayjs(sub.updatedAt).format('DD/MM/YYYY')}` : ''}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-medium',
              cs.isActive !== false
                ? 'border-0 bg-emerald-100 text-emerald-800'
                : 'border-0 bg-slate-200 text-slate-600',
            )}
          >
            {cs.isActive !== false ? 'Đang gán trong khóa' : 'Đã tắt trong khóa'}
          </Badge>
          {canClick && (
            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-sky-700">
              Chi tiết <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </span>
          )}
        </div>
      </div>

      {topic ? (
        <p className="text-sm text-slate-700">
          <span className="text-xs font-semibold text-slate-500">Chủ đề · </span>
          {topic}
        </p>
      ) : null}

      {desc ? <p className="line-clamp-3 text-xs leading-relaxed text-slate-600">{desc}</p> : null}

      <p className="text-xs text-slate-600">
        {sub?.numberOfSession != null ? `${sub.numberOfSession} buổi (theo môn)` : `${sessions.length} buổi mẫu`}
      </p>

      {skillItems.length > 0 ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Sparkles className="h-3.5 w-3.5 text-violet-500" aria-hidden />
            Kỹ năng
          </div>
          <div className="flex flex-wrap gap-1.5">
            {skillItems.slice(0, 12).map((sk) => (
              <span
                key={sk.id}
                className="rounded-lg bg-violet-50 px-2 py-1 text-xs font-medium text-violet-900"
              >
                {sk.name}
              </span>
            ))}
            {skillItems.length > 12 && (
              <span className="self-center text-xs text-slate-400">+{skillItems.length - 12}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Sparkles className="h-3.5 w-3.5 text-violet-500" aria-hidden />
          <span className="font-normal text-slate-400">Chưa gán kỹ năng</span>
        </div>
      )}

      {sessions.length > 0 ? (
        <div className="space-y-2 pt-1">
          <p className="text-xs font-semibold text-slate-500">Buổi học (mẫu)</p>
          <ol className="flex flex-col gap-3">
            {sessions.map((ss, index) => (
              <SessionRow
                key={ss.subjectSessionId}
                sessionNo={ss.sessionNo ?? index + 1}
                title={ss.title ?? '—'}
                duration={ss.duration != null && ss.duration !== '' ? formatTimeSpan(String(ss.duration)) : null}
                description={ss.description?.trim() ?? ''}
                isLast={index === sessions.length - 1}
              />
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );

  if (canClick) {
    return (
      <button
        type="button"
        className="flex w-full text-left transition-opacity hover:opacity-95"
        onClick={() => onSubjectClick?.(subjectId)}
        title="Xem chi tiết môn học"
      >
        {inner}
      </button>
    );
  }

  return <div className="flex w-full">{inner}</div>;
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

function RequestBlock({ req }: { req: CourseRequestSummary }) {
  return (
    <div className="space-y-3 rounded-2xl bg-white px-4 py-3.5 shadow-sm ring-1 ring-slate-200/50">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">
            {req.requestCode} — {req.requestName}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" aria-hidden />
              {req.customerName || '—'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" aria-hidden />
              {req.startDate ? dayjs(req.startDate).format('DD/MM/YYYY') : '—'}
            </span>
            {req.sessionsRequired != null ? (
              <span>
                {req.sessionsRequired} buổi yêu cầu
              </span>
            ) : null}
          </div>
        </div>
        <Badge className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', requestStatusStyle(req.status))}>
          {req.status || '—'}
        </Badge>
      </div>

      {(req.note?.trim() || req.reason?.trim()) && (
        <div className="space-y-2 text-sm text-slate-600">
          {req.note?.trim() ? (
            <p>
              <span className="font-medium text-slate-700">Ghi chú · </span>
              {req.note.trim()}
            </p>
          ) : null}
          {req.reason?.trim() ? (
            <p>
              <span className="font-medium text-slate-700">Lý do · </span>
              {req.reason.trim()}
            </p>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
        {req.approvedAt ? <span>Duyệt {formatDateTime(req.approvedAt)}</span> : null}
        {req.createdAt ? <span>Tạo {formatDateTime(req.createdAt)}</span> : null}
        {req.updatedAt ? <span>Sửa {formatDateTime(req.updatedAt)}</span> : null}
      </div>
    </div>
  );
}
