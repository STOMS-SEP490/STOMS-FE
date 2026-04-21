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
        // Khi tạo mới, lấy giờ từ baseDate (giờ user chọn ở "Ngày bắt đầu").
        const preservedHour = s.startAt?.hour() ?? baseDate.hour()
        const preservedMinute = s.startAt?.minute() ?? baseDate.minute()
        const preservedSecond = s.startAt?.second() ?? baseDate.second()
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
