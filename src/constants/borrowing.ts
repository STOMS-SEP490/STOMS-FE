export const BORROWING_STATUS_MAP: Record<
  string,
  { label: string; className: string }
> = {

  Borrowed: { label: 'Đang mượn', className: 'bg-blue-100 text-blue-700' },
  PartialReturned: { label: 'Trả một phần', className: 'bg-amber-100 text-amber-700' },
  Returned: { label: 'Đã trả', className: 'bg-green-100 text-green-700' },
  Overdue: { label: 'Quá hạn', className: 'bg-red-100 text-red-600' },

  '1': { label: 'Đang mượn', className: 'bg-blue-100 text-blue-700' },
  '2': { label: 'Trả một phần', className: 'bg-amber-100 text-amber-700' },
  '3': { label: 'Đã trả', className: 'bg-green-100 text-green-700' },
  '4': { label: 'Quá hạn', className: 'bg-red-100 text-red-600' },
}

export const BORROWING_STATUS_OPTIONS = [
  { value: 'Borrowed', label: 'Đang mượn' },
  { value: 'PartialReturned', label: 'Trả một phần' },
  { value: 'Returned', label: 'Đã trả' },
  { value: 'Overdue', label: 'Quá hạn' },
] as const

const DEFAULT_STATUS_STYLE = 'bg-gray-100 text-gray-700'

function normalizeStatusKey(status: string | number): string {
  const s = String(status ?? '').trim()
  if (!s) return ''
  if (/^[1-4]$/.test(s)) return s
  return s
}

export function getBorrowingStatusDisplay(status: string | number): string {
  const key = normalizeStatusKey(status)
  return (BORROWING_STATUS_MAP[key]?.label ?? key) || '—'
}

export function getBorrowingStatusColor(status: string | number): string {
  const key = normalizeStatusKey(status)
  return BORROWING_STATUS_MAP[key]?.className ?? DEFAULT_STATUS_STYLE
}
