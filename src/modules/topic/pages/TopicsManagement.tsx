import { DataTable } from '@/shared/components/common/DataTable';
import { Button } from '@/shared/components/ui/button';
import { Dialog } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import HoverSearch from '@/shared/components/ui/search';
import { message, Modal } from 'antd';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil, Plus, Power, PowerOff } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import topicApi from '../api/topicApi';
import { useTopics } from '../hooks/useTopics';
import type { TopicListItem, TopicUpsertPayload } from '../topic';

function TopicDetailBody({ t }: { t: TopicListItem }) {
  const subjectsCount = t.subjects?.length ?? 0;
  // BE GET by id trả `events` / `teams`; fallback tên cũ nếu có
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

export default function TopicsManagement() {
  const { data, loading, search, setSearch, pageNumber, pageSize, totalItems, setPageNumber, refetch } =
    useTopics();

  const [searchParams, setSearchParams] = useSearchParams();
  const openDetailFromUrl = searchParams.get('openDetail');
  const topicIdFromUrl = searchParams.get('topicId');
  const skipNextAutoOpenRef = useRef(false);

  const [openUpsert, setOpenUpsert] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [submitting, setSubmitting] = useState(false);
  const [editingTopic, setEditingTopic] = useState<TopicListItem | null>(null);

  const [topicName, setTopicName] = useState('');
  const [description, setDescription] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTopic, setDetailTopic] = useState<TopicListItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const closeTopicDetail = () => {
    skipNextAutoOpenRef.current = openDetailFromUrl === '1';
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

  const loadTopicDetailById = async (id: number) => {
    try {
      setDetailLoading(true);
      setDetailOpen(true);
      setDetailTopic(null);
      const t = await topicApi.getById(id);
      setDetailTopic(t);
    } catch {
      message.error('Không tải được chi tiết chủ đề');
      setDetailOpen(false);
      setDetailTopic(null);
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

    if (detailOpen && detailTopic?.topicId === id) return;

    void loadTopicDetailById(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDetailFromUrl, topicIdFromUrl, detailOpen, detailTopic?.topicId]);

  const openCreate = () => {
    setMode('create');
    setEditingTopic(null);
    setTopicName('');
    setDescription('');
    setOpenUpsert(true);
  };

  const openEdit = (t: TopicListItem) => {
    setMode('edit');
    setEditingTopic(t);
    setTopicName(t.topicName ?? '');
    setDescription(t.description ?? '');
    setOpenUpsert(true);
  };

  const closeUpsert = () => {
    if (submitting) return;
    setOpenUpsert(false);
  };

  const handleSubmit = async () => {
    const payload: TopicUpsertPayload = {
      topicName: topicName.trim(),
      description: description.trim(),
    };

    if (!payload.topicName) {
      message.warning('Vui lòng nhập tên chủ đề');
      return;
    }

    try {
      setSubmitting(true);
      if (mode === 'create') {
        await topicApi.create(payload);
        message.success('Tạo chủ đề thành công');
      } else {
        if (!editingTopic?.topicId) return;
        await topicApi.update(editingTopic.topicId, payload);
        message.success('Cập nhật chủ đề thành công');
      }
      setOpenUpsert(false);
      await refetch();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Có lỗi xảy ra';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (t: TopicListItem) => {
    Modal.confirm({
      title: t.isActive ? 'Vô hiệu hóa chủ đề?' : 'Kích hoạt chủ đề?',
      content: t.isActive
        ? 'Chủ đề sẽ bị vô hiệu hóa và các liên kết liên quan có thể bị vô hiệu theo.'
        : 'Chủ đề sẽ được kích hoạt lại.',
      okText: t.isActive ? 'Vô hiệu hóa' : 'Kích hoạt',
      cancelText: 'Hủy',
      okButtonProps: { danger: t.isActive },
      onOk: async () => {
        try {
          if (t.isActive) await topicApi.deactivate(t.topicId);
          else await topicApi.activate(t.topicId);
          message.success('Cập nhật trạng thái thành công');
          await refetch();
        } catch (e: any) {
          const msg = e?.response?.data?.message || e?.message || 'Có lỗi xảy ra';
          message.error(msg);
        }
      },
    });
  };

  const handleView = (t: TopicListItem) => {
    void loadTopicDetailById(t.topicId);
  };

  const stats = useMemo(() => {
    const active = data.filter((x) => x.isActive).length;
    const inactive = data.length - active;
    return { active, inactive };
  }, [data]);

  const columns: ColumnDef<TopicListItem>[] = [
    {
      accessorKey: 'topicId',
      header: 'MÃ CHỦ ĐỀ',
      cell: ({ row }) => <div className="text-sm font-medium">{row.original.topicId}</div>,
    },
    {
      accessorKey: 'topicName',
      header: 'TÊN CHỦ ĐỀ',
      cell: ({ row }) => <div className="text-sm font-medium">{row.original.topicName}</div>,
    },
    {
      accessorKey: 'isActive',
      header: 'TRẠNG THÁI',
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.isActive ? (
            <Badge className="bg-green-100 text-green-700">Hoạt động</Badge>
          ) : (
            <Badge className="bg-orange-100 text-orange-600">Ngừng hoạt động</Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'NGÀY TẠO',
      cell: ({ row }) =>
        row.original.createdAt
          ? dayjs(row.original.createdAt).format('DD/MM/YYYY HH:mm')
          : '—',
    },
    {
      id: 'actions',
      header: 'THAO TÁC',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleView(row.original)} title="Xem">
            <Eye className="w-4 h-4 text-gray-800" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)} title="Sửa">
            <Pencil className="w-4 h-4 text-blue-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleToggleActive(row.original)}
            title={row.original.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
          >
            {row.original.isActive ? (
              <PowerOff className="w-4 h-4 text-red-500" />
            ) : (
              <Power className="w-4 h-4 text-green-600" />
            )}
          </Button>
        </div>
      ),
    },
  ];
  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between bg-white px-6 py-4 mb-2 rounded-xl border shadow-sm items-center">
        <div>
          <h2 className="text-xl font-semibold text-black">Quản lý chủ đề</h2>
          <p className="text-xs text-gray-500">Quản lý các chủ đề trong hệ thống</p>
        </div>

        <div className="flex gap-3 items-center">
          <Button
            className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md"
            onClick={openCreate}
          >
            <Plus size={16} />
            Thêm chủ đề
          </Button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-4 mb-2">
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <div className="text-xs text-gray-500">Tổng chủ đề</div>
          <div className="text-2xl font-semibold text-slate-900">{totalItems}</div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <div className="text-xs text-gray-500">Đang hoạt động (trang hiện tại)</div>
          <div className="text-2xl font-semibold text-green-700">{stats.active}</div>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4">
          <div className="text-xs text-gray-500">Vô hiệu hóa (trang hiện tại)</div>
          <div className="text-2xl font-semibold text-slate-900">{stats.inactive}</div>
        </div>
      </div>
      <div className="flex mb-2 justify-end">
        <HoverSearch value={search} onChange={setSearch} />
      </div>
      {/* TABLE CARD */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        {loading && <div className="text-sm text-gray-500 mb-3">Đang tải...</div>}
        <DataTable
          columns={columns}
          data={data}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setPageNumber}
        />
      </div>

      <Modal
        title={detailTopic ? `Chủ đề #${detailTopic.topicId}` : 'Chi tiết chủ đề'}
        open={detailOpen}
        onCancel={closeTopicDetail}
        footer={null}
        destroyOnClose
      >
        {detailLoading ? (
          <div className="text-sm text-gray-500 py-4">Đang tải chi tiết...</div>
        ) : detailTopic ? (
          <TopicDetailBody t={detailTopic} />
        ) : (
          <div className="text-sm text-gray-500">Không có dữ liệu.</div>
        )}
      </Modal>

      <Dialog
        open={openUpsert}
        onClose={closeUpsert}
        title={mode === 'create' ? 'Thêm chủ đề' : 'Cập nhật chủ đề'}
        description="Nhập tên chủ đề và mô tả."
        className="max-w-[520px]"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tên chủ đề</Label>
            <Input value={topicName} onChange={(e) => setTopicName(e.target.value)} placeholder="VD: Lập trình web" />
          </div>
          <div className="space-y-2">
            <Label>Mô tả</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Mô tả ngắn về chủ đề"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={closeUpsert} disabled={submitting}>
            Hủy
          </Button>
          <Button
            className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
