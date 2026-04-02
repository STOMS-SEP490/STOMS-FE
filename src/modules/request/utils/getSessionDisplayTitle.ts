import type { RequestSessionSummary, SessionTopicInfo } from '../request';
import type { SessionDetail } from '../type';

function topicRefToInfo(ref: SessionDetail['SubjectSession']): SessionTopicInfo | null {
  if (!ref) return null;
  const duration = ref.Duration != null && String(ref.Duration).trim() ? String(ref.Duration).trim() : null;
  const title = ref.Title?.trim() ? ref.Title.trim() : null;
  const description = ref.Description?.trim() ? ref.Description.trim() : null;
  if (!title && !description && !duration) return null;
  return { title, description, duration };
}

/** Tiêu đề hiển thị cho phiên (đồng bộ danh sách + header panel chi tiết). */
export function getSessionDisplayTitle(session: RequestSessionSummary): string {
  const topic = session.subjectSession ?? session.eventSession;
  const notes = (session as RequestSessionSummary & { notes?: string }).notes;
  if (topic?.title?.trim()) return topic.title.trim();
  if (notes) return `Phiên ${session.sessionNo}: ${notes}`;
  return `Phiên ${session.sessionNo}`;
}

/**
 * Giống getSessionDisplayTitle nhưng ưu tiên SubjectSession/EventSession/Notes từ chi tiết BE khi đã tải.
 */
export function getSessionDisplayTitleWithDetail(
  session: RequestSessionSummary & { notes?: string | null },
  detail?: SessionDetail | undefined,
): string {
  if (!detail) return getSessionDisplayTitle(session);
  return getSessionDisplayTitle({
    ...session,
    subjectSession: topicRefToInfo(detail.SubjectSession) ?? session.subjectSession ?? null,
    eventSession: topicRefToInfo(detail.EventSession) ?? session.eventSession ?? null,
    notes: String(detail.Notes ?? session.notes ?? ''),
  } as RequestSessionSummary & { notes?: string });
}
