
import { BookOpen } from 'lucide-react';
import type { RequestListItem } from '../request';
import { StatCard } from '@/shared/components/common/StatCard';
import { getRequestStatusLabel } from '@/constants/status';

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
            (d) => getRequestStatusLabel(d.status) === 'Chờ duyệt'
          ).length.toString()
        }
      />
      <StatCard
        icon={<BookOpen />}
        label="Đã duyệt"
        value={
          data.filter(
            (d) => getRequestStatusLabel(d.status) === 'Đã duyệt'
          ).length.toString()
        }
      />
      <StatCard
        icon={<BookOpen />}
        label="Từ chối"
        value={
          data.filter(
            (d) => getRequestStatusLabel(d.status) === 'Từ chối'
          ).length.toString()
        }
      />
    </div>
  );
}