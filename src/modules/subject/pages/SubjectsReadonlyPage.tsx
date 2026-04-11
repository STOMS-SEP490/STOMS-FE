import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { message } from 'antd';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { MANAGER_ROLE_ID } from '@/constants/role';
import { DataTable } from '@/shared/components/common/DataTable';
import { TableTextAction } from '@/shared/components/common/TableTextAction';
import subjectApi from '@/modules/subject/api/subjectApi';
import { useSubjects } from '@/modules/subject/hooks/useSubjects';
import type { SubjectListItem } from '@/modules/subject/subject';
import type { CoursesReadonlyOutletContext } from '@/modules/course/pages/coursesReadonlyOutletContext';
import { SubjectDetailDrawer } from '@/modules/subject/components/SubjectDetailDrawer';

export default function SubjectsReadonlyPage() {
  const { user } = useAuth();
  const activeOnly = Number(user?.role ?? 0) !== MANAGER_ROLE_ID;
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
    activeOnly,
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

      <SubjectDetailDrawer
        open={detailOpen}
        onClose={closeDetailFromUrl}
        detailSubject={detailSubject}
        detailLoading={detailLoading}
      />
    </div>
  );
}

