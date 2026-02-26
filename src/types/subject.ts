export type Subject = {
  subjectId: number;
  subjectName: string;
  description?: string;
};

export type SubjectFilterParams = {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
};
