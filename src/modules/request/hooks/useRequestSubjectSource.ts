import { useEffect, useState } from 'react'
import type { SubjectListItem } from '@/modules/subject/subject'
import subjectApi from '@/modules/subject/api/subjectApi'
import type { SourceType } from '../createRequestTypes'

export function useRequestSubjectSource(sourceType: SourceType) {
  const [subjects, setSubjects] = useState<SubjectListItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (sourceType !== 'subject') return
    let cancelled = false
    const fetchSubjects = async () => {
      setLoading(true)
      try {
        const res = await subjectApi.getSubjects({
          pageNumber: 1,
          pageSize: 100,
              IsActive: true,
        })
        if (!cancelled) setSubjects(res.items ?? [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchSubjects()
    return () => {
      cancelled = true
    }
  }, [sourceType])

  return { subjects, loading }
}
