/** Chuỗi TimeSpan từ API (vd. "10:00:00", "1.02:30:00") → hiển thị tiếng Việt. */
export function formatCourseDuration(raw: string | null | undefined): string | null {
  if (raw == null || raw === '') return null;
  const withDays = raw.match(/^(\d+)\.(\d{2}):(\d{2}):(\d{2})$/);
  if (withDays) {
    const days = parseInt(withDays[1], 10);
    const h = parseInt(withDays[2], 10) + days * 24;
    const m = parseInt(withDays[3], 10);
    const parts: string[] = [];
    if (h) parts.push(`${h} giờ`);
    if (m) parts.push(`${m} phút`);
    return parts.join(' ') || raw;
  }
  const t = raw.match(/^(\d{1,3}):(\d{2}):(\d{2})/);
  if (t) {
    const h = parseInt(t[1], 10);
    const m = parseInt(t[2], 10);
    const parts: string[] = [];
    if (h) parts.push(`${h} giờ`);
    if (m) parts.push(`${m} phút`);
    return parts.join(' ') || raw;
  }
  return raw;
}
