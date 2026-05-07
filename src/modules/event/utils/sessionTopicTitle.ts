import type { SessionDetail } from '@/modules/request/type';

type TopicRef = { Title?: string | null } | null | undefined;

export function resolveSessionTopicTitleFromRefs(
  eventSession: TopicRef,
  subjectSession: TopicRef,
): string {
  const es = eventSession;
  const ss = subjectSession;
  const et = (es?.Title ?? '').trim();
  const st = (ss?.Title ?? '').trim();
  if (es == null && ss == null) return '';
  if (es == null) return st;
  if (ss == null) return et;
  return et || st;
}

export function resolveSessionTopicTitleFromSessionLike(session: {
  EventSession?: TopicRef;
  SubjectSession?: TopicRef;
} | null): string {
  if (!session) return '';
  return resolveSessionTopicTitleFromRefs(session.EventSession, session.SubjectSession);
}

export function resolvePopoverSessionHeading(
  eventMetaSessionTitle: string | undefined,
  session: SessionDetail | null,
): string {
  const meta = (eventMetaSessionTitle ?? '').trim();
  if (meta) return meta;
  const fromDetail = resolveSessionTopicTitleFromSessionLike(session);
  if (fromDetail) return fromDetail;
  const notes = (session?.Notes ?? '').trim();
  if (notes) return notes;
  return 'Buổi học';
}
