import { useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import dayjs from 'dayjs';
import { Skeleton } from 'antd';
import {
  BookOpen,
  Calendar,
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

  const sessionCount = detailSubject
    ? String(detailSubject.numberOfSession ?? detailSubject.subjectSessions?.length ?? 0)
    : '—';
  const topicLabel =
    detailSubject?.topicName?.trim() ||
    (detailSubject?.topicId != null ? `Chủ đề #${detailSubject.topicId}` : '—');

  const activeSkills = detailSubject != null
    ? (detailSubject.subjectSkills ?? []).filter((ss) => ss?.isActive === undefined ? true : ss.isActive === true)
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
          'border-l border-slate-200 bg-white shadow-2xl',
          'translate-x-0 transition-transform duration-300 ease-out',
        )}
      >
        <div className="flex h-full w-full min-w-0 flex-col overflow-hidden">
          {/* ── HEADER ── */}
          <header className="w-full shrink-0 border-b border-slate-200 bg-white">
            {detailLoading && !detailSubject ? (
              <div className="space-y-3 px-5 py-4 pr-10">
                <Skeleton active title={{ width: '60%' }} paragraph={{ rows: 1 }} />
              </div>
            ) : detailSubject ? (
              <>
                <div className="flex w-full items-start justify-between gap-3 px-5 pb-3 pt-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-semibold text-black">
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
                    <p className="text-sm text-[#2197C0]">{detailSubject.subjectCode || '—'}</p>
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
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2197C0]">Chủ đề</p>
                    <p className="mt-0.5 text-sm font-medium text-black">{topicLabel}</p>
                  </div>
                  <div className="min-w-0 flex-1 px-5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2197C0]">Số buổi</p>
                    <p className="mt-0.5 text-sm font-medium text-black">{sessionCount}</p>
                  </div>
                  <div className="min-w-0 flex-1 px-5 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#2197C0]">Số khóa dùng</p>
                    <p className="mt-0.5 text-sm font-medium text-black">{courseCount > 0 ? courseCount : '—'}</p>
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
            {detailLoading && detailSubject && (
              <div className="pointer-events-none absolute inset-0 z-10 bg-white/45" aria-hidden />
            )}

            {detailLoading && !detailSubject ? (
              <div className="space-y-4">
                <Skeleton active paragraph={{ rows: 4 }} />
                <Skeleton active paragraph={{ rows: 6 }} />
              </div>
            ) : detailSubject ? (
              <div className="space-y-4">

                {/* Thông tin chung */}
                <Section icon={Hash} title="Thông tin chung">
                  <div className="pl-4 grid grid-cols-2">
                    <MetaRow label="Subject ID" value={String(detailSubject.subjectId)} className="pr-4 py-1.5" />
                    <MetaRow label="Ngày tạo" value={formatDateTime(detailSubject.createdAt)} className="pl-4 py-1.5" />
                    <MetaRow label="Cập nhật lần cuối" value={formatDateTime(detailSubject.updatedAt)} className="pr-4 py-1.5" />
                    <MetaRow label="Số buổi (theo cấu hình)" value={String(detailSubject.numberOfSession ?? '—')} className="pl-4 py-1.5" />
                  </div>
                </Section>

                {/* Mô tả */}
                <Section icon={FileText} title="Mô tả">
                  <div className="pl-4">
                    <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                      {detailSubject.description?.trim() ? detailSubject.description : 'Chưa có mô tả.'}
                    </p>
                  </div>
                </Section>

                {/* Khóa học */}
                {courseCount > 0 && (
                  <Section icon={Link2} title="Khóa học đang sử dụng môn này">
                    <div className="pl-4 divide-y divide-slate-200">
                      {courseLinks.map((cs) => (
                        <div key={`${cs.courseId}-${cs.subjectId}`} className="py-1.5">
                          <p className="text-sm font-medium text-black">
                            {cs.courseName?.trim() || cs.course?.courseName?.trim() || `Khóa #${cs.courseId}`}
                          </p>
                          {cs.createdAt ? (
                            <p className="text-xs text-slate-500">Gắn {dayjs(cs.createdAt).format('DD/MM/YYYY')}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                {/* Kỹ năng */}
                <Section icon={Sparkles} title="Kỹ năng liên quan">
                  {activeSkills.length > 0 ? (
                    <div className="pl-4 flex flex-wrap gap-1.5 pt-1">
                      {activeSkills.map((ss) => (
                        <Badge
                          key={`${ss.subjectId}-${ss.skillId}`}
                          className="rounded-full border-0 bg-violet-50 text-violet-800 text-xs font-medium"
                        >
                          {skillDisplayName(ss)}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="pl-4 py-1">
                      <p className="text-sm text-slate-500">Chưa gán kỹ năng cho môn học này.</p>
                    </div>
                  )}
                </Section>

                {/* Buổi học — giữ timeline */}
                <Section icon={Layers} title="Buổi học">
                  {sortedSessions.length > 0 ? (
                    <ol className="pl-4 flex flex-col gap-0">
                      {sortedSessions.map((ss, index) => (
                        <SessionRow
                          key={ss.subjectSessionId ?? index}
                          sessionNo={ss.sessionNo ?? index + 1}
                          title={ss.title ?? '—'}
                          duration={ss.duration != null && ss.duration !== '' ? formatTimeSpan(String(ss.duration)) : null}
                          description={ss.description?.trim() ?? ''}
                          isLast={index === sortedSessions.length - 1}
                        />
                      ))}
                    </ol>
                  ) : (
                    <div className="pl-4 py-1">
                      <p className="text-sm text-slate-500">Chưa có danh sách các buổi.</p>
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
                        {relatedRequests.map((req) => (
                          <RelatedRequestBlock key={req.requestId} req={req} />
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

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
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

function MetaRow({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn('py-1.5', className)}>
      <div className="text-xs font-medium text-[#2197C0]">{label}</div>
      <div className="mt-0.5 break-words text-sm text-black">{value}</div>
    </div>
  );
}

function SessionRow({
  sessionNo, title, duration, description, isLast,
}: {
  sessionNo: number; title: string; duration: string | null; description: string; isLast: boolean;
}) {
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
          {sessionNo}
        </div>
      </div>
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
        {description ? <p className="text-xs leading-relaxed text-slate-600">{description}</p> : null}
      </div>
    </li>
  );
}

function RelatedRequestBlock({ req }: { req: SubjectRequestSummary }) {
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
      </div>
    </div>
  );
}

// Unused but kept for type compatibility
const _unused = { BookOpen, GraduationCap };
void _unused;
