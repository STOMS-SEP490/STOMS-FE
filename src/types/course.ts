// types/course.ts

export type CourseSubjectSummary = {
  subjectId: number;
  subjectName: string;
};

export type CourseRequestSummary = {
  requestId: number;
  requestCode: string;
  requestName: string;
  customerName: string;
  startDate: string;
  sessionsRequired: number;
  status: string;
};

export type CourseListItem = {
  courseId: number;
  courseCode: string;
  courseName: string;
  isActive: boolean;
  updatedAt: string;

  courseSubjects?: CourseSubjectSummary[] | null;
  requests?: CourseRequestSummary[] | null;
};

export type CourseFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  CourseId?: number;
  CourseCode?: string;
  CourseName?: string;
  IsActive?: boolean;
};