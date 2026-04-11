import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { Modal, message } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { MANAGER_ROLE_ID } from '@/constants/role';
import { DataTable } from '@/shared/components/common/DataTable';
import { TableTextAction } from '@/shared/components/common/TableTextAction';
import HoverSearch from '@/shared/components/ui/search';
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
        accessorKey: 'topicId',
        header: 'MÃ CHỦ ĐỀ',
        cell: ({ row }) => <span className="font-semibold text-gray-900">{row.original.topicId}</span>,
      },
      {
        accessorKey: 'topicName',
        header: 'TÊN CHỦ ĐỀ',
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate">{row.original.topicName}</div>
            <div className="text-xs text-gray-500 truncate">{row.original.description?.trim() || '—'}</div>
          </div>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'NGÀY TẠO',
        cell: ({ row }) => (row.original.createdAt ? dayjs(row.original.createdAt).format('DD/MM/YYYY HH:mm') : '—'),
      },
      {
        id: 'actions',
        header: 'THAO TÁC',
        cell: ({ row }) => <TableTextAction onClick={() => void openDetailById(row.original.topicId)} />,
      },
    ],
    [],
  );

  return (
    <div className="p-6 bg-slate-50 flex flex-col gap-2 min-h-0 overflow-hidden" style={{ height: 'var(--content-height, 100vh)' }}>
      <div className="shrink-0 bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-semibold text-black">Quản lý chủ đề</h2>
        <p className="text-xs text-gray-500">Xem danh sách chủ đề trong hệ thống</p>
      </div>

      <div className="shrink-0 px-2 py-1 flex justify-end">
        <HoverSearch value={search} onChange={setSearch} placeholder="Tìm theo tên chủ đề..." />
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
