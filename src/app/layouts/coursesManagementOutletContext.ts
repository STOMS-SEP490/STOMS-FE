import type { CourseListStatusFilter } from '@/modules/course/hooks/useCourses';

/** Context từ `CoursesManagementLayout` — 2 Outlet: state danh sách nâng lên layout cho khóa học / môn học. */
export type CoursesManagementLayoutOutletContext = {
  position: string;
  courseListLifted?: true;
  courseListSearch?: string;
  setCourseListSearch?: (v: string) => void;
  courseListStatusFilter?: CourseListStatusFilter;
  setCourseListStatusFilter?: (v: CourseListStatusFilter) => void;
  courseListPage?: number;
  setCourseListPage?: (n: number) => void;
  subjectListLifted?: true;
  subjectListSearch?: string;
  setSubjectListSearch?: (v: string) => void;
  subjectListPage?: number;
  setSubjectListPage?: (n: number) => void;
};
