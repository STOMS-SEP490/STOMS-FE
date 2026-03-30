import dayjs from 'dayjs';
import { Drawer } from 'antd';
import type { CourseListItem, CourseSubjectSummary } from '../courseType';

type Props = {
  open: boolean;
  onClose: () => void;
  detailCourse: CourseListItem | null;
  detailLoading: boolean;
  onSubjectClick?: (subjectId: number) => void;
};

export function CourseDetailDrawer({
  open,
  onClose,
  detailCourse,
  detailLoading,
  onSubjectClick,
}: Props) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      width={680}
      title={detailCourse ? `Khóa học ${detailCourse.courseCode}` : 'Chi tiết khóa học'}
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
              <div className="text-sm">{detailCourse.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="text-xs text-gray-500">Cập nhật lần cuối</div>
              <div className="text-sm">
                {detailCourse.updatedAt ? dayjs(detailCourse.updatedAt).format('DD/MM/YYYY') : '—'}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <div className="text-xs text-gray-500 mb-1">Môn học trong khóa</div>
            {detailCourse.courseSubjects && detailCourse.courseSubjects.length > 0 ? (
              <div className="space-y-2 p-1">
                {detailCourse.courseSubjects.map((cs: CourseSubjectSummary) => {
                  const subjectId = Number(cs.subjectId);
                  const canClick = Boolean(onSubjectClick) && Number.isFinite(subjectId) && subjectId > 0;
                  return (
                    <button
                      key={cs.subjectId}
                      type="button"
                      className={`w-full text-left rounded-md border border-slate-200 bg-white p-2 space-y-1 ring-1 ring-slate-200 ${
                        canClick ? 'hover:bg-slate-50 hover:border-slate-300 hover:ring-slate-300 cursor-pointer' : ''
                      }`}
                      onClick={() => {
                        if (!canClick) return;
                        onSubjectClick?.(subjectId);
                      }}
                      disabled={!canClick}
                      title={canClick ? 'Xem chi tiết môn học' : undefined}
                    >
                      <div className="text-sm font-medium">
                        {cs.subject?.subjectCode} -{' '}
                        {cs.subject?.subjectName ?? cs.subjectName ?? `Môn #${cs.subjectId}`}
                      </div>

                    {cs.subject?.subjectSessions && cs.subject.subjectSessions.length > 0 && (
                      <div className="pl-3 border-l border-gray-200 mt-1 space-y-1">
                        {cs.subject.subjectSessions.map((ss) => (
                          <div key={ss.subjectSessionId} className="text-xs text-gray-600">
                            Buổi {ss.sessionNo}: {ss.title ?? '—'}
                          </div>
                        ))}
                      </div>
                    )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-gray-500">Chưa có môn học nào trong khóa.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-500">Không có dữ liệu.</div>
      )}
    </Drawer>
  );
}
