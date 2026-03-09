import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useOutletContext } from 'react-router-dom'
import dayjs from 'dayjs'
import { Eye, Pencil, Power, PowerOff } from 'lucide-react'
import { DataTable } from '@/shared/components/common/DataTable'
import HoverSearch from '@/shared/components/ui/search'
import { Button } from '@/shared/components/ui/button'
import { Dialog } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { message, Modal } from 'antd'
import type { SubjectListItem, SubjectUpsertPayload } from '../subject'
import { useSubjects } from '../hooks/useSubjects'
import subjectApi from '../api/subjectApi'

export default function SubjectsManagement() {
  const context = useOutletContext<{ position: string }>()

  const {
    data,
    loading,
    search,
    setSearch,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
    refetch,
  } = useSubjects()

  const [openEdit, setOpenEdit] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingSubject, setEditingSubject] = useState<SubjectListItem | null>(null)

  const [subjectCode, setSubjectCode] = useState('')
  const [subjectName, setSubjectName] = useState('')
  const [description, setDescription] = useState('')

  const openEditModal = (s: SubjectListItem) => {
    setEditingSubject(s)
    setSubjectCode(s.subjectCode ?? '')
    setSubjectName(s.subjectName ?? '')
    setDescription(s.description ?? '')
    setOpenEdit(true)
  }

  const closeEditModal = () => {
    if (submitting) return
    setOpenEdit(false)
  }

  const handleSubmitEdit = async () => {
    if (!editingSubject) return
    const payload: SubjectUpsertPayload = {
      subjectCode: subjectCode.trim(),
      subjectName: subjectName.trim(),
      description: description.trim(),
      topicId: editingSubject.topicId ?? null,
    }

    if (!payload.subjectCode || !payload.subjectName) {
      message.warning('Vui lòng nhập đầy đủ mã và tên môn học')
      return
    }

    try {
      setSubmitting(true)
      await subjectApi.update(editingSubject.subjectId, payload)
      message.success('Cập nhật môn học thành công')
      setOpenEdit(false)
      await refetch()
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Có lỗi xảy ra'
      message.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (s: SubjectListItem) => {
    Modal.confirm({
      title: s.isActive ? 'Vô hiệu hóa môn học?' : 'Kích hoạt môn học?',
      content: s.isActive
        ? 'Môn học sẽ bị vô hiệu hóa và có thể ảnh hưởng tới các khóa học liên quan.'
        : 'Môn học sẽ được kích hoạt lại.',
      okText: s.isActive ? 'Vô hiệu hóa' : 'Kích hoạt',
      cancelText: 'Hủy',
      okButtonProps: { danger: s.isActive },
      onOk: async () => {
        try {
          if (s.isActive) await subjectApi.deactivate(s.subjectId)
          else await subjectApi.activate(s.subjectId)
          message.success('Cập nhật trạng thái thành công')
          await refetch()
        } catch (e: any) {
          const msg = e?.response?.data?.message || e?.message || 'Có lỗi xảy ra'
          message.error(msg)
        }
      },
    })
  }

  const handleView = (s: SubjectListItem) => {
    Modal.info({
      title: `Môn học ${s.subjectCode}`,
      content: (
        <div className="space-y-2">
          <div>
            <div className="text-xs text-gray-500">Tên môn học</div>
            <div className="text-sm font-medium">{s.subjectName || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Mô tả</div>
            <div className="text-sm">{s.description || '—'}</div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="rounded-md border p-2">
              <div className="text-xs text-gray-500">Chủ đề</div>
              <div className="text-sm font-medium">{s.topicId ?? '—'}</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="text-xs text-gray-500">Số buổi</div>
              <div className="text-sm font-medium">{s.numberOfSession}</div>
            </div>
          </div>
          <div className="pt-2">
            <div className="text-xs text-gray-500">Trạng thái</div>
            <div className="text-sm">{s.isActive ? 'Đang hoạt động' : 'Vô hiệu hóa'}</div>
          </div>
        </div>
      ),
      okText: 'Đóng',
    })
  }

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
      accessorKey: 'isActive',
      header: 'TRẠNG THÁI',
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.isActive ? (
            <span className="inline-flex items-center rounded-full bg-green-50 text-green-700 px-2 py-0.5 border border-green-100">
              Đang hoạt động
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-gray-50 text-gray-700 px-2 py-0.5 border border-gray-200">
              Vô hiệu hóa
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'NGÀY TẠO',
      cell: ({ row }) =>
        row.original.createdAt
          ? dayjs(row.original.createdAt).format('DD/MM/YYYY')
          : '—',
    },
    {
      id: 'actions',
      header: 'THAO TÁC',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleView(row.original)} title="Xem">
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => openEditModal(row.original)} title="Sửa">
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleToggleActive(row.original)}
            title={row.original.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
          >
            {row.original.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
          </Button>
        </div>
      ),
    },
  ], [])

  if (context.position === 'toolbar') {
    return (
      <div className="flex gap-3">
        <HoverSearch
          placeholder="Tìm môn học..."
          value={search}
          onChange={setSearch}
        />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-black">Quản lý môn học</h2>
          <p className="text-xs text-gray-500">Danh sách môn học trong hệ thống</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-4">
        {loading && <div className="text-sm text-gray-500 mb-3">Đang tải...</div>}
        <DataTable
          columns={columns}
          data={data}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(page) => setPageNumber(page)}
        />
      </div>

      <Dialog
        open={openEdit}
        onClose={closeEditModal}
        title="Cập nhật môn học"
        description="Chỉnh sửa thông tin cơ bản của môn học."
        className="max-w-[520px]"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Mã môn học</Label>
            <Input value={subjectCode} onChange={(e) => setSubjectCode(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Tên môn học</Label>
            <Input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Mô tả</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Mô tả ngắn về môn học"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={closeEditModal} disabled={submitting}>
            Hủy
          </Button>
          <Button
            className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
            onClick={handleSubmitEdit}
            disabled={submitting}
          >
            {submitting ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}