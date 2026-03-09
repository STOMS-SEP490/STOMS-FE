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
          notes: s.title ?? '',
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
        const res = await eventApi.getEvents({
          pageNumber: 1,
          pageSize: 1,
          eventId,
        })
        const event = res.items?.[0] as any
        const list = (event?.eventSessions ?? []) as {
          eventSessionId: number
          sessionNo?: number
          duration?: string
          title?: string
        }[]
        return list.map((s, index) => ({
          sessionNo: s.sessionNo ?? index + 1,
          subjectSessionId: null,
          eventSessionId: s.eventSessionId,
          title: s.title ?? '',
          duration: (s.duration as string) ?? '02:00:00',
          notes: s.title ?? '',
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
        subject?: SubjectListItem
        subjectName?: string
      }[]
      return rawList.map((cs) => cs.subject).filter(Boolean) as SubjectListItem[]
    } finally {
      setLoading(false)
    }
  }, [])

  return { loadSubjectSessions, loadEventSessions, loadCourseSubjects, loading }
}
