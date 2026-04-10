/**
 * Equipment status (backend enum):
 * 1 - AVAILABLE
 * 2 - BORROWED
 * 3 - DAMAGED
 * 4 - LOST
 * 5 - UNAVAILABLE
 */
export const EQUIPMENT_STATUS = {
  AVAILABLE: 'AVAILABLE',
  BORROWED: 'BORROWED',
  DAMAGED: 'DAMAGED',
  LOST: 'LOST',
  UNAVAILABLE: 'UNAVAILABLE',
} as const

export type EquipmentStatusValue =
  (typeof EQUIPMENT_STATUS)[keyof typeof EQUIPMENT_STATUS]

export const EQUIPMENT_STATUS_MAP: Record<
  string,
  { label: string; className: string }
> = {
  // String enum từ API
  [EQUIPMENT_STATUS.AVAILABLE]: {
    label: 'Khả dụng',
    className: 'bg-green-100 text-green-700',
  },
  [EQUIPMENT_STATUS.BORROWED]: {
    label: 'Đang mượn',
    className: 'bg-yellow-100 text-yellow-700',
  },
  [EQUIPMENT_STATUS.DAMAGED]: {
    label: 'Hỏng hóc',
    className: 'bg-orange-100 text-orange-700',
  },
  [EQUIPMENT_STATUS.LOST]: {
    label: 'Mất',
    className: 'bg-red-100 text-red-700',
  },
  [EQUIPMENT_STATUS.UNAVAILABLE]: {
    label: 'Không khả dụng',
    className: 'bg-gray-100 text-gray-700',
  },
  // Numeric từ API (1-5)
  '1': { label: 'Khả dụng', className: 'bg-green-100 text-green-700' },
  '2': { label: 'Đang mượn', className: 'bg-orange-100 text-orange-700' },
  '3': { label: 'Hỏng hóc', className: 'bg-yellow-100 text-yellow-700' },
  '4': { label: 'Mất', className: 'bg-red-100 text-red-700' },
  '5': { label: 'Không khả dụng', className: 'bg-gray-100 text-gray-700' },
}

/** Options cho Select filter (value gửi lên API) */
export const EQUIPMENT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: EQUIPMENT_STATUS.AVAILABLE, label: 'Khả dụng' },
  { value: EQUIPMENT_STATUS.BORROWED, label: 'Đang mượn' },
  { value: EQUIPMENT_STATUS.DAMAGED, label: 'Hỏng hóc' },
  { value: EQUIPMENT_STATUS.LOST, label: 'Mất' },
  { value: EQUIPMENT_STATUS.UNAVAILABLE, label: 'Không khả dụng' },
]

const DEFAULT_STATUS_STYLE = 'bg-gray-100 text-gray-700'

/** Chuẩn hóa status từ API (có thể là "Available", "AVAILABLE", 1, "1"...) để lookup */
function normalizeStatusKey(status: string | number): string {
  const s = String(status ?? '').trim()
  if (!s) return ''
  if (/^[1-5]$/.test(s)) return s
  return s.toUpperCase()
}

export function getEquipmentStatusDisplay(status: string | number): string {
  const key = normalizeStatusKey(status)
  return (EQUIPMENT_STATUS_MAP[key]?.label ?? (key || '—')) || '—'
}

export function getEquipmentStatusColor(status: string | number): string {
  const key = normalizeStatusKey(status)
  return EQUIPMENT_STATUS_MAP[key]?.className ?? DEFAULT_STATUS_STYLE
}
