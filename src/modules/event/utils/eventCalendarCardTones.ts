/**
 * Tone nền thẻ lịch pastel để phân biệt theo "id".
 * Mục tiêu: vẫn nhạt, nhưng khác hue rõ hơn (tím / xanh dương / cam / ...).
 */
export const EVENT_CARD_BG_TONES = [
  // tím (purple-50)
  '#f5f3ff',
  // xanh dương (sky/blue-50)
  '#eff6ff',
  // cam (orange-50)
  '#fff7ed',
  // hồng nhạt (rose-50)
  '#fff1f2',
  // xanh lá nhạt (emerald-50)
  '#ecfdf5',
  // vàng nhạt (amber-50)
  '#fffbeb',
] as const;

export const EVENT_CARD_BORDER_TONES = [
  '#ddd6fe', // purple-200
  '#93c5fd', // blue-300
  '#fed7aa', // orange-200
  '#fecdd3', // rose-200
  '#a7f3d0', // emerald-200
  '#fde68a', // amber-200
] as const;

export const EVENT_CARD_SHADOW_TONES = [
  '0 2px 8px rgba(124, 58, 237, 0.08)', // purple
  '0 2px 8px rgba(59, 130, 246, 0.08)', // blue
  '0 2px 8px rgba(249, 115, 22, 0.08)', // orange
  '0 2px 8px rgba(244, 63, 94, 0.08)', // rose
  '0 2px 8px rgba(16, 185, 129, 0.08)', // emerald
  '0 2px 8px rgba(245, 158, 11, 0.08)', // amber
] as const;

function toneIndexForEventId(id: string | number) {
  const raw =
    typeof id === 'number' && Number.isFinite(id)
      ? Math.abs(Math.trunc(id))
      : String(id).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return raw % EVENT_CARD_BG_TONES.length;
}

export function backgroundToneForEventId(id: string | number): string {
  return EVENT_CARD_BG_TONES[toneIndexForEventId(id)];
}

export function toneForEventId(id: string | number): { bg: string; border: string; shadow: string } {
  const i = toneIndexForEventId(id);
  return {
    bg: EVENT_CARD_BG_TONES[i],
    border: EVENT_CARD_BORDER_TONES[i % EVENT_CARD_BORDER_TONES.length],
    shadow: EVENT_CARD_SHADOW_TONES[i % EVENT_CARD_SHADOW_TONES.length],
  };
}

type RequestKind = 'subject' | 'course' | 'event' | 'other';

const REQUEST_KIND_TONES: Record<RequestKind, { bg: string; border: string; shadow: string }> = {
  subject: {
    bg: '#dbeafe', // blue-200 (dễ nhìn hơn)
    border: '#3b82f6', // blue-500
    shadow: '0 4px 14px rgba(59, 130, 246, 0.18)',
  },
  course: {
    bg: '#ede9fe', // purple-100
    border: '#7c3aed', // purple-600
    shadow: '0 4px 14px rgba(124, 58, 237, 0.16)',
  },
  event: {
    bg: '#ffedd5', // orange-200
    border: '#fb923c', // orange-400
    shadow: '0 4px 14px rgba(249, 115, 22, 0.16)',
  },
  other: {
    bg: '#e0f2fe', // sky-100 (tăng độ nổi)
    border: '#38bdf8', // sky-400
    shadow: '0 4px 14px rgba(56, 189, 248, 0.18)',
  },
};

export function toneForRequestKind(kind?: RequestKind | null): { bg: string; border: string; shadow: string } {
  if (!kind) return REQUEST_KIND_TONES.other;
  return REQUEST_KIND_TONES[kind] ?? REQUEST_KIND_TONES.other;
}
