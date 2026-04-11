import { useEffect, useState } from 'react';
import subjectApi from '@/modules/subject/api/subjectApi';
import type { SubjectListItem } from '@/modules/subject/subject';

const DEFAULT_PAGE_SIZE = 500;

/** Danh sách môn đang hoạt động (cho form gán môn vào khóa học). */
export function useActiveSubjects(pageSize: number = DEFAULT_PAGE_SIZE) {
  const [allSubjects, setAllSubjects] = useState<SubjectListItem[]>([]);

  useEffect(() => {
    subjectApi
      .getSubjects({ pageNumber: 1, pageSize, IsActive: true })
      .then((res) => setAllSubjects(res.items ?? []))
      .catch(() => setAllSubjects([]));
  }, [pageSize]);

  return allSubjects;
}
