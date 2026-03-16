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
  subjectSessions?: {
    title: string;
    description: string;
    sessionNo: number;
    duration: string;
  }[];
};

type SessionTemplateForm = {
  sessionNo: number;
  title: string;
  duration: string;
  subjectSessionId: number;

  description?: string;

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
  /** Tên chủ đề (API GetById trả về khi có include Topic). */
  topicName?: string | null;
  numberOfSession: number;
  createdAt: string | null;
  updatedAt: string | null;

  subjectSessions?: SessionTemplateForm[] | null;

  courseSubjects?: {
    courseId: number;
    subjectId: number;
    createdAt: string | null;
  }[] | null;

  subjectSkills?: {
    subjectId: number;
    skillId: number;
    createdAt: string | null;
    skill?: {
      skillId: number;
      skillName: string;
      description: string;
      isActive: boolean;
    } | null;
  }[] | null;
};