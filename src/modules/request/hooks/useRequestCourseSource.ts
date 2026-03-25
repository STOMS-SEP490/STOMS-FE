import { useEffect, useState } from 'react'
import type { CourseListItem } from '@/modules/course/courseType'
import courseApi from '@/modules/course/api/courseApi'
import type { SourceType } from '../createRequestTypes'

export function useRequestCourseSource(sourceType: SourceType) {
  const [courses, setCourses] = useState<CourseListItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (sourceType !== 'course') return
    let cancelled = false
    const fetchCourses = async () => {
      setLoading(true)
      try {
        const res = await courseApi.getCourses({
          pageNumber: 1,
          pageSize: 100,
              IsActive: true,
        })
        if (!cancelled) setCourses(res.items ?? [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchCourses()
    return () => {
      cancelled = true
    }
  }, [sourceType])

  return { courses, loading }
}
