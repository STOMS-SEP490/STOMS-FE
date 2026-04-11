import type { SubjectListItem } from '@/modules/subject/subject';

export type CourseSubjectSummary = {
  courseId?: number;
  subjectId: number;
  subjectName?: string;
  isActive?: boolean;
  createdAt?: string | null;
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
  note?: string | null;
  reason?: string | null;
  approvedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CourseListItem = {
  courseId: number;
  courseCode: string;
  courseName: string;
  /** API getById / form chỉnh sửa (nếu DTO có trường tương ứng) */
  description?: string | null;
  isActive: boolean;
  updatedAt: string;
  /** TimeSpan từ API — JSON thường là chuỗi "HH:mm:ss" hoặc "d.HH:mm:ss" */
  duration?: string | null;
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

