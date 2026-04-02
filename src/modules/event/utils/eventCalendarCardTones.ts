/** Nền thẻ lịch xen kẽ — cùng tone cyan/slate với hệ thống (#2197C0 / sky). */
export const EVENT_CARD_BG_TONES = ['#e8f4f9', '#e3f0f6', '#eef6fa', '#e6f2f7', '#edf4f8'] as const;

export function backgroundToneForEventId(id: string | number): string {
  const raw =
    typeof id === 'number' && Number.isFinite(id)
      ? Math.abs(Math.trunc(id))
      : String(id).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return EVENT_CARD_BG_TONES[raw % EVENT_CARD_BG_TONES.length];
}
