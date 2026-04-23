import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { Drawer, message, Skeleton } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, CalendarClock, Hash, RotateCcw, Users, X } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';
import { MANAGER_ROLE_ID } from '@/constants/role';
import { DataTable } from '@/shared/components/common/DataTable';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
import { cn } from '@/shared/lib/utils';
import topicApi from '@/modules/topic/api/topicApi';
import type { TopicListItem } from '@/modules/topic/topic';

export default function TopicsReadonlyPage() {
  const { user } = useAuth();
  const activeOnly = Number(user?.role ?? 0) !== MANAGER_ROLE_ID;
  const [search, setSearch] = useState('');
  const [data, setData] = useState<TopicListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 10;
  const [totalItems, setTotalItems] = useState(0);

  const [searchParams, setSearchParams] = useSearchParams();
  const openDetailFromUrl = searchParams.get('openDetail');
  const topicIdFromUrl = searchParams.get('topicId');
  const skipNextAutoOpenRef = useRef(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTopic, setDetailTopic] = useState<TopicListItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const lastOpenedTopicIdRef = useRef<number | null>(null);

  useEffect(() => {
    setPageNumber(1);
  }, [search]);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const res = await topicApi.getTopics({
        pageNumber,
        pageSize,
        topicName: search.trim() || undefined,
        IsActive: activeOnly ? true : undefined,
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
  }, [pageNumber, search, activeOnly]);

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
        cell: ({ row }) => <div className="font-medium text-[#1a7a99] truncate">{row.original.topicName || '—'}</div>,
      },
      {
        accessorKey: 'description',
        header: 'Mô tả',
        cell: ({ row }) => (
          <div className="text-sm text-gray-700 truncate">{row.original.description?.trim() || '—'}</div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Ngày tạo',
        cell: ({ row }) => (row.original.createdAt ? dayjs(row.original.createdAt).format('DD/MM/YYYY') : '—'),
      },
    ],
    [],
  );

  return (
    <div className="relative flex min-h-[var(--content-height)] flex-col gap-2 app-page-bg p-6 pl-8 pb-8">
      <div className="flex shrink-0 flex-col gap-1 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
        <h2 className="text-xl font-semibold text-[#1a7a99]">Danh sách chủ đề</h2>
        <p className="text-xs text-gray-500">Xem thông tin các chủ đề trong hệ thống</p>
      </div>

      <div className="shrink-0 px-2 py-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <HoverSearch
            value={search}
            onChange={(v) => setSearch(v)}
            placeholder="Tìm theo tên chủ đề..."
          />
          <Button
            variant="secondary"
            className="bg-white h-9 border-slate-200"
            type="button"
            onClick={() => {
              setSearch('');
              setPageNumber(1);
            }}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
          onRowClick={(row) => {
            void openDetailById(row.topicId);
          }}
          fillHeight
          comfortable
        />
      </div>

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
          <div className="flex h-full flex-col">
            {/* HEADER */}
            <header className="w-full shrink-0 border-b border-slate-200 bg-white">
              <div className="px-6 pt-5 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-widest text-slate-400">CHI TIẾT CHỦ ĐỀ</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-[#1a7a99]">{detailTopic.topicName}</h2>
                      <Badge className={cn(
                        'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium border-0',
                        detailTopic.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700',
                      )}>
                        {detailTopic.isActive ? 'Đang hoạt động' : 'Vô hiệu hóa'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">Chủ đề #{detailTopic.topicId}</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeDetailFromUrl}
                    className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    aria-label="Đóng"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Meta bar */}
              <div className="grid w-full grid-cols-3 divide-x divide-slate-200 border-t border-slate-200 bg-slate-50">
                <div className="px-5 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Ngày tạo</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {detailTopic.createdAt ? new Date(detailTopic.createdAt).toLocaleString('vi-VN') : '—'}
                  </p>
                </div>
                <div className="px-5 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Cập nhật lần cuối</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {detailTopic.updatedAt ? new Date(detailTopic.updatedAt).toLocaleString('vi-VN') : '—'}
                  </p>
                </div>
                <div className="px-5 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Trạng thái</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-900">
                    {detailTopic.isActive ? 'Đang hoạt động' : 'Vô hiệu hóa'}
                  </p>
                </div>
              </div>
            </header>

            {/* BODY */}
            <div className="relative min-h-0 w-full flex-1 overflow-y-auto bg-white px-5 py-4">
              <div className="space-y-4">

                {/* Thông tin chung */}
                <section className="space-y-2">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                    <Hash className="h-4 w-4 shrink-0 text-[#2197C0]" strokeWidth={2} aria-hidden />
                    <h3 className="text-sm font-semibold text-black">Thông tin chung</h3>
                  </div>
                  <div className="pl-4 divide-y divide-slate-200">
                    <MetaRow label="Tên chủ đề" value={detailTopic.topicName || '—'} />
                    <MetaRow
                      label="Trạng thái"
                      value={
                        detailTopic.isActive ? (
                          <Badge className="border-0 bg-emerald-100 text-emerald-800">Hoạt động</Badge>
                        ) : (
                          <Badge className="border-0 bg-orange-100 text-orange-700">Ngừng hoạt động</Badge>
                        )
                      }
                    />
                    <MetaRow 
                      label="Ngày tạo" 
                      value={detailTopic.createdAt ? new Date(detailTopic.createdAt).toLocaleString('vi-VN') : '—'} 
                    />
                    <MetaRow 
                      label="Cập nhật lần cuối" 
                      value={detailTopic.updatedAt ? new Date(detailTopic.updatedAt).toLocaleString('vi-VN') : '—'} 
                    />
                    <MetaRow label="Mô tả" value={detailTopic.description || '—'} />
                  </div>
                </section>

                {/* Sự kiện */}
                <section className="space-y-2">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                    <CalendarClock className="h-4 w-4 shrink-0 text-[#2197C0]" strokeWidth={2} aria-hidden />
                    <h3 className="text-sm font-semibold text-black">Sự kiện ({detailTopic.events?.length ?? 0})</h3>
                  </div>
                  {!detailTopic.events || detailTopic.events.length === 0 ? (
                    <div className="pl-4 py-2">
                      <p className="text-sm text-slate-500">Chưa có sự kiện nào.</p>
                    </div>
                  ) : (
                    <div className="pl-4 divide-y divide-slate-200">
                      {detailTopic.events.map((ev) => (
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
                </section>

                {/* Nhóm */}
                <section className="space-y-2">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                    <Users className="h-4 w-4 shrink-0 text-[#2197C0]" strokeWidth={2} aria-hidden />
                    <h3 className="text-sm font-semibold text-black">Nhóm ({detailTopic.teams?.length ?? 0})</h3>
                  </div>
                  {!detailTopic.teams || detailTopic.teams.length === 0 ? (
                    <div className="pl-4 py-2">
                      <p className="text-sm text-slate-500">Chưa có nhóm nào.</p>
                    </div>
                  ) : (
                    <div className="pl-4 divide-y divide-slate-200">
                      {detailTopic.teams.map((team) => (
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
                </section>

                {/* Môn học */}
                <section className="space-y-2">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
                    <BookOpen className="h-4 w-4 shrink-0 text-[#2197C0]" strokeWidth={2} aria-hidden />
                    <h3 className="text-sm font-semibold text-black">Môn học ({detailTopic.subjects?.length ?? 0})</h3>
                  </div>
                  {!detailTopic.subjects || detailTopic.subjects.length === 0 ? (
                    <div className="pl-4 py-2">
                      <p className="text-sm text-slate-500">Chưa có môn học nào.</p>
                    </div>
                  ) : (
                    <div className="pl-4 divide-y divide-slate-200">
                      {detailTopic.subjects.map((sub) => (
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
                </section>

              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 text-sm text-gray-500">Không có dữ liệu.</div>
        )}
      </Drawer>
    </div>
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
