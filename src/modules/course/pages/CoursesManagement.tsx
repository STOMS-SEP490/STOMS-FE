import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Loader2, Pencil, Power, PowerOff, Plus, RotateCcw, X } from 'lucide-react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { Modal, message } from 'antd';
import courseApi from '@/modules/course/api/courseApi';
import courseSubjectApi from '@/modules/course/api/courseSubjectApi';
import type { CourseListItem, CourseSubjectSummary } from '../courseType';
import type { SubjectListItem } from '@/modules/subject/subject';
import { Badge } from '@/shared/components/ui/badge';
import HoverSearch from '@/shared/components/ui/search';
import { DataTable } from '@/shared/components/common/DataTable';
import { Button } from '@/shared/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import type { CoursesManagementLayoutOutletContext } from '@/app/layouts/coursesManagementOutletContext';
import { useCourses, type CourseListStatusFilter } from '@/modules/course/hooks/useCourses';
import { useCourseDetailDrawer } from '@/modules/course/hooks/useCourseDetailDrawer';
import { useActiveSubjects } from '@/modules/course/hooks/useActiveSubjects';
import { CourseDetailDrawer } from '@/modules/course/components/CourseDetailDrawer';
import { useAuth } from '@/app/providers/AuthProvider';
import { dashboardCoursesSummaryQueryKey } from '@/modules/dashboard/api/dashboardApi';

type Props = {
  readOnly?: boolean;
};

type CourseSubjectRow = { subjectId: number; subjectName?: string; isActive?: boolean };

function mapApiCourseSubjectToRow(
  cs: CourseSubjectSummary,
  subjects: SubjectListItem[],
): CourseSubjectRow {
  const sid = Number(cs.subjectId);
  return {
    subjectId: sid,
    subjectName:
      cs.subject?.subjectName ??
      cs.subjectName ??
      subjects.find((x) => x.subjectId === sid)?.subjectName ??
      `Môn #${cs.subjectId}`,
    isActive: cs.isActive === undefined ? true : Boolean(cs.isActive),
  };
}

export default function CoursesManagement({ readOnly = false }: Props) {
  const context = useOutletContext<CoursesManagementLayoutOutletContext>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { user } = useAuth();
  const roleId = Number(user?.role ?? 0);
  const isManager = roleId === 1;
  const canEdit = isManager && !readOnly;

  const [searchParams, setSearchParams] = useSearchParams();
  const openCreateFromUrl = searchParams.get('openCourseCreate');

  const listLifted =
    context.courseListLifted === true &&
    typeof context.setCourseListSearch === 'function' &&
    typeof context.courseListSearch === 'string' &&
    typeof context.setCourseListStatusFilter === 'function' &&
    typeof context.courseListStatusFilter !== 'undefined' &&
    typeof context.setCourseListPage === 'function' &&
    typeof context.courseListPage === 'number';

  const {
    data,
    isListBlocking,
    search,
    setSearch,
    statusFilter,
    setFiltersAndResetPage,
    resetFilters,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
    refetch,
  } = useCourses(
    listLifted
      ? {
          search: context.courseListSearch,
          setSearch: context.setCourseListSearch,
          statusFilter: context.courseListStatusFilter,
          setStatusFilter: context.setCourseListStatusFilter,
          pageNumber: context.courseListPage,
          setPageNumber: context.setCourseListPage,
          activeOnly: false,
        }
      : { activeOnly: false },
  );

  const allSubjects = useActiveSubjects();

  const {
    detailOpen,
    detailCourse,
    detailLoading,
    closeDetailFromUrl,
    openDetailById,
  } = useCourseDetailDrawer();

  const [openEdit, setOpenEdit] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseListItem | null>(null);
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [description, setDescription] = useState('');
  const [courseSubjects, setCourseSubjects] = useState<CourseSubjectRow[]>([]);
  const [initialCourseSubjects, setInitialCourseSubjects] = useState<CourseSubjectRow[]>([]);
  const [pendingSubjectIdsToAdd, setPendingSubjectIdsToAdd] = useState<number[]>([]);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const commitPendingSubjects = () => {
    const ids = Array.from(new Set(pendingSubjectIdsToAdd)).filter((id) => Number(id) > 0);
    if (ids.length === 0) {
      setShowAddSubject(false);
      return;
    }
    setCourseSubjects((prev) => {
      const existing = new Set(prev.map((x) => x.subjectId));
      const next = [...prev];
      for (const id of ids) {
        if (existing.has(id)) continue;
        const found = allSubjects.find((s) => s.subjectId === id);
        next.push({
          subjectId: id,
          subjectName: found?.subjectName ?? `Môn #${id}`,
          isActive: true,
        });
      }
      return next;
    });
    setPendingSubjectIdsToAdd([]);
    setShowAddSubject(false);
  };

  const openCreateModal = useCallback(() => {
    if (!canEdit) {
      message.warning('Bạn không có quyền thêm khóa học.');
      return;
    }
    setIsCreating(true);
    setEditingCourse(null);
    setCourseCode('');
    setCourseName('');
    setDescription('');
    setCourseSubjects([]);
    setInitialCourseSubjects([]);
    setPendingSubjectIdsToAdd([]);
    setShowAddSubject(false);
    setOpenEdit(true);
  }, [canEdit]);

  useEffect(() => {
    if (context.position !== 'content') return;
    if (openCreateFromUrl !== '1') return;
    openCreateModal();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openCourseCreate');
      return next;
    });
  }, [context.position, openCreateFromUrl, openCreateModal, setSearchParams]);

  const openEditModal = useCallback(
    async (c: CourseListItem) => {
      if (!canEdit) {
        message.warning('Bạn không có quyền chỉnh sửa khóa học.');
        return;
      }
      setIsCreating(false);
      try {
        const detail = await courseApi.getById(c.courseId);
        setEditingCourse(detail);
        setCourseCode(detail.courseCode ?? '');
        setCourseName(detail.courseName ?? '');
        setDescription(detail.description?.trim() ? String(detail.description) : '');
        const list = (detail.courseSubjects ?? []).map((cs) => mapApiCourseSubjectToRow(cs, allSubjects));
        setCourseSubjects(list);
        setInitialCourseSubjects(list.map((x) => ({ ...x })));
        setPendingSubjectIdsToAdd([]);
        setShowAddSubject(false);
      } catch (e: unknown) {
        const msg =
          e && typeof e === 'object' && 'response' in e
            ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
            : null;
        message.error(msg ?? 'Không tải được chi tiết khóa học');
        setEditingCourse(c);
        setCourseCode(c.courseCode ?? '');
        setCourseName(c.courseName ?? '');
        setDescription('');
        const list = (c.courseSubjects ?? []).map((cs) => mapApiCourseSubjectToRow(cs, allSubjects));
        setCourseSubjects(list);
        setInitialCourseSubjects(list.map((x) => ({ ...x })));
        setPendingSubjectIdsToAdd([]);
        setShowAddSubject(false);
      } finally {
        setOpenEdit(true);
      }
    },
    [allSubjects],
  );

  const closeEditModal = () => {
    if (submitting) return;
    setOpenEdit(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openCourseCreate');
      return next;
    });
  };

  const handleSubmitEdit = async () => {
    const payloadBase = {
      courseCode: courseCode.trim(),
      courseName: courseName.trim(),
      description: description.trim(),
    };

    if (!payloadBase.courseCode || !payloadBase.courseName || !payloadBase.description) {
      message.warning('Vui lòng nhập đầy đủ mã, tên và mô tả khóa học');
      return;
    }

    try {
      setSubmitting(true);

      if (isCreating) {
        // Đảm bảo danh sách môn đã chọn được “chốt” vào form trước khi submit.
        // (Tránh trường hợp user tick checkbox nhưng chưa đóng phần "Thêm môn học".)
        if (showAddSubject && pendingSubjectIdsToAdd.length > 0) commitPendingSubjects();

        const subjectIds = Array.from(
          new Set([
            ...courseSubjects.map((x) => x.subjectId),
            ...pendingSubjectIdsToAdd,
          ]),
        ).filter((id) => Number(id) > 0);

        if (subjectIds.length === 0) {
          message.warning('Vui lòng chọn ít nhất một môn học cho khóa học');
          return;
        }

        await courseApi.create({
          courseCode: payloadBase.courseCode,
          courseName: payloadBase.courseName,
          description: payloadBase.description,
          courseSubjects: subjectIds.map((id) => ({ subjectId: id })),
        });

        message.success('Tạo khóa học thành công');
        setOpenEdit(false);
        await refetch();
        void queryClient.invalidateQueries({ queryKey: dashboardCoursesSummaryQueryKey });
        return;
      }

      if (!editingCourse) return;

      await courseApi.update(editingCourse.courseId, payloadBase);

      const initialMap = new Map<number, boolean>(
        initialCourseSubjects.map((cs) => [cs.subjectId, cs.isActive ?? true]),
      );
      const currentMap = new Map<number, boolean>(
        courseSubjects.map((cs) => [cs.subjectId, cs.isActive ?? true]),
      );
      const toDeactivate: number[] = [];
      const toActivate: number[] = [];
      initialMap.forEach((orig, id) => {
        if (!currentMap.has(id)) return;
        const cur = currentMap.get(id) ?? orig;
        if (orig && !cur) toDeactivate.push(id);
        else if (!orig && cur) toActivate.push(id);
      });
      if (toDeactivate.length > 0) {
        await courseSubjectApi.deactivateMany(editingCourse.courseId, toDeactivate);
      }
      if (toActivate.length > 0) {
        await courseSubjectApi.activateMany(editingCourse.courseId, toActivate);
      }

      const toAddIds = Array.from(
        new Set(pendingSubjectIdsToAdd.filter((id) => !courseSubjects.some((cs) => cs.subjectId === id))),
      );
      if (toAddIds.length > 0) {
        await courseSubjectApi.assignBulk(editingCourse.courseId, toAddIds);
      }

      message.success('Cập nhật khóa học thành công');
      setOpenEdit(false);
      await refetch();
      void queryClient.invalidateQueries({ queryKey: dashboardCoursesSummaryQueryKey });
    } catch (e: unknown) {
      message.error(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = useCallback(
    (c: CourseListItem) => {
      Modal.confirm({
        title: c.isActive ? 'Vô hiệu hóa khóa học?' : 'Kích hoạt khóa học?',
        content: c.isActive
          ? 'Khóa học sẽ bị vô hiệu hóa và có thể ảnh hưởng tới các yêu cầu liên quan.'
          : 'Khóa học sẽ được kích hoạt lại.',
        okText: c.isActive ? 'Vô hiệu hóa' : 'Kích hoạt',
        cancelText: 'Hủy',
        okButtonProps: { danger: c.isActive },
        onOk: async () => {
          try {
            if (c.isActive) await courseApi.deactivate(c.courseId);
            else await courseApi.activate(c.courseId);
            message.success('Cập nhật trạng thái khóa học thành công');
            await refetch();
            void queryClient.invalidateQueries({ queryKey: dashboardCoursesSummaryQueryKey });
          } catch (e: unknown) {
            message.error(getErrorMessage(e));
          }
        },
      });
    },
    [queryClient, refetch],
  );

  const handleView = useCallback(
    async (c: CourseListItem) => {
      await openDetailById(c.courseId);
    },
    [openDetailById],
  );

  const columns = useMemo<ColumnDef<CourseListItem>[]>(
    () => [
      {
        accessorKey: 'courseCode',
        header: 'Mã khóa học',
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-slate-900">{row.original.courseCode}</span>
        ),
      },
      {
        accessorKey: 'courseName',
        header: 'Tên khóa học',
        cell: ({ row }) => (
          <div className="min-w-0 truncate text-sm font-medium text-slate-900">{row.original.courseName}</div>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Trạng thái',
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge className="border bg-green-100 text-green-700">Hoạt động</Badge>
          ) : (
            <Badge className="border bg-orange-100 text-orange-600">Ngừng hoạt động</Badge>
          ),
      },
      {
        id: 'subjects',
        header: 'Số môn học',
        cell: ({ row }) => {
          const count = row.original.numberOfSubject ?? row.original.courseSubjects?.length ?? 0;
          return <span className="text-sm text-slate-700">{`${count} môn học`}</span>;
        },
      },
      {
        id: 'sessions',
        header: 'Số buổi',
        cell: ({ row }) => {
          const n = row.original.numberOfSession ?? null;
          const count = Number.isFinite(Number(n)) ? Math.max(0, Math.trunc(Number(n))) : 0;
          return <span className="text-sm text-slate-700">{`${count} buổi`}</span>;
        },
      },
      {
        accessorKey: 'updatedAt',
        header: 'Cập nhật',
        cell: ({ row }) =>
          row.original.updatedAt
            ? new Date(row.original.updatedAt).toLocaleString('vi-VN')
            : '—',
      },
      {
        id: 'actions',
        header: 'Thao tác',
        enableSorting: false,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex gap-3">
              <span title="Xem chi tiết">
                <Eye
                  size={16}
                  className="cursor-pointer text-gray-800"
                  onClick={() => void handleView(c)}
                />
              </span>
              {canEdit ? (
                <>
                  <span title="Chỉnh sửa">
                    <Pencil
                      size={16}
                      className="cursor-pointer text-blue-600"
                      onClick={() => void openEditModal(c)}
                    />
                  </span>
                  {c.isActive ? (
                    <span title="Vô hiệu hóa">
                      <PowerOff
                        size={16}
                        className="cursor-pointer text-red-500"
                        onClick={() => handleToggleActive(c)}
                      />
                    </span>
                  ) : (
                    <span title="Kích hoạt">
                      <Power
                        size={16}
                        className="cursor-pointer text-green-600"
                        onClick={() => handleToggleActive(c)}
                      />
                    </span>
                  )}
                </>
              ) : null}
            </div>
          );
        },
      },
    ],
    [canEdit, handleView, openEditModal, handleToggleActive],
  );

  if (context.position === 'toolbar') {
    if (!isManager) {
      return (
        <div className="flex gap-3 items-center">
          <HoverSearch placeholder="Tìm khóa học..." value={search} onChange={setSearch} />
        </div>
      );
    }
    return (
      <div className="flex gap-3 items-center">
        <HoverSearch
          placeholder="Tìm khóa học..."
          value={search}
          onChange={(value) => setSearch(value)}
        />
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setFiltersAndResetPage({
              statusFilter: v as CourseListStatusFilter,
            })
          }
        >
          <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[160px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="active">Đang hoạt động</SelectItem>
            <SelectItem value="inactive">Ngừng hoạt động</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="secondary" className="bg-white" onClick={resetFilters} type="button">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative min-h-[200px]">
        <DataTable
          columns={columns}
          data={data}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(page) => setPageNumber(page)}
          comfortable
        />
        {isListBlocking ? (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-md bg-white/75 backdrop-blur-[1px]"
            aria-busy="true"
            aria-live="polite"
          >
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-hidden />
            <span className="text-sm text-slate-500">Đang tải...</span>
          </div>
        ) : null}
      </div>

      <CourseDetailDrawer
        open={detailOpen}
        onClose={closeDetailFromUrl}
        detailCourse={detailCourse}
        detailLoading={detailLoading}
        onSubjectClick={(subjectId) => {
          navigate(`/manager/subjects?openDetail=1&subjectId=${subjectId}`);
        }}
      />

      {!readOnly && openEdit && (
        <div
          className="fixed inset-0 bg-black/30 z-40 h-full"
          onClick={closeEditModal}
          aria-hidden
        />
      )}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-[820px] max-w-[95vw]
        border-l border-slate-200 bg-white transition-transform duration-300 ease-out
        ${!readOnly && openEdit ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex h-full flex-col overflow-hidden text-slate-700">
          <div className="shrink-0 border-b border-slate-100 bg-white px-5 pb-4 pt-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {isCreating ? 'Tạo khóa học' : 'Cập nhật khóa học'}
                </h2>
                <p className="text-sm text-slate-500">
                  {isCreating
                    ? 'Tạo mới một khóa học trong hệ thống.'
                    : 'Chỉnh sửa thông tin cơ bản của khóa học.'}
                </p>
              </div>
              <button
                onClick={closeEditModal}
                className="shrink-0 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="stoms-scrollbar min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-5 py-5">
            <div className="space-y-5">
              <div className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/50">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>
                      Mã khóa học <span className="text-rose-600">*</span>
                    </Label>
                    <Input
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value)}
                      placeholder="Ví dụ: CSY"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Tên khóa học <span className="text-rose-600">*</span>
                    </Label>
                    <Input
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      placeholder="Nhập tên khóa học"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/50">
                <div className="space-y-2">
                  <Label>
                    Mô tả <span className="text-rose-600">*</span>
                  </Label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full min-h-28 resize-y rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Nhập mô tả khóa học"
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/50">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Môn học</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => setShowAddSubject(true)}
                      disabled={allSubjects.length === 0}
                    >
                      <Plus className="w-4 h-4" />
                      Thêm môn
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Gạt để bật/tắt môn đã gán
                  </p>

                  <div className="stoms-scrollbar max-h-[40vh] overflow-y-auto rounded-xl bg-slate-50/60 p-3 pr-2 ring-1 ring-slate-200/50">
                    {courseSubjects.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Chưa gán môn nào. Nhấn &quot;Thêm môn&quot; để chọn.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {courseSubjects.map((cs) => {
                          const isActive = cs.isActive ?? true;
                          const name =
                            cs.subjectName ??
                            allSubjects.find((x) => x.subjectId === cs.subjectId)?.subjectName ??
                            `Môn #${cs.subjectId}`;
                          return (
                            <div
                              key={cs.subjectId}
                              className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/40"
                            >
                              <div className="flex flex-col min-w-0">
                                <span className="truncate text-sm font-medium text-slate-900">{name}</span>
                                <span className="text-xs text-slate-500">Mã môn: {cs.subjectId}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="hidden text-xs text-slate-500 sm:inline">
                                  {isActive ? 'Đang dùng' : 'Đang tắt'}
                                </span>
                                <Switch
                                  checked={isActive}
                                  onCheckedChange={(checked) => {
                                    setCourseSubjects((prev) =>
                                      prev.map((it) =>
                                        it.subjectId === cs.subjectId ? { ...it, isActive: checked } : it,
                                      ),
                                    );
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            {showAddSubject && (
              <div className="space-y-2 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/50">
                <div className="flex items-center justify-between">
                  <Label>Thêm môn học</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowAddSubject(false);
                        setPendingSubjectIdsToAdd([]);
                      }}
                    >
                      Hủy
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
                      onClick={commitPendingSubjects}
                      disabled={pendingSubjectIdsToAdd.length === 0}
                    >
                      Lưu
                    </Button>
                  </div>
                </div>
                <div className="mb-1 text-xs text-slate-500">
                  Chọn một hoặc nhiều môn chưa gán; bấm <strong>Lưu</strong> để gán hàng loạt.
                </div>
                <div className="stoms-scrollbar max-h-64 overflow-y-auto rounded-xl bg-slate-50/60 p-3 pr-2 ring-1 ring-slate-200/50">
                  {allSubjects.filter((s) => !courseSubjects.some((cs) => cs.subjectId === s.subjectId)).length ===
                  0 ? (
                    <p className="text-sm text-muted-foreground">Đã gán hết môn có sẵn.</p>
                  ) : (
                    <div className="space-y-2">
                      {allSubjects
                        .filter((s) => !courseSubjects.some((cs) => cs.subjectId === s.subjectId))
                        .map((s) => {
                          const checked = pendingSubjectIdsToAdd.includes(s.subjectId);
                          return (
                            <label
                              key={s.subjectId}
                              className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-white px-3 py-2 text-sm shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/40 hover:bg-slate-50"
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300"
                                checked={checked}
                                onChange={(e) => {
                                  setPendingSubjectIdsToAdd((prev) =>
                                    e.target.checked
                                      ? [...prev, s.subjectId]
                                      : prev.filter((id) => id !== s.subjectId),
                                  );
                                }}
                              />
                              <span className="flex-1">
                                {s.subjectCode} - {s.subjectName}
                              </span>
                              <span className="text-xs text-slate-400">#{s.subjectId}</span>
                            </label>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>

          <div className="shrink-0 border-t bg-white p-4">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeEditModal} disabled={submitting}>
                Hủy
              </Button>
              <Button
                className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
                onClick={() => void handleSubmitEdit()}
                disabled={submitting}
              >
                {submitting ? (isCreating ? 'Đang tạo...' : 'Đang lưu...') : isCreating ? 'Tạo' : 'Lưu'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
