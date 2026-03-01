
export type SubjectSession = {
  subjectSessionId: number;
  sessionNo: number;
  title: string;
  duration: number; 
};

export type SubjectSessionFilterParams = {
  subjectId: number;
};