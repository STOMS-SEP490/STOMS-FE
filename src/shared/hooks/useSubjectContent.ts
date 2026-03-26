import { useState } from 'react';
import subjectService from '@/modules/subject/api/subjectApi';
import type { SubjectListItem } from '@/modules/subject/subject';

export type SubjectDropdownItem = {
  id: number;
  name: string;
};

export type SubjectSessionApi = {
  subjectSessionId: number;
  duration: string;
  sessionNo: number;
  title: string;
};

export const useSubjectContent = () => {
  const [sessions, setSessions] = useState<SubjectSessionApi[]>([]);
  const [loading, setLoading] = useState(false);

  // ================= FETCH SUBJECT LIST =================
  const fetchList = async (): Promise<SubjectDropdownItem[]> => {
    try {
      setLoading(true);

      const res = await subjectService.getSubjects({
        pageNumber: 1,
        pageSize: 100,
        IsActive: true,
      });

      return (res.items ?? []).map((x: SubjectListItem) => ({
        id: x.subjectId,
        name: `${x.subjectCode} - ${x.subjectName}`,
      }));
    } finally {
      setLoading(false);
    }
  };

  // ================= FETCH SUBJECT DETAIL =================
  const fetchDetail = async (id: number) => {
    try {
      setLoading(true);

      const subject = await subjectService.getById(id);

      const mappedSessions: SubjectSessionApi[] =
        subject.subjectSessions
          ?.sort((a, b) => a.sessionNo - b.sessionNo)
          .map((s) => ({
            subjectSessionId: s.subjectSessionId,
            duration: s.duration,
            sessionNo: s.sessionNo,
            title: s.title,
          })) ?? [];

      setSessions(mappedSessions);
    } finally {
      setLoading(false);
    }
  };

  const clearSessions = () => {
    setSessions([]);
  };

  return {
    sessions,
    loading,
    fetchList,
    fetchDetail,
    clearSessions,
  };
};