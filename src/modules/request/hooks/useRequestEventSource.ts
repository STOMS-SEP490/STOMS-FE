import { useEffect, useState } from 'react'
import type { EventListItem } from '@/modules/event/event'
import eventApi from '@/modules/event/api/eventApi'
import type { SourceType } from '../createRequestTypes'

export function useRequestEventSource(sourceType: SourceType) {
  const [events, setEvents] = useState<EventListItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (sourceType !== 'event') return
    let cancelled = false
    const fetchEvents = async () => {
      setLoading(true)
      try {
        const res = await eventApi.getEvents({
          pageNumber: 1,
          pageSize: 100,
          isActive: true,
        })
        if (!cancelled) setEvents(res.items ?? [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchEvents()
    return () => {
      cancelled = true
    }
  }, [sourceType])

  return { events, loading }
}
