/** Chuỗi TimeSpan từ API (vd. "10:00:00", "1.02:30:00") → hiển thị tiếng Việt. */
export function formatSubjectDuration(raw: string | null | undefined): string | null {
  if (raw == null || raw === '') return null;
  
  // Format có ngày: "d.HH:mm:ss"
  const withDays = raw.match(/^(\d+)\.(\d{2}):(\d{2}):(\d{2})$/);
  if (withDays) {
    const days = parseInt(withDays[1], 10);
    const hours = parseInt(withDays[2], 10);
    const minutes = parseInt(withDays[3], 10);
    const totalHours = days * 24 + hours;
    const parts: string[] = [];
    if (totalHours > 0) parts.push(`${totalHours} giờ`);
    if (minutes > 0) parts.push(`${minutes} phút`);
    return parts.length > 0 ? parts.join(' ') : raw;
  }

  // Format thông thường: "HH:mm:ss" hoặc "H:mm:ss"
  const normal = raw.match(/^(\d{1,3}):(\d{2}):(\d{2})$/);
  if (normal) {
    const hours = parseInt(normal[1], 10);
    const minutes = parseInt(normal[2], 10);
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours} giờ`);
    if (minutes > 0) parts.push(`${minutes} phút`);
    return parts.length > 0 ? parts.join(' ') : raw;
  }

  // Không match format nào → trả về nguyên bản
  return raw;
}
