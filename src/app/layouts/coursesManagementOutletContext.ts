import type { CourseListStatusFilter } from '@/modules/course/hooks/useCourses';

/** Context từ `CoursesManagementLayout` (trang khóa học hoặc trang môn học) — 2 Outlet: toolbar + nội dung; state danh sách nâng lên layout. */
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
