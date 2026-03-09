export type SubjectFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  subjectId?: number;
  subjectCode?: string;
  subjectName?: string;
  topicId?: number;
  isActive?: boolean;
};

export type SubjectUpsertPayload = {
  subjectCode: string;
  subjectName: string;
  description: string;
  topicId?: number | null;
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
  isActive: boolean;
  description: string;
  topicId: number | null;
  numberOfSession: number;
  createdAt: string | null;
  updatedAt: string | null;

  subjectSessions?: SessionTemplateForm[] | null;
};