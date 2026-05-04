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
        const items = res.items ?? []
        // /pc/requests/create: chỉ cho chọn chương trình học có số buổi > 0
        const filtered = items.filter((c) => Number(c.numberOfSession ?? 0) > 0)
        if (!cancelled) setCourses(filtered)
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
