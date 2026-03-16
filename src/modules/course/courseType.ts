import type { SubjectListItem } from '@/modules/subject/subject';

export type CourseSubjectSummary = {
  subjectId: number;
  subjectName?: string;
  isActive?: boolean;
  subject?: SubjectListItem;
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
  /** API trả về: NumberOfSubject (camelCase: numberOfSubject) */
  numberOfSubject?: number | null;
  /** API trả về: NumberOfSession (camelCase: numberOfSession) */
  numberOfSession?: number | null;
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

