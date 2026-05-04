import { useState, useCallback } from 'react'
import subjectApi from '@/modules/subject/api/subjectApi'
import courseApi from '@/modules/course/api/courseApi'
import eventApi from '@/modules/event/api/eventApi'
import type { SubjectListItem } from '@/modules/subject/subject'
import type { SessionFormItem } from '../createRequestTypes'

export function useLoadRequestSessions() {
  const [loading, setLoading] = useState(false)

  const loadSubjectSessions = useCallback(
    async (subjectId: number, defaultLocation: string): Promise<SessionFormItem[]> => {
      setLoading(true)
      try {
        const subject = await subjectApi.getById(subjectId)
        const list = subject.subjectSessions ?? []
        return list.map((s) => ({
          sessionNo: s.sessionNo,
          subjectSessionId: s.subjectSessionId,
          eventSessionId: null,
          title: s.title ?? '',
          duration: s.duration ?? '02:00:00',
          // Mặc định ghi chú rỗng để FE không tự điền vào textarea.
          notes: '',
          teachersRequired: 1,
          tasRequired: 1,
          location: defaultLocation || '',
          usesDefaultLocation: true,
          isOnline: false,
        }))
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const loadEventSessions = useCallback(
    async (eventId: number, defaultLocation: string): Promise<SessionFormItem[]> => {
      setLoading(true)
      try {
        // NOTE:
        // BE /api/events/filter luôn null `EventSessions` để tối ưu payload,
        // nên FE cần gọi /api/events/{id} (includeDetails) để lấy đúng sessions.
        const event = await eventApi.getById(eventId)
        const list = (event.eventSessions ?? []) as Array<{
          eventSessionId?: number
          sessionNo?: number | null
          duration?: string | null
          title?: string | null
        }>

        return list.map((s, index) => ({
          sessionNo: Number(s.sessionNo ?? index + 1) || index + 1,
          subjectSessionId: null,
          eventSessionId: s.eventSessionId ?? null,
          title: s.title ?? '',
          duration: s.duration ?? '02:00:00',
          // Mặc định ghi chú rỗng để người dùng tự nhập.
          notes: '',
          teachersRequired: 1,
          tasRequired: 1,
          location: defaultLocation || '',
          usesDefaultLocation: true,
          isOnline: false,
        }))
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const loadCourseSubjects = useCallback(async (courseId: number): Promise<SubjectListItem[]> => {
    setLoading(true)
    try {
      const course = await courseApi.getById(courseId)
      const rawList = (course.courseSubjects ?? []) as {
        subjectId: number
        isActive?: boolean
        subject?: SubjectListItem
        subjectName?: string
      }[]
      return rawList
        .filter((cs) => (cs.isActive ?? true) === true)
        .map((cs) => cs.subject)
        .filter(Boolean) as SubjectListItem[]
    } finally {
      setLoading(false)
    }
  }, [])

  return { loadSubjectSessions, loadEventSessions, loadCourseSubjects, loading }
}
