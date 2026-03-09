export type SkillListItem = {
  skillId: number
  skillName: string
  description: string
  isActive: boolean
  createdAt: string | null
  // Các quan hệ chi tiết (eventSessionSkills, subjectSkills) sẽ bổ sung khi FE cần dùng
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

