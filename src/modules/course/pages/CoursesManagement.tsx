import { useCallback, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil, Power, PowerOff, Plus, X } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import dayjs from 'dayjs';
import { Modal, message } from 'antd';
import courseApi from '@/modules/course/api/courseApi';
import courseSubjectApi from '@/modules/course/api/courseSubjectApi';
import type { CourseListItem, CourseSubjectSummary } from '../courseType';
import type { SubjectListItem } from '@/modules/subject/subject';
import { Badge } from '@/shared/components/ui/badge';
import HoverSearch from '@/shared/components/ui/search';
import { DataTable } from '@/shared/components/common/DataTable';
import { TableTextAction } from '@/shared/components/common/TableTextAction';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { getErrorMessage } from '@/shared/lib/errorMessage';
import { useCourses } from '@/modules/course/hooks/useCourses';
import { useCourseDetailDrawer } from '@/modules/course/hooks/useCourseDetailDrawer';
import { useActiveSubjects } from '@/modules/course/hooks/useActiveSubjects';
import { CourseDetailDrawer } from '@/modules/course/components/CourseDetailDrawer';
import { useAuth } from '@/app/providers/AuthProvider';

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
  const context = useOutletContext<{ position: string }>();
  const navigate = useNavigate();

  const { user } = useAuth();
  const roleId = Number(user?.role ?? 0);
  const isManager = roleId === 1;
  const canEdit = isManager && !readOnly;

  const {
    data,
    loading,
    search,
    setSearch,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
    refetch,
  } = useCourses();

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

  const openCreateModal = () => {
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
  };

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
  };

  const handleSubmitEdit = async () => {
    const payloadBase = {
      courseCode: courseCode.trim(),
      courseName: courseName.trim(),
      description: description.trim(),
    };

    if (!payloadBase.courseCode || !payloadBase.courseName) {
      message.warning('Vui lòng nhập đầy đủ mã và tên khóa học');
      return;
    }

    try {
      setSubmitting(true);

      if (isCreating) {
        const created = await courseApi.create({
          courseCode: payloadBase.courseCode,
          courseName: payloadBase.courseName,
        });

        const toAddIds = Array.from(new Set(pendingSubjectIdsToAdd));
        if (toAddIds.length > 0) {
          await courseSubjectApi.assignBulk(created.courseId, toAddIds);
        }

        message.success('Tạo khóa học thành công');
        setOpenEdit(false);
        await refetch();
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
          } catch (e: unknown) {
            message.error(getErrorMessage(e));
          }
        },
      });
    },
    [refetch],
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
        header: 'MÃ KHÓA HỌC',
        cell: ({ row }) => <div className="text-sm font-medium">{row.original.courseCode}</div>,
      },
      {
        accessorKey: 'courseName',
        header: 'TÊN KHÓA HỌC',
      },
      {
        accessorKey: 'isActive',
        header: 'TRẠNG THÁI',
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge className="bg-green-100 text-green-700">Hoạt động</Badge>
          ) : (
            <Badge className="bg-orange-100 text-orange-600">Ngừng hoạt động</Badge>
          ),
      },
      {
        id: 'subjects',
        header: 'SỐ MÔN HỌC',
        cell: ({ row }) => {
          const count = row.original.numberOfSubject ?? row.original.courseSubjects?.length ?? 0;
          return `${count} môn học`;
        },
      },
      {
        id: 'requests',
        header: 'SỐ YÊU CẦU',
        cell: ({ row }) => `${row.original.requests?.length ?? 0} yêu cầu`,
      },
      {
        accessorKey: 'updatedAt',
        header: 'CẬP NHẬT',
        cell: ({ row }) =>
          row.original.updatedAt ? dayjs(row.original.updatedAt).format('DD/MM/YYYY') : '—',
      },
      {
        id: 'actions',
        header: 'HÀNH ĐỘNG',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex gap-2 items-center">
            {isManager ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void handleView(row.original)}
                aria-label="Xem chi tiết"
              >
                <Eye size={16} className="text-gray-800" />
              </Button>
            ) : (
              <TableTextAction onClick={() => void handleView(row.original)} />
            )}
            {canEdit && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void openEditModal(row.original)}
                  title="Sửa"
                >
                  <Pencil size={16} className="text-blue-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleToggleActive(row.original)}
                  title={row.original.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                >
                  {row.original.isActive ? (
                    <PowerOff size={16} className="text-red-500" />
                  ) : (
                    <Power size={16} className="text-green-600" />
                  )}
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [isManager, canEdit, handleView, openEditModal, handleToggleActive],
  );

  if (context.position === 'toolbar') {
    return (
      <div className="flex gap-3">
        <HoverSearch placeholder="Tìm khóa học..." value={search} onChange={setSearch} />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-lg font-semibold text-black">Quản lý khóa học</h2>
          <p className="text-xs text-gray-500">Danh sách khóa học trong hệ thống</p>
        </div>
        {canEdit && (
          <Button className="bg-[#2197C0] hover:bg-[#208AAE] text-white" onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1" />
            Thêm khóa học
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-4">
        {loading && <div className="text-sm text-gray-500 mb-3">Đang tải...</div>}
        <DataTable
          columns={columns}
          data={data}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(page) => setPageNumber(page)}
        />
      </div>

      <CourseDetailDrawer
        open={detailOpen}
        onClose={closeDetailFromUrl}
        detailCourse={detailCourse}
        detailLoading={detailLoading}
        onSubjectClick={(subjectId) => {
          navigate(`/manager/courses/subjects?openDetail=1&subjectId=${subjectId}`);
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
        className={`fixed top-0 right-0 h-full w-[820px] max-w-[95vw] bg-[#f3f4f6] z-50
        transition-transform duration-300
        ${!readOnly && openEdit ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar text-gray-700">
          <div className="px-6 py-5 bg-[#f3f4f6] border-b">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold text-black">
                  {isCreating ? 'Tạo khóa học' : 'Cập nhật khóa học'}
                </h2>
                <p className="text-sm text-gray-500">
                  {isCreating
                    ? 'Tạo mới một khóa học trong hệ thống.'
                    : 'Chỉnh sửa thông tin cơ bản của khóa học.'}
                </p>
              </div>
              <button
                onClick={closeEditModal}
                className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Mã khóa học</Label>
              <Input value={courseCode} onChange={(e) => setCourseCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tên khóa học</Label>
              <Input value={courseName} onChange={(e) => setCourseName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Mô tả (tùy chọn)</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Mô tả ngắn về khóa học"
              />
            </div>

            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between">
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
                Gạt để bật/tắt môn đã gán; thêm mới qua nút bên trên (tick nhiều ô rồi bấm Lưu).
              </p>

              <div className="stoms-scrollbar max-h-[40vh] overflow-y-auto rounded-md border bg-muted/20 p-3 pr-2">
                {courseSubjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Chưa gán môn nào. Nhấn &quot;Thêm môn&quot; để chọn.</p>
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
                          className="flex items-center justify-between rounded-md border bg-white px-3 py-2"
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium text-black truncate">{name}</span>
                            <span className="text-xs text-gray-500">ID: {cs.subjectId}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-gray-500 hidden sm:inline">
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

            {showAddSubject && (
              <div className="space-y-2 rounded-md border bg-white p-3">
                <div className="flex items-center justify-between">
                  <Label>Thêm môn học</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddSubject(false)}>
                    Đóng
                  </Button>
                </div>
                <div className="text-xs text-gray-500 mb-1">
                  Chọn một hoặc nhiều môn chưa gán; bấm <strong>Lưu</strong> để gán hàng loạt.
                </div>
                <div className="stoms-scrollbar max-h-64 overflow-y-auto rounded-md border bg-muted/20 p-3 pr-2">
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
                              className="flex w-full cursor-pointer items-center gap-3 rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50"
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
                              <span className="text-xs text-gray-400">#{s.subjectId}</span>
                            </label>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-auto border-t bg-white p-4">
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
