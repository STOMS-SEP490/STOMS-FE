import { useState, useCallback } from 'react'
import type { Dayjs } from 'dayjs'
import type { SessionFormItem } from '../createRequestTypes'
import type { ScheduleMode } from '../createRequestTypes'

function parseDuration(duration: string): { h: number; m: number; s: number } {
  const parts = duration.split(':').map(Number)
  return {
    h: parts[0] ?? 0,
    m: parts[1] ?? 0,
    s: parts[2] ?? 0,
  }
}

export function useCreateRequestSchedule() {
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('daily')
  const [gapDays, setGapDays] = useState(1)

  const calculateEndTime = useCallback((start: Dayjs, duration: string): Dayjs => {
    const { h, m, s } = parseDuration(duration)
    return start.add(h, 'hour').add(m, 'minute').add(s, 'second')
  }, [])

  const applyAutoSchedule = useCallback(
    (baseDate: Dayjs, baseSessions: SessionFormItem[]): SessionFormItem[] => {
      const gap =
        scheduleMode === 'daily'
          ? 1
          : scheduleMode === 'weekly'
            ? 7
            : Math.max(1, gapDays || 1)

      return baseSessions.map((s, idx) => {
        const date = baseDate.add(idx * gap, 'day')
        // Nếu session đã có startAt (khi edit), giữ nguyên phần giờ/phút/giây đó.
        // Khi tạo mới, startAt thường chưa tồn tại => mặc định 08:00:00.
        const preservedHour = s.startAt?.hour() ?? 8
        const preservedMinute = s.startAt?.minute() ?? 0
        const preservedSecond = s.startAt?.second() ?? 0
        const start = date.hour(preservedHour).minute(preservedMinute).second(preservedSecond)
        const end = calculateEndTime(start, s.duration)
        return {
          ...s,
          startAt: start,
          endAt: end,
        }
      })
    },
    [scheduleMode, gapDays, calculateEndTime]
  )

  return {
    scheduleMode,
    setScheduleMode,
    gapDays,
    setGapDays,
    applyAutoSchedule,
    calculateEndTime,
  }
}
