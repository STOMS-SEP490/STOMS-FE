export type SubjectFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  subjectId?: number;
  subjectCode?: string;
  subjectName?: string;
  topicId?: number;
  IsActive?: boolean;
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

export type SubjectRequestSummary = {
  requestId: number;
  requestCode: string;
  requestName: string;
  customerName?: string | null;
  startDate?: string | null;
  sessionsRequired?: number | null;
  status?: string | null;
  note?: string | null;
  reason?: string | null;
  approvedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
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
  topicName?: string | null;
  numberOfSession: number;
  duration?: string | null;
  createdAt: string | null;
  updatedAt: string | null;

  subjectSessions?: SessionTemplateForm[] | null;

  courseSubjects?: {
    courseId: number;
    subjectId: number;
    createdAt: string | null;
    /** Một số endpoint trả thêm tên chương trình học */
    courseName?: string | null;
    /** Fallback nếu BE trả object lồng */
    course?: { courseId?: number; courseName?: string | null } | null;
  }[] | null;

  subjectSkills?: {
    subjectId: number;
    skillId: number;
    skillName?: string | null;
    isActive?: boolean;
    createdAt: string | null;
    skill?: {
      skillId: number;
      skillName: string;
      description: string;
      isActive: boolean;
    } | null;
  }[] | null;

  requests?: SubjectRequestSummary[] | null;
};