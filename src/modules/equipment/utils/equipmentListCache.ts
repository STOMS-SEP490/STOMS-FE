import type { PaginationResponse } from '@/shared/types/api'
import equipmentApi from '@/modules/equipment/api/equipmentApi'
import type { EquipmentListItem } from '@/modules/equipment/equipment'

type EquipmentListKey = string

function equipmentListKey(params: {
  pageNumber: number
  pageSize: number
  equipmentName?: string
  equipmentCode?: string
  status?: string
  categoryId?: number
}): EquipmentListKey {
  const n = (params.equipmentName ?? '').trim().toLowerCase()
  const c = (params.equipmentCode ?? '').trim().toLowerCase()
  const st = (params.status ?? '').trim().toUpperCase()
  const cat = params.categoryId ?? ''
  return `${params.pageNumber}|${params.pageSize}|n:${n}|c:${c}|${st}|${cat}`
}

/** Deduplicate concurrent list requests with the same params (e.g. React StrictMode). */
const equipmentListInflight = new Map<EquipmentListKey, Promise<PaginationResponse<EquipmentListItem>>>()

type EquipmentListCacheEntry = {
  atMs: number
  res: PaginationResponse<EquipmentListItem>
}

/** Cache list responses to avoid re-fetch on navigation/back. */
const equipmentListCache = new Map<EquipmentListKey, EquipmentListCacheEntry>()

export const EQUIPMENT_LIST_CACHE_TTL_MS = 2 * 60 * 1000
export const EQUIPMENT_LIST_CACHE_MAX = 120

function getCached(key: EquipmentListKey): PaginationResponse<EquipmentListItem> | null {
  const hit = equipmentListCache.get(key)
  if (!hit) return null
  if (Date.now() - hit.atMs > EQUIPMENT_LIST_CACHE_TTL_MS) {
    equipmentListCache.delete(key)
    return null
  }
  // Refresh LRU order
  equipmentListCache.delete(key)
  equipmentListCache.set(key, hit)
  return hit.res
}

function setCached(key: EquipmentListKey, res: PaginationResponse<EquipmentListItem>) {
  equipmentListCache.set(key, { atMs: Date.now(), res })
  if (equipmentListCache.size <= EQUIPMENT_LIST_CACHE_MAX) return
  const oldestKey = equipmentListCache.keys().next().value as EquipmentListKey | undefined
  if (oldestKey) equipmentListCache.delete(oldestKey)
}

export function invalidateEquipmentListCache() {
  equipmentListCache.clear()
}

export async function getEquipmentsListCached(params: {
  pageNumber: number
  pageSize: number
  equipmentName?: string
  equipmentCode?: string
  status?: string
  categoryId?: number
  force?: boolean
}): Promise<PaginationResponse<EquipmentListItem>> {
  const key = equipmentListKey(params)

  if (!params.force) {
    const cached = getCached(key)
    if (cached) return cached
  }

  const inflight = equipmentListInflight.get(key)
  if (inflight) return inflight

  const p = equipmentApi
    .getEquipments({
      pageNumber: params.pageNumber,
      pageSize: params.pageSize,
      equipmentName: params.equipmentName?.trim() || undefined,
      equipmentCode: params.equipmentCode?.trim() || undefined,
      status: params.status?.trim() || undefined,
      categoryId: params.categoryId ?? undefined,
    })
    .then((res) => {
      if (!params.force) setCached(key, res)
      return res
    })
    .finally(() => {
      equipmentListInflight.delete(key)
    })

  equipmentListInflight.set(key, p)
  return p
}

