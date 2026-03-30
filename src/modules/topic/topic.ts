import type { SubjectListItem } from '@/modules/subject/subject'

export type TopicEventSessionItem = {
  // tùy chỉnh thêm khi cần, hiện tại FE chưa dùng chi tiết
  eventSessionId: number
}

export type TopicTeamItem = {
  // placeholder cho team-topic; chi tiết sẽ bổ sung khi cần
  teamId: number
}

/** GET /topics/{id} — sự kiện gắn chủ đề */
export type TopicDetailEventSession = {
  eventSessionNo: number
  title: string
}

export type TopicDetailEvent = {
  eventId: number
  eventCode: string
  eventName: string
  isActive: boolean
  eventSessions?: TopicDetailEventSession[] | null
}

/** GET /topics/{id} — nhóm gắn chủ đề */
export type TopicDetailTeamLeader = {
  memberId: number
  fullName: string
  avatarUrl: string | null
  email: string
}

export type TopicDetailTeam = {
  teamId: number
  teamName: string
  teamTopicIsActive: boolean
  teamTopicCreatedAt: string
  leaderMember?: TopicDetailTeamLeader | null
}

export type TopicListItem = {
  topicId: number
  topicName: string
  description: string
  isActive: boolean
  createdAt: string | null
  /** Response GET by id */
  events?: TopicDetailEvent[] | null
  teams?: TopicDetailTeam[] | null
  /** Một số endpoint list cũ có thể vẫn trả */
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

