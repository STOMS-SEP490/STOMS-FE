export type SkillListItem = {
  skillId: number
  skillName: string
  description: string
  isActive: boolean
  createdAt: string | null
  membersWithSkill?: {
    memberId: number
    fullName: string
    avatarUrl: string | null
    email: string
    roleName: string
  }[] | null
  subjectsRequiringSkill?: {
    subjectId: number
    subjectCode: string
    subjectName: string
  }[] | null
  eventsRequiringSkill?: {
    eventId: number
    eventCode: string
    eventName: string
  }[] | null
}

export type SkillUpsertPayload = {
  skillName: string
  description: string
}

export type SkillFilterParams = {
  pageNumber?: number
  pageSize?: number
  skillId?: number
  skillName?: string
}

