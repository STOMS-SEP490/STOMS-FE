
import { BookOpen } from 'lucide-react'
import type { RequestListItem } from '../request'
import { StatCard } from '@/shared/components/common/StatCard'

type Props = {
  data: RequestListItem[]
  totalItems: number
}

export function RequestStats({ data, totalItems }: Props) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard
        icon={<BookOpen />}
        label="Tổng yêu cầu"
        value={totalItems.toString()}
      />
      <StatCard
        icon={<BookOpen />}
        label="Chờ duyệt"
        value={
          data.filter(
            (d) => d.status?.toLowerCase() === 'pending'
          ).length.toString()
        }
      />
      <StatCard
        icon={<BookOpen />}
        label="Đã duyệt"
        value={
          data.filter(
            (d) => d.status?.toLowerCase() === 'approved'
          ).length.toString()
        }
      />
      <StatCard
        icon={<BookOpen />}
        label="Từ chối"
        value={
          data.filter(
            (d) => d.status?.toLowerCase() === 'rejected'
          ).length.toString()
        }
      />
    </div>
  )
}