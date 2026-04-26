import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import courseApi from '../api/courseApi';
import type { CourseListItem } from '../courseType';
import { getErrorMessage } from '@/shared/lib/errorMessage';

/** Drawer chi tiết chương trình học + đồng bộ query `openDetail` / `courseId`. */
export function useCourseDetailDrawer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const openDetailFromUrl = searchParams.get('openDetail');
  const courseIdFromUrl = searchParams.get('courseId');
  const skipNextAutoOpenRef = useRef(false);
  const lastOpenedCourseIdRef = useRef<number | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailCourse, setDetailCourse] = useState<CourseListItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const closeDetailFromUrl = useCallback(() => {
    setSearchParams((prev) => {
      if (prev.get('openDetail') === '1') {
        skipNextAutoOpenRef.current = true;
      }
      const next = new URLSearchParams(prev);
      next.delete('openDetail');
      next.delete('courseId');
      return next;
    });
    setDetailOpen(false);
    setDetailCourse(null);
    setDetailLoading(false);
  }, [setSearchParams]);

  const openDetailById = useCallback(async (id: number) => {
    try {
      setDetailLoading(true);
      const detail = await courseApi.getById(id);
      setDetailCourse(detail);
      lastOpenedCourseIdRef.current = id;
      setDetailOpen(true);
    } catch (e: unknown) {
      message.error(getErrorMessage(e));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (openDetailFromUrl !== '1') return;
    if (!courseIdFromUrl) return;
    if (skipNextAutoOpenRef.current) {
      skipNextAutoOpenRef.current = false;
      return;
    }

    const id = Number(courseIdFromUrl);
    if (!id || Number.isNaN(id)) return;
    if (detailOpen && lastOpenedCourseIdRef.current === id) return;

    void openDetailById(id);
  }, [openDetailFromUrl, courseIdFromUrl, detailOpen, openDetailById]);

  return {
    detailOpen,
    detailCourse,
    detailLoading,
    closeDetailFromUrl,
    openDetailById,
  };
}
