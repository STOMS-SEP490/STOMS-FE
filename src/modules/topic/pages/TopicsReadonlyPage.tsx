import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { Drawer, message, Skeleton } from 'antd';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  CalendarClock,
  FileText,
  GraduationCap,
  Hash,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { MANAGER_ROLE_ID } from '@/constants/role';
import { DataTable } from '@/shared/components/common/DataTable';
import { TableTextAction } from '@/shared/components/common/TableTextAction';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';
import topicApi from '@/modules/topic/api/topicApi';
import type { TopicListItem } from '@/modules/topic/topic';
import type { CoursesReadonlyOutletContext } from '@/modules/course/pages/coursesReadonlyOutletContext';

export default function TopicsReadonlyPage() {
  const { user } = useAuth();
  const activeOnly = Number(user?.role ?? 0) !== MANAGER_ROLE_ID;
  const { topicSearch } = useOutletContext<CoursesReadonlyOutletContext>();
  const [data, setData] = useState<TopicListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 6;
  const [totalItems, setTotalItems] = useState(0);

  const [searchParams, setSearchParams] = useSearchParams();
  const openDetailFromUrl = searchParams.get('openDetail');
  const topicIdFromUrl = searchParams.get('topicId');
  const skipNextAutoOpenRef = useRef(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTopic, setDetailTopic] = useState<TopicListItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const lastOpenedTopicIdRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    setPageNumber(1);
  }, [topicSearch]);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const res = await topicApi.getTopics({
        pageNumber,
        pageSize,
        topicName: topicSearch.trim() || undefined,
        ...(activeOnly ? { IsActive: true } : {}),
      });
      setData(res.items ?? []);
      setTotalItems(res.totalItems ?? 0);
    } catch {
      message.error('Không tải được danh sách chủ đề');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTopics();
  }, [pageNumber, topicSearch, activeOnly]);

  const closeDetailFromUrl = () => {
    if (openDetailFromUrl === '1') {
      skipNextAutoOpenRef.current = true;
    }
    setDetailOpen(false);
    setDetailTopic(null);
    setDetailLoading(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openDetail');
      next.delete('topicId');
      return next;
    });
  };

  const openDetailById = async (id: number) => {
    try {
      setDetailLoading(true);
      const full = await topicApi.getById(id);
      setDetailTopic(full);
      lastOpenedTopicIdRef.current = id;
      setDetailOpen(true);
    } catch {
      message.error('Không tải được chi tiết chủ đề');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (openDetailFromUrl !== '1') return;
    if (!topicIdFromUrl) return;
    if (skipNextAutoOpenRef.current) {
      skipNextAutoOpenRef.current = false;
      return;
    }

    const id = Number(topicIdFromUrl);
    if (!id || Number.isNaN(id)) return;
    if (detailOpen && lastOpenedTopicIdRef.current === id) return;

    void openDetailById(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDetailFromUrl, topicIdFromUrl]);

  const columns = useMemo<ColumnDef<TopicListItem>[]>(
    () => [
      {
        accessorKey: 'topicName',
        header: 'Tên chủ đề',
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate">{row.original.topicName}</div>
            <div className="text-xs text-gray-500 truncate">{row.original.description?.trim() || '—'}</div>
          </div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Ngày tạo',
        cell: ({ row }) => (row.original.createdAt ? dayjs(row.original.createdAt).format('DD/MM/YYYY') : '—'),
      },
      {
        id: 'actions',
        header: 'Thao tác',
        cell: ({ row }) => <TableTextAction onClick={() => void openDetailById(row.original.topicId)} />,
      },
    ],
    [],
  );

  const subjectsCount = detailTopic?.subjects?.length ?? 0;
  const eventsCount = detailTopic?.events?.length ?? detailTopic?.eventSessionTopics?.length ?? 0;
  const teamsCount = detailTopic?.teams?.length ?? detailTopic?.teamTopics?.length ?? 0;

  return (
    <div className="relative flex w-full min-w-0 flex-1 min-h-0 flex-col">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/60">
          <span className="text-sm text-slate-500">Dang tai...</span>
        </div>
      )}
      <DataTable
        columns={columns}
        data={data}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={(page) => setPageNumber(page)}
        fillHeight
        comfortable
      />

      <Drawer
        open={detailOpen}
        onClose={closeDetailFromUrl}
        placement="right"
        width="min(720px, 96vw)"
        closable={false}
        title={null}
        styles={{ body: { padding: 0 } }}
      >
        {detailLoading && !detailTopic ? (
          <div className="p-5">
            <Skeleton active title={{ width: '60%' }} paragraph={{ rows: 8 }} />
          </div>
        ) : detailTopic ? (
          <div className="bg-slate-50/70">
            <header className="border-b border-slate-100 bg-white px-5 pb-4 pt-5">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold tracking-tight text-slate-900">
                      {detailTopic.topicName || '—'}
                    </h2>
                    <Badge
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
                        detailTopic.isActive
                          ? 'border-0 bg-emerald-100 text-emerald-800'
                          : 'border-0 bg-slate-200 text-slate-700',
                      )}
                    >
                      {detailTopic.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                    </Badge>
                  </div>
                  <button
                    type="button"
                    onClick={closeDetailFromUrl}
                    className="shrink-0 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Đóng"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <HeaderChip icon={Hash} label={`TP-${detailTopic.topicId}`} title="Mã chủ đề" />
                  <HeaderChip icon={GraduationCap} label={`${subjectsCount} môn`} title="Số môn học" />
                  <HeaderChip icon={Sparkles} label={`${eventsCount} sự kiện`} title="Số sự kiện" />
                  <HeaderChip icon={Users} label={`${teamsCount} nhóm`} title="Số nhóm" />
                </div>
              </div>
            </header>

            <div className="space-y-8 px-5 py-5">
              <Section icon={CalendarClock} title="Thông tin chung">
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetaTile icon={Hash} label="Topic ID" value={String(detailTopic.topicId)} />
                  <MetaTile
                    icon={CalendarClock}
                    label="Ngày tạo"
                    value={detailTopic.createdAt ? dayjs(detailTopic.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
                  />
                  <MetaTile
                    icon={ShieldCheck}
                    label="Trạng thái"
                    value={detailTopic.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                  />
                </div>
              </Section>

              <Section icon={FileText} title="Mô tả">
                <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                  {detailTopic.description?.trim() ? detailTopic.description : 'Chưa có mô tả.'}
                </p>
              </Section>

              <Section icon={GraduationCap} title="Môn học liên quan">
                {detailTopic.subjects && detailTopic.subjects.length > 0 ? (
                  <div className="space-y-2">
                    {detailTopic.subjects.map((s) => (
                      <div
                        key={s.subjectId}
                        className="rounded-xl bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-slate-200/60"
                      >
                        <div className="text-sm font-medium text-slate-900">
                          {s.subjectCode || `SUB-${s.subjectId}`} — {s.subjectName || '—'}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {s.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Chưa có môn học liên quan.</p>
                )}
              </Section>

              <Section icon={Sparkles} title="Sự kiện liên quan">
                {detailTopic.events && detailTopic.events.length > 0 ? (
                  <div className="space-y-2">
                    {detailTopic.events.map((ev) => (
                      <div
                        key={ev.eventId}
                        className="rounded-xl bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-slate-200/60"
                      >
                        <div className="text-sm font-medium text-slate-900">
                          {ev.eventCode || `EV-${ev.eventId}`} — {ev.eventName || '—'}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {ev.eventSessions?.length ?? 0} phiên · {ev.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Chưa có sự kiện liên quan.</p>
                )}
              </Section>

              <Section icon={Users} title="Nhóm liên quan">
                {detailTopic.teams && detailTopic.teams.length > 0 ? (
                  <div className="space-y-2">
                    {detailTopic.teams.map((t) => (
                      <div
                        key={t.teamId}
                        className="rounded-xl bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-slate-200/60"
                      >
                        <div className="text-sm font-medium text-slate-900">{t.teamName || `Team #${t.teamId}`}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Trưởng nhóm: {t.leaderMember?.fullName || t.leaderMember?.email || '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Chưa có nhóm liên quan.</p>
                )}
              </Section>

            </div>
          </div>
        ) : (
          <div className="p-5 text-sm text-gray-500">Không có dữ liệu.</div>
        )}
      </Drawer>
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
      className="inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1 text-xs text-slate-700 shadow-sm ring-1 ring-slate-200/80"
    >
      <Icon className="h-3.5 w-3.5 text-[#2197C0]" aria-hidden />
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
