import type { SubjectListItem } from '@/modules/subject/subject'

export type TopicEventSessionItem = {
  // tùy chỉnh thêm khi cần, hiện tại FE chưa dùng chi tiết
  eventSessionId: number
}

export type TopicTeamItem = {
  // placeholder cho team-topic; chi tiết sẽ bổ sung khi cần
  teamId: number
}

export type TopicListItem = {
  topicId: number
  topicName: string
  description: string
  isActive: boolean
  createdAt: string | null
  eventSessionTopics?: TopicEventSessionItem[] | null
  subjects?: SubjectListItem[] | null
  teamTopics?: TopicTeamItem[] | null
}

export type TopicUpsertPayload = {
  topicName: string
  description: string
}

export type TopicFilterParams = {
  pageNumber?: number
  pageSize?: number
  topicId?: number
  topicName?: string
}

