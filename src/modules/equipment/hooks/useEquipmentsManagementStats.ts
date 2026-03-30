import { useEffect, useState } from 'react'
import { EQUIPMENT_STATUS } from '@/constants/equipment'
import categoryApi from '@/modules/category/api/categoryApi'
import equipmentApi from '../api/equipmentApi'

export type EquipmentsManagementStats = {
  totalEquipment: number
  available: number
  totalCategories: number
  borrowed: number
}

const initial: EquipmentsManagementStats = {
  totalEquipment: 0,
  available: 0,
  totalCategories: 0,
  borrowed: 0,
}

/** Thống kê header trang Quản lý thiết bị — lấy totalItems từ API filter (pageSize=1). */
export function useEquipmentsManagementStats() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<EquipmentsManagementStats>(initial)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      setLoading(true)
      try {
        const [totalRes, availableRes, categoriesRes, borrowedRes] = await Promise.all([
          equipmentApi.getEquipments({ pageNumber: 1, pageSize: 1 }),
          equipmentApi.getEquipments({
            pageNumber: 1,
            pageSize: 1,
            status: EQUIPMENT_STATUS.AVAILABLE,
          }),
          categoryApi.getCategories({ pageNumber: 1, pageSize: 1 }),
          equipmentApi.getEquipments({
            pageNumber: 1,
            pageSize: 1,
            status: EQUIPMENT_STATUS.BORROWED,
          }),
        ])
        if (cancelled) return
        setStats({
          totalEquipment: totalRes.totalItems,
          available: availableRes.totalItems,
          totalCategories: categoriesRes.totalItems,
          borrowed: borrowedRes.totalItems,
        })
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
