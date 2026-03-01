import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useOutletContext } from 'react-router-dom'
import dayjs from 'dayjs'
import { DataTable } from '@/shared/components/common/DataTable'
import HoverSearch from '@/shared/components/ui/search'
import type { SubjectListItem } from '../subject'
import { useSubjects } from '../hooks/useSubjects'

export default function SubjectsManagement() {
  const context = useOutletContext<{ position: string }>()

  const {
    data,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
  } = useSubjects()

  const columns = useMemo<ColumnDef<SubjectListItem>[]>(() => [
    {
      accessorKey: 'subjectCode',
      header: 'MÃ MÔN HỌC',
    },
    {
      accessorKey: 'subjectName',
      header: 'TÊN MÔN HỌC',
    },
    {
      accessorKey: 'createdAt',
      header: 'NGÀY TẠO',
      cell: ({ row }) =>
        dayjs(row.original.createdAt).format('DD/MM/YYYY'),
    },
  ], [])

  if (context.position === 'toolbar') {
    return (
      <div className="flex gap-3">
        <HoverSearch
          placeholder="Tìm môn học..."
         
        />
      </div>
    )
  }

  return (
    <DataTable
      columns={columns}
      data={data}
      pageNumber={pageNumber}
      pageSize={pageSize}
      totalItems={totalItems}
      onPageChange={(page) => setPageNumber(page)}
    />
  )
}