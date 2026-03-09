export type SubjectFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  subjectId?: number;
  subjectCode?: string;
  subjectName?: string;
  topicId?: number;
  isActive?: boolean;
};

type SessionTemplateForm = {
  sessionNo: number;
  title: string;
  duration: string;
  subjectSessionId: number;

  teachersRequired?: number;
  tasRequired?: number;
  location?: string;
};

export type SubjectListItem = {
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  description: string;
  topicId: number;
  numberOfSession: number;
  createdAt: string;
  updatedAt: string;

  subjectSessions?: SessionTemplateForm[] | null;
};