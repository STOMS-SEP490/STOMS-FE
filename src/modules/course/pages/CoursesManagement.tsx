import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Loader2, Pencil, Power, PowerOff, Plus, RotateCcw, X, GraduationCap, CheckCircle2, Layers, CalendarDays } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { useCourses, type CourseListStatusFilter } from '@/modules/course/hooks/useCourses';
import { useCourseDetailDrawer } from '@/modules/course/hooks/useCourseDetailDrawer';
import { useActiveSubjects, useAllSubjects } from '@/modules/course/hooks/useActiveSubjects';
import { CourseDetailDrawer } from '@/modules/course/components/CourseDetailDrawer';
import { useAuth } from '@/app/providers/AuthProvider';
import { dashboardApi, dashboardCoursesSummaryQueryKey } from '@/modules/dashboard/api/dashboardApi';
import { StatCard } from '@/shared/components/common/StatCard';
import { useQuery } from '@tanstack/react-query';
import { formatCourseDuration } from '../formatCourseDuration';

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { user } = useAuth();
  const roleId = Number(user?.role ?? 0);
  const isManager = roleId === 1;
  const canEdit = isManager && !readOnly;

  const [searchParams, setSearchParams] = useSearchParams();
  const openCreateFromUrl = searchParams.get('openCourseCreate');

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
  } = useCourses({ activeOnly: false });

  const allSubjects = useActiveSubjects();
  const allSubjectsIncludingInactive = useAllSubjects();

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
      message.warning('Bạn không có quyền thêm chương trình học.');
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
    if (openCreateFromUrl !== '1') return;
    openCreateModal();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openCourseCreate');
      return next;
    });
  }, [openCreateFromUrl, openCreateModal, setSearchParams]);

  const openEditModal = useCallback(
    async (c: CourseListItem) => {
      if (!canEdit) {
        message.warning('Bạn không có quyền chỉnh sửa chương trình học.');
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
        message.error(msg ?? 'Không tải được chi tiết chương trình học');
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
      message.warning('Vui lòng nhập đầy đủ mã, tên và mô tả chương trình học');
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
          message.warning('Vui lòng chọn ít nhất một môn học cho chương trình học');
          return;
        }

        await courseApi.create({
          courseCode: payloadBase.courseCode,
          courseName: payloadBase.courseName,
          description: payloadBase.description,
          courseSubjects: subjectIds.map((id) => ({ subjectId: id })),
        });

        message.success('Tạo chương trình học thành công');
        setOpenEdit(false);
        await refetch();
        void queryClient.invalidateQueries({ queryKey: dashboardCoursesSummaryQueryKey });
        return;
      }

      if (!editingCourse) return;

      // Lưu ý: Không commitPendingSubjects() ở đây vì setState là async và commit sẽ reset pendingSubjectIdsToAdd,
      // khiến bước assignBulk phía dưới bị mất danh sách môn cần thêm.
      const pendingToAddIds = Array.from(
        new Set(
          pendingSubjectIdsToAdd.filter((id) => Number(id) > 0 && !courseSubjects.some((cs) => cs.subjectId === id)),
        ),
      );

      // Validate: chương trình học phải có ít nhất 1 môn học đang active
      // (tính cả các môn pending sắp được thêm — mặc định active).
      const activeSubjectsCount =
        courseSubjects.filter((cs) => (cs.isActive ?? true) === true).length + pendingToAddIds.length;

      if (activeSubjectsCount === 0) {
        message.error('Chương trình học phải có ít nhất 1 môn học');
        return;
      }

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

      if (pendingToAddIds.length > 0) {
        await courseSubjectApi.assignBulk(editingCourse.courseId, pendingToAddIds);
        // cập nhật UI local ngay (để user thấy môn vừa thêm) + reset pending
        setCourseSubjects((prev) => {
          const existing = new Set(prev.map((x) => x.subjectId));
          const next = [...prev];
          for (const id of pendingToAddIds) {
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
      }

      message.success('Cập nhật chương trình học thành công');
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
        title: c.isActive ? 'Vô hiệu hóa chương trình học?' : 'Kích hoạt chương trình học?',
        content: c.isActive
          ? 'Chương trình học sẽ bị vô hiệu hóa và có thể ảnh hưởng tới các yêu cầu liên quan.'
          : 'Chương trình học sẽ được kích hoạt lại.',
        okText: c.isActive ? 'Vô hiệu hóa' : 'Kích hoạt',
        cancelText: 'Hủy',
        okButtonProps: { danger: c.isActive },
        onOk: async () => {
          try {
            if (c.isActive) await courseApi.deactivate(c.courseId);
            else await courseApi.activate(c.courseId);
            message.success('Cập nhật trạng thái chương trình học thành công');
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
        header: 'Mã chương trình học',
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-[#1a7a99]">{row.original.courseCode}</span>
        ),
      },
      {
        accessorKey: 'courseName',
        header: 'Tên chương trình học',
        cell: ({ row }) => (
          <div className="min-w-0 truncate text-sm font-medium text-[#1a7a99]">{row.original.courseName}</div>
        ),
      },
      {
        id: 'duration',
        header: 'Thời lượng',
        cell: ({ row }) => formatCourseDuration(row.original.duration ?? undefined) ?? '—',
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
        header: () => <span className="block w-full text-center">Thao tác</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <div className="flex items-center justify-center gap-2">
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

  const { data: courseSummary, isLoading: summaryLoading } = useQuery({
    queryKey: dashboardCoursesSummaryQueryKey,
    queryFn: () => dashboardApi.getCourseSummary(),
    staleTime: 60_000,
  });
  const totalCourses = courseSummary?.totalCourses ?? 0;
  const totalActiveCourses = courseSummary?.activeCourses ?? 0;
  const totalSubjects = courseSummary?.totalSubjects ?? 0;
  const totalSessions = courseSummary?.totalSubjectSessions ?? 0;
  const statValue = (loading: boolean, value: number) => (loading ? '—' : value.toLocaleString('vi-VN'));
  const iconClass = 'h-6 w-6';

  return (
    <div className="relative flex min-h-[var(--content-height)] flex-col gap-2 app-page-bg p-6 pl-8 pb-8">
      <div className="flex shrink-0 items-center justify-between rounded-xl border bg-white px-6 py-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-[#1a7a99]">Quản lý giáo trình</h2>
          <p className="text-xs text-slate-500">Quản lý chương trình học trong hệ thống</p>
        </div>
        {canEdit && (
          <Button
            onClick={openCreateModal}
            className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md"
          >
            <Plus size={16} />
            Thêm chương trình học
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 shrink-0">
        <StatCard
          icon={<GraduationCap className={iconClass} strokeWidth={2} />}
          label="Tổng chương trình học"
          value={statValue(summaryLoading, totalCourses)}
          sub="Tất cả khóa trong hệ thống"
          variant="blue"
        />
        <StatCard
          icon={<CheckCircle2 className={iconClass} strokeWidth={2} />}
          label="Đang hoạt động"
          value={statValue(summaryLoading, totalActiveCourses)}
          sub="Chương trình học đang bật"
          variant="green"
        />
        <StatCard
          icon={<Layers className={iconClass} strokeWidth={2} />}
          label="Tổng môn học"
          value={statValue(summaryLoading, totalSubjects)}
          sub="Phân bổ theo chương trình"
          variant="violet"
        />
        <StatCard
          icon={<CalendarDays className={iconClass} strokeWidth={2} />}
          label="Tổng buổi học"
          value={statValue(summaryLoading, totalSessions)}
          sub="Buổi theo môn học"
          variant="orange"
        />
      </div>

      <div className="shrink-0 px-2 py-1">
        {!isManager ? (
          <div className="flex gap-3 items-center justify-end">
            <HoverSearch placeholder="Tìm chương trình học..." value={search} onChange={setSearch} />
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <HoverSearch placeholder="Tìm chương trình học..." value={search} onChange={(value) => setSearch(value)} />
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Select
                  value={statusFilter}
                  onValueChange={(v) =>
                    setFiltersAndResetPage({
                      statusFilter: v as CourseListStatusFilter,
                    })
                  }
                >
                  <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[180px]">
                    <SelectValue placeholder="Chọn trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    <SelectItem value="active">Đang hoạt động</SelectItem>
                    <SelectItem value="inactive">Ngừng hoạt động</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-white border-slate-200 text-gray-600 hover:bg-gray-50" onClick={resetFilters} type="button" title="Đặt lại bộ lọc">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col rounded-xl border bg-white p-4 shadow-sm">
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
                  {isCreating ? 'Tạo chương trình học' : 'Cập nhật chương trình học'}
                </h2>
                <p className="text-sm text-slate-500">
                  {isCreating
                    ? 'Tạo mới một chương trình học trong hệ thống.'
                    : 'Chỉnh sửa thông tin cơ bản của chương trình học.'}
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

          <div className="stoms-scrollbar min-h-0 flex-1 overflow-y-auto  px-5 py-5">
            <div className="space-y-5">
              <div className=" bg-white p-4  ">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>
                      Mã chương trình học <span className="text-rose-600">*</span>
                    </Label>
                    <Input
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value)}
                      placeholder="Ví dụ: CSY"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Tên chương trình học <span className="text-rose-600">*</span>
                    </Label>
                    <Input
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      placeholder="Nhập tên chương trình học"
                    />
                  </div>
                </div>
              </div>

              <div className=" bg-white p-4 ">
                <div className="space-y-2">
                  <Label>
                    Mô tả <span className="text-rose-600">*</span>
                  </Label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full min-h-28 resize-y rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Nhập mô tả chương trình học"
                  />
                </div>
              </div>

              <div className=" bg-white p-4 ">
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

                  <div className="stoms-scrollbar max-h-[40vh] overflow-y-auto  p-3 pr-2 ">
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
                          
                          const masterSubject = allSubjectsIncludingInactive.find((x) => x.subjectId === cs.subjectId);
                          const isSubjectDeactivated = masterSubject ? !masterSubject.isActive : false;
                          
                          return (
                            <div
                              key={cs.subjectId}
                              className="flex items-center justify-between  bg-white px-3 py-2 "
                            >
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`truncate text-sm font-medium ${isSubjectDeactivated ? 'text-slate-400' : 'text-[#1a7a99]'}`}>
                                    {name}
                                  </span>
                                  {isSubjectDeactivated && (
                                    <Badge className="border bg-orange-100 text-orange-600 text-xs">
                                      Ngừng hoạt động
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-slate-500">Mã môn: {cs.subjectId}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="hidden text-xs text-slate-500 sm:inline">
                                  {isActive ? 'Đang dùng' : 'Đang tắt'}
                                </span>
                                <Switch
                                  checked={isActive}
                                  disabled={isSubjectDeactivated}
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
              <div className="space-y-2  bg-white p-4 ">
                <div className="flex items-center justify-between">
                  <Label>Thêm môn học</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddSubject(false);
                      setPendingSubjectIdsToAdd([]);
                    }}
                  >
                    Đóng
                  </Button>
                </div>
                <div className="mb-1 text-xs text-slate-500">
                  Chọn một hoặc nhiều môn chưa gán. Các môn được chọn sẽ tự động thêm vào danh sách.
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
                              className="flex w-full cursor-pointer items-center  px-3 py-2 text-sm gap-2"
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300"
                                checked={checked}
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
                                  const subjectId = s.subjectId;
                                  
                                  if (isChecked) {
                                    // Thêm vào pending list
                                    setPendingSubjectIdsToAdd((prev) => [...prev, subjectId]);
                                    // Thêm ngay vào courseSubjects
                                    setCourseSubjects((prev) => {
                                      if (prev.some((cs) => cs.subjectId === subjectId)) return prev;
                                      return [
                                        ...prev,
                                        {
                                          subjectId,
                                          subjectName: s.subjectName,
                                          isActive: true,
                                        },
                                      ];
                                    });
                                  } else {
                                    // Xóa khỏi pending list
                                    setPendingSubjectIdsToAdd((prev) => prev.filter((id) => id !== subjectId));
                                    // Xóa khỏi courseSubjects
                                    setCourseSubjects((prev) => prev.filter((cs) => cs.subjectId !== subjectId));
                                  }
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
