export type TeamSession = {
  teamSessionId: number;
  teamId: number;
  sessionId: number;
  teachersRequired: number;
  tasRequired: number;
};

export type TeamTopic = {
  teamId: number;
  topicId: number;
  topicName?: string | null;
  isActive?: boolean;
  createdAt: string;
};

export type Team = {
  teamId: number;
  teamName: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  leaderMemberId?: number | null;
  leaderMemberName?: string | null;
  teamSessions?: TeamSession[];
  teamTopics?: TeamTopic[];
};
