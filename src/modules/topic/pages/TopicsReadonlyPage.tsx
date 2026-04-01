import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { Drawer, message } from 'antd';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { DataTable } from '@/shared/components/common/DataTable';
import { TableTextAction } from '@/shared/components/common/TableTextAction';
import { Badge } from '@/shared/components/ui/badge';
import topicApi from '@/modules/topic/api/topicApi';
import type { TopicListItem } from '@/modules/topic/topic';
import type { CoursesReadonlyOutletContext } from '@/modules/course/pages/coursesReadonlyOutletContext';

export default function TopicsReadonlyPage() {
  const { topicSearch, setTopicSearch } = useOutletContext<CoursesReadonlyOutletContext>();
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
  }, [pageNumber, topicSearch]);

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
        header: 'Mã chủ đề',
        cell: ({ row }) => <span className="font-semibold text-gray-900">TP-{row.original.topicId}</span>,
      },
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
        accessorKey: 'isActive',
        header: 'Trạng thái',
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge className="bg-green-100 text-green-700">Hoạt động</Badge>
          ) : (
            <Badge className="bg-orange-100 text-orange-600">Ngừng hoạt động</Badge>
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
        width={720}
        title={detailTopic ? `Chu de TP-${detailTopic.topicId}` : 'Chi tiet chu de'}
      >
        {detailLoading && !detailTopic ? (
          <div className="text-sm text-gray-500">Dang tai chi tiet...</div>
        ) : detailTopic ? (
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            <div>
              <div className="text-xs text-gray-500">Ten chu de</div>
              <div className="text-sm font-medium">{detailTopic.topicName || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Mo ta</div>
              <div className="text-sm">{detailTopic.description || '—'}</div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="rounded-md border p-2">
                <div className="text-xs text-gray-500">Mon hoc</div>
                <div className="text-sm font-medium">{subjectsCount}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-gray-500">Su kien</div>
                <div className="text-sm font-medium">{eventsCount}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-gray-500">Nhom</div>
                <div className="text-sm font-medium">{teamsCount}</div>
              </div>
            </div>
            <div className="pt-2">
              <div className="text-xs text-gray-500">Trang thai</div>
              <div className="text-sm">{detailTopic.isActive ? 'Dang hoat dong' : 'Vo hieu hoa'}</div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">Khong co du lieu.</div>
        )}
      </Drawer>
    </div>
  );
}
