import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { Drawer, message } from 'antd';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { DataTable } from '@/shared/components/common/DataTable';
import { TableTextAction } from '@/shared/components/common/TableTextAction';
import { Badge } from '@/shared/components/ui/badge';
import subjectApi from '@/modules/subject/api/subjectApi';
import { useSubjects } from '@/modules/subject/hooks/useSubjects';
import type { SubjectListItem } from '@/modules/subject/subject';
import type { CoursesReadonlyOutletContext } from '@/modules/course/pages/coursesReadonlyOutletContext';

export default function SubjectsReadonlyPage() {
  const { subjectSearch, setSubjectSearch } = useOutletContext<CoursesReadonlyOutletContext>();
  const {
    data,
    loading,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
  } = useSubjects({
    pageSize: 6,
    search: subjectSearch,
    setSearch: setSubjectSearch,
  });

  useLayoutEffect(() => {
    setPageNumber(1);
  }, [subjectSearch, setPageNumber]);

  const [searchParams, setSearchParams] = useSearchParams();
  const openDetailFromUrl = searchParams.get('openDetail');
  const subjectIdFromUrl = searchParams.get('subjectId');
  const skipNextAutoOpenRef = useRef(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailSubject, setDetailSubject] = useState<SubjectListItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const lastOpenedSubjectIdRef = useRef<number | null>(null);

  const closeDetailFromUrl = () => {
    if (openDetailFromUrl === '1') {
      skipNextAutoOpenRef.current = true;
    }
    setDetailOpen(false);
    setDetailSubject(null);
    setDetailLoading(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openDetail');
      next.delete('subjectId');
      return next;
    });
  };

  const openDetailById = async (id: number) => {
    try {
      setDetailLoading(true);
      const full = await subjectApi.getById(id);
      setDetailSubject(full);
      lastOpenedSubjectIdRef.current = id;
      setDetailOpen(true);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? ((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? null)
          : null;
      message.error(msg ?? 'Không tải được chi tiết môn học');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (openDetailFromUrl !== '1') return;
    if (!subjectIdFromUrl) return;
    if (skipNextAutoOpenRef.current) {
      skipNextAutoOpenRef.current = false;
      return;
    }

    const id = Number(subjectIdFromUrl);
    if (!id || Number.isNaN(id)) return;

    if (detailOpen && lastOpenedSubjectIdRef.current === id) return;

    void openDetailById(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDetailFromUrl, subjectIdFromUrl]);

  const activeSubjectSkills = useMemo(() => {
    if (!detailSubject) return [];
    return (detailSubject.subjectSkills ?? []).filter((ss: any) =>
      ss?.isActive === undefined ? true : ss.isActive === true,
    );
  }, [detailSubject]);

  const columns = useMemo<ColumnDef<SubjectListItem>[]>(
    () => [
      {
        accessorKey: 'subjectCode',
        header: 'Mã môn học',
        cell: ({ row }) => <span className="font-semibold text-gray-900">{row.original.subjectCode}</span>,
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
        cell: ({ row }) => (
          <TableTextAction onClick={() => void openDetailById(row.original.subjectId)} />
        ),
      },
    ],
    [],
  );

  return (
    <div className="relative flex w-full min-w-0 flex-1 min-h-0 flex-col">
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

      <Drawer
        open={detailOpen}
        onClose={closeDetailFromUrl}
        placement="right"
        width={720}
        title={detailSubject ? `Môn học ${detailSubject.subjectCode}` : 'Chi tiết môn học'}
      >
        {detailLoading && !detailSubject ? (
          <div className="text-sm text-gray-500">Đang tải chi tiết...</div>
        ) : detailSubject ? (
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            <div>
              <div className="text-xs text-gray-500">Tên môn học</div>
              <div className="text-sm font-medium">{detailSubject.subjectName || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Mô tả</div>
              <div className="text-sm">{detailSubject.description || '—'}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-md border p-2">
                <div className="text-xs text-gray-500">Chủ đề</div>
                <div className="text-sm font-medium">{detailSubject.topicName ?? detailSubject.topicId ?? '—'}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-gray-500">Số buổi</div>
                <div className="text-sm font-medium">{detailSubject.numberOfSession}</div>
              </div>
            </div>

            <div className="pt-2">
              <div className="text-xs text-gray-500">Trạng thái</div>
              <div className="text-sm">{detailSubject.isActive ? 'Đang hoạt động' : 'Vô hiệu hóa'}</div>
            </div>

            {activeSubjectSkills.length > 0 && (
              <div className="rounded-md border p-2">
                <div className="text-xs text-gray-500 mb-1">Kỹ năng liên quan</div>
                <div className="flex flex-wrap gap-1">
                  {activeSubjectSkills.map((ss: any) => (
                    <span
                      key={`${ss.subjectId}-${ss.skillId}`}
                      className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs border border-blue-100"
                    >
                      {ss.skill?.skillName ?? `Skill #${ss.skillId}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-500">Không có dữ liệu.</div>
        )}
      </Drawer>
    </div>
  );
}

