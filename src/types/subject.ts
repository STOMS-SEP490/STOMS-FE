// types/subject.ts

export type SubjectListItem = {
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  isActive: boolean;
  description: string;
  topicId: number;
  numberOfSession: number;
  createdAt: string;
  updatedAt: string;

  courseSubjects?: any[] | null;
  subjectSessions?: any[] | null;
  subjectSkills?: any[] | null;
};

export type SubjectFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  SubjectId?: number;
  SubjectCode?: string;
  SubjectName?: string;
  TopicId?: number;
  IsActive?: boolean;
};