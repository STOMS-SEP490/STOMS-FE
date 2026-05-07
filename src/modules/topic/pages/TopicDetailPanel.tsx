import { useEffect, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Skeleton, message } from 'antd';
import { BookOpen, CalendarClock, Hash, Users, X } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';
import topicApi from '../api/topicApi';
import type { TopicListItem } from '../topic';

type Props = {
  open: boolean;
  onClose: () => void;
  topicId: number | null;
};

function formatDateTime(date?: string | null) {
  if (!date) return '—';
  return new Date(date).toLocaleString('vi-VN');
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

function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="py-1.5">
      <div className="text-xs font-medium text-[#2197C0]">{label}</div>
      <div className="mt-0.5 break-words text-sm text-black">{value}</div>
    </div>
  );
}

export default function TopicDetailPanel({ open, onClose, topicId }: Props) {
  const [detail, setDetail] = useState<TopicListItem | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || topicId == null) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    topicApi
      .getById(topicId)
      .then((res) => { if (!cancelled) setDetail(res); })
      .catch(() => {
        if (!cancelled) {
          message.error('Không tải được chi tiết chủ đề');
          setDetail(null);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, topicId]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 h-full bg-black/35" onClick={onClose} aria-hidden />

      <div className={cn(
        'fixed right-0 top-0 z-50 h-full w-[680px] max-w-[96vw]',
        'border-l border-slate-200 bg-white shadow-2xl',
        'translate-x-0 transition-transform duration-300 ease-out',
      )}>
        <div className="flex h-full w-full min-w-0 flex-col overflow-hidden">

          {/* HEADER */}
          <header className="w-full shrink-0 border-b border-slate-200 bg-white">
            {loading && !detail ? (
              <div className="px-6 py-5 pr-14">
                <Skeleton active title={{ width: '55%' }} paragraph={{ rows: 1 }} />
              </div>
            ) : detail ? (
              <>
                <div className="px-6 pt-5 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-widest text-slate-400">CHI TIẾT CHỦ ĐỀ</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-[#1a7a99]">{detail.topicName}</h2>
                        <Badge className={cn(
                          'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium border-0',
                          detail.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700',
                        )}>
                          {detail.isActive ? 'Đang hoạt động' : 'Vô hiệu hóa'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Chủ đề #{detail.topicId}</p>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      aria-label="Đóng"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Meta bar */}
                <div className="grid w-full grid-cols-2 divide-x divide-slate-200 border-t border-slate-200 bg-slate-50">
                  <div className="px-5 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Ngày tạo</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">{formatDateTime(detail.createdAt)}</p>
                  </div>
                  
                  <div className="px-5 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Trạng thái</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">
                      {detail.isActive ? 'Đang hoạt động' : 'Vô hiệu hóa'}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-start justify-between gap-3 px-6 py-5">
                <p className="text-sm text-slate-500">Không có dữ liệu.</p>
                <button type="button" onClick={onClose} className="shrink-0 p-1.5 text-slate-400 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </header>

          {/* BODY */}
          <div className="relative min-h-0 w-full flex-1 overflow-y-auto bg-white px-5 py-4">
            {loading && detail && (
              <div className="pointer-events-none absolute inset-0 z-10 bg-white/45" aria-hidden />
            )}

            {loading && !detail ? (
              <div className="space-y-4">
                <Skeleton active paragraph={{ rows: 4 }} />
                <Skeleton active paragraph={{ rows: 6 }} />
              </div>
            ) : detail ? (
              <div className="space-y-4">

                {/* Thông tin chung */}
                <Section icon={Hash} title="Thông tin chung">
                  <div className="pl-4 ">
                    <MetaRow label="Tên chủ đề" value={detail.topicName || '—'} />
                    <MetaRow
                      label="Trạng thái"
                      value={
                        detail.isActive ? (
                          <Badge className="border-0 bg-emerald-100 text-emerald-800">Hoạt động</Badge>
                        ) : (
                          <Badge className="border-0 bg-orange-100 text-orange-700">Ngừng hoạt động</Badge>
                        )
                      }
                    />
                    <MetaRow label="Ngày tạo" value={formatDateTime(detail.createdAt)} />
                    <MetaRow label="Mô tả" value={detail.description || '—'} />
                  </div>
                </Section>

                {/* Sự kiện */}
                <Section icon={CalendarClock} title={`Sự kiện (${detail.events?.length ?? 0})`}>
                  {!detail.events || detail.events.length === 0 ? (
                    <div className="pl-4 py-2">
                      <p className="text-sm text-slate-500">Chưa có sự kiện nào.</p>
                    </div>
                  ) : (
                    <div className="pl-4 divide-y divide-slate-200">
                      {detail.events.map((ev) => (
                        <div key={ev.eventId} className="py-2.5 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-[#2197C0]/10 px-1.5 py-0.5 text-xs font-semibold text-[#2197C0]">
                              {ev.eventCode}
                            </span>
                            <Badge className={cn(
                              'border-0 text-xs',
                              ev.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600',
                            )}>
                              {ev.isActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                            </Badge>
                          </div>
                          <p className="text-sm font-semibold text-black">{ev.eventName}</p>
                          {ev.eventSessions && ev.eventSessions.length > 0 && (
                            <div className="flex flex-col gap-0.5">
                              {ev.eventSessions.map((s) => (
                                <span key={s.eventSessionNo} className="text-xs text-slate-500">
                                  Buổi {s.eventSessionNo}: {s.title}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Nhóm */}
                <Section icon={Users} title={`Nhóm (${detail.teams?.length ?? 0})`}>
                  {!detail.teams || detail.teams.length === 0 ? (
                    <div className="pl-4 py-2">
                      <p className="text-sm text-slate-500">Chưa có nhóm nào.</p>
                    </div>
                  ) : (
                    <div className="pl-4 divide-y divide-slate-200">
                      {detail.teams.map((team) => (
                        <div key={team.teamId} className="py-2.5 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-black">{team.teamName}</span>
                            <Badge className={cn(
                              'border-0 text-xs',
                              team.teamTopicIsActive ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600',
                            )}>
                              {team.teamTopicIsActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                            </Badge>
                          </div>
                          {team.leaderMember && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 shrink-0">Trưởng nhóm:</span>
                              <img
                                src={team.leaderMember.avatarUrl?.trim() || '/img/ava.png'}
                                alt=""
                                className="h-5 w-5 rounded-full object-cover"
                              />
                              <span className="text-xs text-slate-600">
                                {team.leaderMember.fullName}
                                <span className="text-slate-400"> · {team.leaderMember.email}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Môn học */}
                <Section icon={BookOpen} title={`Môn học (${detail.subjects?.length ?? 0})`}>
                  {!detail.subjects || detail.subjects.length === 0 ? (
                    <div className="pl-4 py-2">
                      <p className="text-sm text-slate-500">Chưa có môn học nào.</p>
                    </div>
                  ) : (
                    <div className="pl-4 divide-y divide-slate-200">
                      {detail.subjects.map((sub) => (
                        <div key={sub.subjectId} className="py-2 flex items-center gap-2">
                          {sub.subjectCode && (
                            <span className="shrink-0 rounded bg-[#2197C0]/10 px-1.5 py-0.5 text-xs font-semibold text-[#2197C0]">
                              {sub.subjectCode}
                            </span>
                          )}
                          <p className="text-sm font-medium text-black">
                            {sub.subjectName || `#${sub.subjectId}`}
                          </p>
                        </div>
                      ))}
                    </div>
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
