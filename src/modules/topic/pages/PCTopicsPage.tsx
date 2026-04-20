import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { RotateCcw } from 'lucide-react';
import { Modal, message } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { MANAGER_ROLE_ID } from '@/constants/role';
import { DataTable } from '@/shared/components/common/DataTable';
import HoverSearch from '@/shared/components/ui/search';
import { Button } from '@/shared/components/ui/button';
import topicApi from '@/modules/topic/api/topicApi';
import type { TopicListItem } from '@/modules/topic/topic';

function TopicDetailBody({ t }: { t: TopicListItem }) {
  const subjectsCount = t.subjects?.length ?? 0;
  const eventsCount = t.events?.length ?? t.eventSessionTopics?.length ?? 0;
  const groupsCount = t.teams?.length ?? t.teamTopics?.length ?? 0;
  return (
    <div className="space-y-2">
      <div>
        <div className="text-xs text-gray-500">Tên chủ đề</div>
        <div className="text-sm font-medium">{t.topicName || '—'}</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">Mô tả</div>
        <div className="text-sm">{t.description || '—'}</div>
      </div>
      <div className="grid grid-cols-3 gap-3 pt-2">
        <div className="rounded-md border p-2">
          <div className="text-xs text-gray-500">Môn học</div>
          <div className="text-sm font-medium">{subjectsCount}</div>
        </div>
        <div className="rounded-md border p-2">
          <div className="text-xs text-gray-500">Sự kiện</div>
          <div className="text-sm font-medium">{eventsCount}</div>
        </div>
        <div className="rounded-md border p-2">
          <div className="text-xs text-gray-500">Nhóm</div>
          <div className="text-sm font-medium">{groupsCount}</div>
        </div>
      </div>
      <div className="pt-2">
        <div className="text-xs text-gray-500">Trạng thái</div>
        <div className="text-sm">{t.isActive ? 'Đang hoạt động' : 'Vô hiệu hóa'}</div>
      </div>
    </div>
  );
}

export default function PCTopicsPage() {
  const { user } = useAuth();
  const activeOnly = Number(user?.role ?? 0) !== MANAGER_ROLE_ID;
  const [data, setData] = useState<TopicListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 10;
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');

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
        header: 'TÊN CHỦ ĐỀ',
        cell: ({ row }) => <div className="font-medium text-[#1a7a99] truncate">{row.original.topicName || '—'}</div>,
      },
      {
        accessorKey: 'description',
        header: 'MÔ TẢ',
        cell: ({ row }) => (
          <div className="text-sm text-gray-700 truncate">{row.original.description?.trim() || '—'}</div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'NGÀY TẠO',
        cell: ({ row }) => (row.original.createdAt ? dayjs(row.original.createdAt).format('DD/MM/YYYY HH:mm') : '—'),
      },
    ],
    [],
  );

  return (
    <div className="p-6 pl-8 app-page-bg flex flex-col gap-2 min-h-0 overflow-hidden" style={{ height: 'var(--content-height, 100vh)' }}>
      <div className="shrink-0 bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-semibold text-[#1a7a99]">Quản lý chủ đề</h2>
        <p className="text-xs text-gray-500">Xem danh sách chủ đề trong hệ thống</p>
      </div>

      <div className="shrink-0 px-2 py-1 flex flex-wrap justify-end gap-3">
        <HoverSearch value={search} onChange={setSearch} placeholder="Tìm theo tên chủ đề..." />
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

      <div className="relative flex w-full min-w-0 flex-1 min-h-0 flex-col bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/60">
            <span className="text-sm text-slate-500">Đang tải...</span>
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

      <Modal
        title={detailTopic ? `Chủ đề #${detailTopic.topicId}` : 'Chi tiết chủ đề'}
        open={detailOpen}
        onCancel={closeDetailFromUrl}
        footer={null}
        destroyOnClose
      >
        {detailLoading && !detailTopic ? (
          <div className="text-sm text-gray-500">Đang tải chi tiết...</div>
        ) : detailTopic ? (
          <TopicDetailBody t={detailTopic} />
        ) : (
          <div className="text-sm text-gray-500">Không có dữ liệu.</div>
        )}
      </Modal>
    </div>
  );
}
