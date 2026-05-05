import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { RotateCcw } from 'lucide-react';
import { message } from 'antd';
import { useAuth } from '@/app/providers/AuthProvider';
import { MANAGER_ROLE_ID } from '@/constants/role';
import { DataTable } from '@/shared/components/common/DataTable';
import { Button } from '@/shared/components/ui/button';
import HoverSearch from '@/shared/components/ui/search';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { useSubjects } from '@/modules/subject/hooks/useSubjects';
import type { SubjectListItem } from '@/modules/subject/subject';
import topicApi from '@/modules/topic/api/topicApi';
import type { TopicListItem } from '@/modules/topic/topic';
import subjectApi from '@/modules/subject/api/subjectApi';
import { SubjectDetailDrawer } from '@/modules/subject/components/SubjectDetailDrawer';
import { formatSubjectDuration } from '../formatSubjectDuration';

export default function SubjectsReadonlyPage() {
  const { user } = useAuth();
  const activeOnly = Number(user?.role ?? 0) !== MANAGER_ROLE_ID;
  const {
    data,
    isListBlocking,
    search,
    setSearch,
    topicId: topicFilterId,
    setTopicId: setTopicFilterId,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
  } = useSubjects({
    pageSize: 10,
    activeOnly,
  });
  const [allTopics, setAllTopics] = useState<TopicListItem[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSubject, setDetailSubject] = useState<SubjectListItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    topicApi
      .getTopics({ pageNumber: 1, pageSize: 500 })
      .then((res) => setAllTopics(res.items ?? []))
      .catch(() => setAllTopics([]));
  }, []);

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailSubject(null);
    setDetailLoading(false);
  };

  const openDetailById = async (id: number) => {
    try {
      setDetailLoading(true);
      const full = await subjectApi.getById(id);
      setDetailSubject(full);
      setDetailOpen(true);
    } catch {
      message.error('Không tải được chi tiết môn học');
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = useMemo<ColumnDef<SubjectListItem>[]>(
    () => [
      {
        accessorKey: 'subjectCode',
        header: 'Mã môn học',
        cell: ({ row }) => <span className="font-semibold text-[#1a7a99]">{row.original.subjectCode}</span>,
      },
      {
        accessorKey: 'subjectName',
        header: 'Tên môn học',
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-medium text-gray-900 truncate">{row.original.subjectName}</div>
            <div className="text-xs text-gray-500 truncate">{row.original.description?.trim() || '—'}</div>
          </div>
        ),
      },
      {
        accessorKey: 'topicName',
        header: 'Chủ đề',
        cell: ({ row }) => (
          <span className="text-sm text-slate-700">
            {row.original.topicName?.trim() || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'duration',
        header: 'Thời lượng',
        cell: ({ row }) => formatSubjectDuration(row.original.duration ?? undefined) ?? '—',
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
        <h2 className="text-xl font-semibold text-[#1a7a99]">Danh sách môn học</h2>
        <p className="text-xs text-gray-500">Xem thông tin các môn học trong hệ thống</p>
      </div>

      <div className="shrink-0 px-2 py-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <HoverSearch
            placeholder="Tìm môn học..."
            value={search}
            onChange={(value) => setSearch(value)}
          />
          <Select
            value={topicFilterId == null ? 'all' : String(topicFilterId)}
            onValueChange={(v) => {
              if (v === 'all') setTopicFilterId(null);
              else setTopicFilterId(Number(v));
            }}
          >
            <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[180px] border-slate-200">
              <SelectValue placeholder="Chủ đề" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả chủ đề</SelectItem>
              {allTopics.map((t) => (
                <SelectItem key={t.topicId} value={String(t.topicId)}>
                  {t.topicName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="secondary"
            className="bg-white h-9 border-slate-200"
            type="button"
            onClick={() => {
              setSearch('');
              setTopicFilterId(null);
              setPageNumber(1);
            }}
            title="Đặt lại bộ lọc"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {isListBlocking ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/70 backdrop-blur-[1px]">
            <span className="text-sm text-slate-500">Đang tải...</span>
          </div>
        ) : null}
        <DataTable
          columns={columns}
          data={data}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(page) => setPageNumber(page)}
          onRowClick={(row) => {
            void openDetailById(row.subjectId);
          }}
          fillHeight
          comfortable
        />
      </div>

      <SubjectDetailDrawer
        open={detailOpen}
        onClose={closeDetail}
        detailSubject={detailSubject}
        detailLoading={detailLoading}
      />
    </div>
  );
}

