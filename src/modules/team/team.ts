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
  createdAt: string;
};

export type Team = {
  teamId: number;
  teamName: string;
  createdAt: string;
  updatedAt: string;
  leaderMemberId: number;
  teamSessions: TeamSession[];
  teamTopics: TeamTopic[];
};
