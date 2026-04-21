import type { Dayjs } from 'dayjs'

export type SourceType = 'subject' | 'course' | 'event'
export type ScheduleMode = 'continuous' | 'daily' | 'everyNDays' | 'weekly'

export type SessionFormItem = {
  sessionNo: number
  subjectSessionId: number | null
  eventSessionId: number | null
  courseSubjectId?: number | null
  courseSubjectName?: string | null
  title: string
  duration: string
  notes: string
  startAt?: Dayjs
  endAt?: Dayjs
  teachersRequired: number
  tasRequired: number
  location: string
  usesDefaultLocation: boolean
  isOnline: boolean
}

export type AttachmentFormItem = {
  fileName: string
  fileUrl: string
}
