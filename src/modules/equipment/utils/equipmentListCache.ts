import type { PaginationResponse } from '@/shared/types/api'
import equipmentApi from '@/modules/equipment/api/equipmentApi'
import type { EquipmentListItem } from '@/modules/equipment/equipment'

type EquipmentListKey = string

function equipmentListKey(params: {
  pageNumber: number
  pageSize: number
  equipmentName?: string
  status?: string
  categoryId?: number
}): EquipmentListKey {
  const n = (params.equipmentName ?? '').trim().toLowerCase()
  const st = (params.status ?? '').trim().toUpperCase()
  const cat = params.categoryId ?? ''
  return `${params.pageNumber}|${params.pageSize}|n:${n}|${st}|${cat}`
}

/** Deduplicate concurrent list requests with the same params (e.g. React StrictMode). */
const equipmentListInflight = new Map<EquipmentListKey, Promise<PaginationResponse<EquipmentListItem>>>()

export const EQUIPMENT_LIST_CACHE_TTL_MS = 2 * 60 * 1000
export const EQUIPMENT_LIST_CACHE_MAX = 120

export function invalidateEquipmentListCache() {
  // no-op: cache removed, kept for API compatibility
}

export async function getEquipmentsListCached(params: {
  pageNumber: number
  pageSize: number
  equipmentName?: string
  status?: string
  categoryId?: number
  force?: boolean
}): Promise<PaginationResponse<EquipmentListItem>> {
  const key = equipmentListKey(params)

  // Luôn gọi API mới, không dùng cache để tránh hiển thị sai data
  const inflight = equipmentListInflight.get(key)
  if (inflight) return inflight

  const p = equipmentApi
    .getEquipments({
      pageNumber: params.pageNumber,
      pageSize: params.pageSize,
      EquipmentName: params.equipmentName?.trim() || undefined,
      Status: params.status?.trim() || undefined,
      CategoryId: params.categoryId ?? undefined,
    })
    .finally(() => {
      equipmentListInflight.delete(key)
    })

  equipmentListInflight.set(key, p)
  return p
}

