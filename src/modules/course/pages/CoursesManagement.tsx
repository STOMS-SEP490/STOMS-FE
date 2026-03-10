import { useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil, Power, PowerOff, Plus } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import dayjs from 'dayjs';
import { Modal, message } from 'antd';
import courseApi from '@/modules/course/api/courseApi';
import courseSubjectApi from '@/modules/course/api/courseSubjectApi';
import type { CourseListItem } from '../courseType';
import type { SubjectListItem } from '@/modules/subject/subject';
import subjectApi from '@/modules/subject/api/subjectApi';
import { Badge } from '@/shared/components/ui/badge';
import HoverSearch from '@/shared/components/ui/search';
import { DataTable } from '@/shared/components/common/DataTable';
import { Button } from '@/shared/components/ui/button';
import { Dialog } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';

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
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [currentCourseSubjectIds, setCurrentCourseSubjectIds] = useState<number[]>([]);

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

  const openCreateModal = () => {
    setIsCreating(true);
    setEditingCourse(null);
    setCourseCode('');
    setCourseName('');
    setDescription('');
    setSelectedSubjectIds([]);
    setCurrentCourseSubjectIds([]);
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
      const subjectIds = (detail.courseSubjects ?? []).map((s) => s.subjectId);
      setCurrentCourseSubjectIds(subjectIds);
      setSelectedSubjectIds(subjectIds);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Không tải được chi tiết khóa học';
      message.error(msg);
      setEditingCourse(c);
      setCourseCode(c.courseCode ?? '');
      setCourseName(c.courseName ?? '');
      setDescription('');
      const subjectIds = (c.courseSubjects ?? []).map((s) => s.subjectId);
      setCurrentCourseSubjectIds(subjectIds);
      setSelectedSubjectIds(subjectIds);
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

        if (selectedSubjectIds.length > 0) {
          await courseSubjectApi.assignBulk(created.courseId, selectedSubjectIds);
        }

        message.success('Tạo khóa học thành công');
        setOpenEdit(false);
        await fetchCourses();
        return;
      }

      if (!editingCourse) return;

      await courseApi.update(editingCourse.courseId, payloadBase);

      const toAdd = selectedSubjectIds.filter((id) => !currentCourseSubjectIds.includes(id));
      const toRemove = currentCourseSubjectIds.filter((id) => !selectedSubjectIds.includes(id));
      if (toRemove.length > 0) {
        await courseSubjectApi.removeMany(editingCourse.courseId, toRemove);
      }
      if (toAdd.length > 0) {
        await courseSubjectApi.assignBulk(editingCourse.courseId, toAdd);
      }

      message.success('Cập nhật khóa học thành công');
      setOpenEdit(false);
      await fetchCourses();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Có lỗi xảy ra';
      message.error(msg);
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
          const msg = e?.response?.data?.message || e?.message || 'Có lỗi xảy ra';
          message.error(msg);
        }
      },
    });
  };

  const handleView = async (c: CourseListItem) => {
    try {
      const detail: any = await courseApi.getById(c.courseId);
      Modal.info({
        title: `Khóa học ${detail.courseCode}`,
        width: 680,
        content: (
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            <div>
              <div className="text-xs text-gray-500">Tên khóa học</div>
              <div className="text-sm font-medium">{detail.courseName}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border p-2">
                <div className="text-xs text-gray-500">Trạng thái</div>
                <div className="text-sm">
                  {detail.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                </div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-gray-500">Cập nhật lần cuối</div>
                <div className="text-sm">
                  {detail.updatedAt ? dayjs(detail.updatedAt).format('DD/MM/YYYY') : '—'}
                </div>
              </div>
            </div>
            <div className="pt-2">
              <div className="text-xs text-gray-500 mb-1">Môn học trong khóa</div>
              {detail.courseSubjects && detail.courseSubjects.length > 0 ? (
                <div className="space-y-2">
                  {detail.courseSubjects.map((cs: any) => (
                    <div key={cs.subjectId} className="rounded-md border p-2 space-y-1">
                      <div className="text-sm font-medium">
                        {cs.subject?.subjectCode} - {cs.subject?.subjectName ?? cs.subjectName ?? `Môn #${cs.subjectId}`}
                      </div>
                      {cs.subject?.subjectSessions && cs.subject.subjectSessions.length > 0 && (
                        <div className="pl-3 border-l border-gray-200 mt-1 space-y-1">
                          {cs.subject.subjectSessions.map((ss: any) => (
                            <div key={ss.subjectSessionId} className="text-xs text-gray-600">
                              Buổi {ss.sessionNo}: {ss.title ?? '—'}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">Chưa có môn học nào trong khóa.</div>
              )}
            </div>
          </div>
        ),
        okText: 'Đóng',
      });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Không tải được chi tiết khóa học';
      message.error(msg);
    }
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
              <Eye size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEditModal(row.original)}
              title="Sửa"
            >
              <Pencil size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleToggleActive(row.original)}
              title={row.original.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
            >
              {row.original.isActive ? <PowerOff size={16} /> : <Power size={16} />}
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

      <Dialog
        open={openEdit}
        onClose={closeEditModal}
        title={isCreating ? 'Tạo khóa học' : 'Cập nhật khóa học'}
        description={
          isCreating
            ? 'Tạo mới một khóa học trong hệ thống.'
            : 'Chỉnh sửa thông tin cơ bản của khóa học.'
        }
        className="max-w-[520px]"
      >
        <div className="space-y-4">
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
          <div className="space-y-2">
            <Label>Môn học trong khóa (tùy chọn)</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border p-3">
                {allSubjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Đang tải danh sách môn học...</p>
                ) : (
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {allSubjects.map((s) => (
                      <label
                        key={s.subjectId}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSubjectIds.includes(s.subjectId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSubjectIds((prev) => [...prev, s.subjectId]);
                            } else {
                              setSelectedSubjectIds((prev) =>
                                prev.filter((id) => id !== s.subjectId),
                              );
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span>
                          {s.subjectCode} - {s.subjectName}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
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
      </Dialog>
    </div>
  );
}