import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil, Power, PowerOff, Plus, X } from 'lucide-react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { Drawer, Modal, message } from 'antd';
import courseApi from '@/modules/course/api/courseApi';
import courseSubjectApi from '@/modules/course/api/courseSubjectApi';
import type { CourseListItem } from '../courseType';
import type { SubjectListItem } from '@/modules/subject/subject';
import subjectApi from '@/modules/subject/api/subjectApi';
import { Badge } from '@/shared/components/ui/badge';
import HoverSearch from '@/shared/components/ui/search';
import { DataTable } from '@/shared/components/common/DataTable';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { getErrorMessage } from '@/shared/lib/errorMessage';

export default function CoursesManagement() {
  const context = useOutletContext<{ position: string }>();

  const [data, setData] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  const [openEdit, setOpenEdit] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseListItem | null>(null);
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [description, setDescription] = useState('');
  const [allSubjects, setAllSubjects] = useState<SubjectListItem[]>([]);
  /** Danh sách course-subject đã gán (có isActive) — bật/tắt bằng Switch, Lưu mới gọi API */
  const [courseSubjects, setCourseSubjects] = useState<
    { subjectId: number; subjectName?: string; isActive?: boolean }[]
  >([]);
  const [initialCourseSubjects, setInitialCourseSubjects] = useState<
    { subjectId: number; subjectName?: string; isActive?: boolean }[]
  >([]);
  const [pendingSubjectIdsToAdd, setPendingSubjectIdsToAdd] = useState<number[]>([]);
  const [showAddSubject, setShowAddSubject] = useState(false);

  // Auto-open detail drawer từ query param trong URL
  const [searchParams, setSearchParams] = useSearchParams();
  const openDetailFromUrl = searchParams.get('openDetail');
  const courseIdFromUrl = searchParams.get('courseId');
  const skipNextAutoOpenRef = useRef(false);
  const lastOpenedCourseIdRef = useRef<number | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCourse, setDetailCourse] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const closeDetailFromUrl = () => {
    if (openDetailFromUrl === '1') {
      skipNextAutoOpenRef.current = true;
    }
    setDetailOpen(false);
    setDetailCourse(null);
    setDetailLoading(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openDetail');
      next.delete('courseId');
      return next;
    });
  };

  const openDetailById = async (id: number) => {
    try {
      setDetailLoading(true);
      const detail = await courseApi.getById(id);
      setDetailCourse(detail);
      lastOpenedCourseIdRef.current = id;
      setDetailOpen(true);
    } catch (e: any) {
      message.error(getErrorMessage(e?.response?.data ?? e));
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);

      const res = await courseApi.getCourses({
        pageNumber,
        pageSize,
        CourseName: search || undefined,
      });

      setData(res.items ?? []);
      setTotalItems(res.totalItems ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [pageNumber, search]);

  useEffect(() => {
    subjectApi
      .getSubjects({ pageNumber: 1, pageSize: 500, isActive: true })
      .then((res) => setAllSubjects(res.items ?? []))
      .catch(() => setAllSubjects([]));
  }, []);

  useEffect(() => {
    if (openDetailFromUrl !== '1') return;
    if (!courseIdFromUrl) return;
    if (skipNextAutoOpenRef.current) {
      skipNextAutoOpenRef.current = false;
      return;
    }

    const id = Number(courseIdFromUrl);
    if (!id || Number.isNaN(id)) return;
    if (detailOpen && lastOpenedCourseIdRef.current === id) return;

    void openDetailById(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDetailFromUrl, courseIdFromUrl]);

  const openCreateModal = () => {
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

  const openEditModal = async (c: CourseListItem) => {
    setIsCreating(false);
    try {
      const detail = await courseApi.getById(c.courseId);
      setEditingCourse(detail);
      setCourseCode(detail.courseCode ?? '');
      setCourseName(detail.courseName ?? '');
      setDescription((detail as any).description ?? '');
      const list = ((detail.courseSubjects ?? []) as any[]).map((cs) => ({
        subjectId: Number(cs.subjectId),
        subjectName:
          cs.subject?.subjectName ??
          cs.subjectName ??
          allSubjects.find((x) => x.subjectId === Number(cs.subjectId))?.subjectName ??
          `Môn #${cs.subjectId}`,
        isActive: cs.isActive === undefined ? true : Boolean(cs.isActive),
      }));
      setCourseSubjects(list);
      setInitialCourseSubjects(list.map((x) => ({ ...x })));
      setPendingSubjectIdsToAdd([]);
      setShowAddSubject(false);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Không tải được chi tiết khóa học';
      message.error(msg);
      setEditingCourse(c);
      setCourseCode(c.courseCode ?? '');
      setCourseName(c.courseName ?? '');
      setDescription('');
      const list = ((c.courseSubjects ?? []) as any[]).map((cs) => ({
        subjectId: Number(cs.subjectId),
        subjectName:
          cs.subject?.subjectName ??
          cs.subjectName ??
          allSubjects.find((x) => x.subjectId === Number(cs.subjectId))?.subjectName ??
          `Môn #${cs.subjectId}`,
        isActive: cs.isActive === undefined ? true : Boolean(cs.isActive),
      }));
      setCourseSubjects(list);
      setInitialCourseSubjects(list.map((x) => ({ ...x })));
      setPendingSubjectIdsToAdd([]);
      setShowAddSubject(false);
    } finally {
      setOpenEdit(true);
    }
  };

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
        await fetchCourses();
        return;
      }

      if (!editingCourse) return;

      await courseApi.update(editingCourse.courseId, payloadBase);

      // 1) bật/tắt (bulk) theo diff so với lúc mở modal
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

      // 2) gán thêm (bulk)
      const toAddIds = Array.from(
        new Set(pendingSubjectIdsToAdd.filter((id) => !courseSubjects.some((cs) => cs.subjectId === id))),
      );
      if (toAddIds.length > 0) {
        await courseSubjectApi.assignBulk(editingCourse.courseId, toAddIds);
      }

      message.success('Cập nhật khóa học thành công');
      setOpenEdit(false);
      await fetchCourses();
    } catch (e: any) {
      message.error(getErrorMessage(e?.response?.data ?? e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (c: CourseListItem) => {
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
          await fetchCourses();
        } catch (e: any) {
          message.error(getErrorMessage(e?.response?.data ?? e));
        }
      },
    });
  };

  const handleView = async (c: CourseListItem) => {
    await openDetailById(c.courseId);
  };

  const columns = useMemo<ColumnDef<CourseListItem>[]>(
    () => [
      {
        accessorKey: 'courseCode',
        header: 'MÃ KHÓA HỌC',
        cell: ({ row }) => (
          <div className="text-sm font-medium">
            {row.original.courseCode}
          </div>
        ),
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
            <Badge className="bg-green-100 text-green-700">
              Hoạt động
            </Badge>
          ) : (
            <Badge className="bg-orange-100 text-orange-600">
              Ngừng hoạt động
            </Badge>
          ),
      },
      {
        id: 'subjects',
        header: 'SỐ MÔN HỌC',
        cell: ({ row }) => {
          const count =
            row.original.numberOfSubject ??
            row.original.courseSubjects?.length ??
            0;
          return `${count} môn học`;
        },
      },
      {
        id: 'requests',
        header: 'SỐ YÊU CẦU',
        cell: ({ row }) =>
          `${row.original.requests?.length ?? 0} yêu cầu`,
      },
      {
        accessorKey: 'updatedAt',
        header: 'CẬP NHẬT',
        cell: ({ row }) =>
          row.original.updatedAt
            ? dayjs(row.original.updatedAt).format('DD/MM/YYYY')
            : '—',
      },
      {
        id: 'actions',
        header: 'HÀNH ĐỘNG',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex gap-2 items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleView(row.original)}
              title="Xem chi tiết"
            >
              <Eye size={16} className="text-gray-800" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEditModal(row.original)}
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
          </div>
        ),
      },
    ],
    []
  );

  if (context.position === 'toolbar') {
    return (
      <div className="flex gap-3">
        <HoverSearch
          placeholder="Tìm khóa học..."
          value={search}
          onChange={setSearch}
        />
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
        <Button
          className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
          onClick={openCreateModal}
        >
          <Plus className="w-4 h-4 mr-1" />
          Thêm khóa học
        </Button>
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

      <Drawer
        open={detailOpen}
        onClose={closeDetailFromUrl}
        placement="right"
        width={680}
        title={
          detailCourse ? `Khóa học ${detailCourse.courseCode}` : 'Chi tiết khóa học'
        }
      >
        {detailLoading && !detailCourse ? (
          <div className="text-sm text-gray-500">Đang tải chi tiết...</div>
        ) : detailCourse ? (
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            <div>
              <div className="text-xs text-gray-500">Tên khóa học</div>
              <div className="text-sm font-medium">{detailCourse.courseName}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border p-2">
                <div className="text-xs text-gray-500">Trạng thái</div>
                <div className="text-sm">
                  {detailCourse.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                </div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-gray-500">Cập nhật lần cuối</div>
                <div className="text-sm">
                  {detailCourse.updatedAt
                    ? dayjs(detailCourse.updatedAt).format('DD/MM/YYYY')
                    : '—'}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <div className="text-xs text-gray-500 mb-1">Môn học trong khóa</div>
              {detailCourse.courseSubjects && detailCourse.courseSubjects.length > 0 ? (
                <div className="space-y-2">
                  {detailCourse.courseSubjects.map((cs: any) => (
                    <div
                      key={cs.subjectId}
                      className="rounded-md border p-2 space-y-1"
                    >
                      <div className="text-sm font-medium">
                        {cs.subject?.subjectCode} -{' '}
                        {cs.subject?.subjectName ??
                          cs.subjectName ??
                          `Môn #${cs.subjectId}`}
                      </div>

                      {cs.subject?.subjectSessions && cs.subject.subjectSessions.length > 0 && (
                        <div className="pl-3 border-l border-gray-200 mt-1 space-y-1">
                          {cs.subject.subjectSessions.map((ss: any) => (
                            <div
                              key={ss.subjectSessionId}
                              className="text-xs text-gray-600"
                            >
                              Buổi {ss.sessionNo}: {ss.title ?? '—'}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  Chưa có môn học nào trong khóa.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">Không có dữ liệu.</div>
        )}
      </Drawer>

      {/* Sidebar upsert (giống detail) */}
      {openEdit && (
        <div
          className="fixed inset-0 bg-black/30 z-40 h-full"
          onClick={closeEditModal}
          aria-hidden
        />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-[820px] max-w-[95vw] bg-[#f3f4f6] z-50
        transition-transform duration-300
        ${openEdit ? 'translate-x-0' : 'translate-x-full'}`}
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

            {/* Môn học — Switch + thêm nhiều rồi Lưu */}
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
                onClick={handleSubmitEdit}
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