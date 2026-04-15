import { useEffect, useState } from 'react'
import { dashboardApi } from '@/modules/dashboard/api/dashboardApi'

export type EquipmentsManagementStats = {
  totalEquipment: number
  availableEquipment: number
  borrowedEquipment: number
  damagedEquipment: number
  lostEquipment: number
}

const initial: EquipmentsManagementStats = {
  totalEquipment: 0,
  availableEquipment: 0,
  borrowedEquipment: 0,
  damagedEquipment: 0,
  lostEquipment: 0,
}

let statsCache: EquipmentsManagementStats | null = null
let statsInFlight: Promise<EquipmentsManagementStats> | null = null

async function fetchEquipmentsManagementStats(): Promise<EquipmentsManagementStats> {
  if (statsCache) return statsCache
  if (statsInFlight) return statsInFlight

  statsInFlight = (async () => {
    try {
      const statsRes = await dashboardApi.getEquipmentStatistics()
      const nextStats: EquipmentsManagementStats = {
        totalEquipment: statsRes.totalEquipment ?? 0,
        availableEquipment: statsRes.availableEquipment ?? 0,
        borrowedEquipment: statsRes.borrowedEquipment ?? 0,
        damagedEquipment: statsRes.damagedEquipment ?? 0,
        lostEquipment: statsRes.lostEquipment ?? 0,
      }
      statsCache = nextStats
      return nextStats
    } finally {
      statsInFlight = null
    }
  })()

  return statsInFlight
}

/** Equipment management header stats from GET /dashboard/equipments/statistics. */
export function useEquipmentsManagementStats() {
  const [loading, setLoading] = useState(!statsCache)
  const [stats, setStats] = useState<EquipmentsManagementStats>(statsCache ?? initial)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      if (!statsCache) setLoading(true)
      try {
        const nextStats = await fetchEquipmentsManagementStats()
        if (cancelled) return
        setStats(nextStats)
      } catch {
        if (!cancelled) setStats(initial)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return { loading, stats }
}
