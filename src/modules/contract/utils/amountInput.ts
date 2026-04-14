/**
 * true nếu người dùng nhập số âm (dấu - bị strip bởi replace(/\D/g) nên phải kiểm tra trước).
 * Hỗ trợ ASCII `-`, Unicode minus `−`, en dash `–`.
 */
export function hasExplicitNegativeAmountSign(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  const c0 = t.charCodeAt(0);
  if (c0 === 0x2d || c0 === 0x2212 || c0 === 0x2013) return true;
  // Dạng "(−100)" / "(-1)"
  return /^\(\s*[-\u2212\u2013]/.test(t);
}
