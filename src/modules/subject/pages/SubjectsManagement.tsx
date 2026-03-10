import { useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useOutletContext } from 'react-router-dom'
import dayjs from 'dayjs'
import { Eye, Pencil, Power, PowerOff, Trash2, Plus } from 'lucide-react'
import { DataTable } from '@/shared/components/common/DataTable'
import HoverSearch from '@/shared/components/ui/search'
import { Button } from '@/shared/components/ui/button'
import { Dialog } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { message, Modal } from 'antd'
import type { SkillListItem } from '@/modules/skill/skill'
import skillApi from '@/modules/skill/api/skillApi'
import type { TopicListItem } from '@/modules/topic/topic'
import topicApi from '@/modules/topic/api/topicApi'
import type { SubjectListItem, SubjectUpsertPayload } from '../subject'
import { useSubjects } from '../hooks/useSubjects'
import subjectApi from '../api/subjectApi'
import subjectSkillApi from '../api/subjectSkillApi'
import subjectSessionApi from '../api/subjectSessionApi'

type EditableSession = {
  subjectSessionId?: number
  sessionNo: number
  title: string
  duration: string
  description: string
}

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
  const [isCreating, setIsCreating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingSubject, setEditingSubject] = useState<SubjectListItem | null>(null)

  const [subjectCode, setSubjectCode] = useState('')
  const [subjectName, setSubjectName] = useState('')
  const [description, setDescription] = useState('')
  const [allSkills, setAllSkills] = useState<SkillListItem[]>([])
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([])
  const [currentSubjectSkillIds, setCurrentSubjectSkillIds] = useState<number[]>([])
  const [sessions, setSessions] = useState<EditableSession[]>([])
  const [sessionsToDelete, setSessionsToDelete] = useState<number[]>([])
  const [allTopics, setAllTopics] = useState<TopicListItem[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null)

  useEffect(() => {
    skillApi
      .getSkills({ pageSize: 500 })
      .then((res) => setAllSkills(res.items ?? []))
      .catch(() => setAllSkills([]))
  }, [])

  useEffect(() => {
    topicApi
      .getTopics({ pageNumber: 1, pageSize: 500 })
      .then((res) => setAllTopics(res.items ?? []))
      .catch(() => setAllTopics([]))
  }, [])

  const openEditModal = async (s: SubjectListItem) => {
    setIsCreating(false)
    try {
      // luôn lấy bản chi tiết mới nhất để có đủ subjectSkills
      const detail = await subjectApi.getById(s.subjectId)

      setEditingSubject(detail)
      setSubjectCode(detail.subjectCode ?? '')
      setSubjectName(detail.subjectName ?? '')
      setDescription(detail.description ?? '')
      setSelectedTopicId(detail.topicId ?? null)

      const ids = (detail.subjectSkills ?? []).map((x) => x.skillId)
      setCurrentSubjectSkillIds(ids)
      setSelectedSkillIds(ids)

      const mappedSessions: EditableSession[] =
        detail.subjectSessions?.map((s) => ({
          subjectSessionId: s.subjectSessionId,
          sessionNo: s.sessionNo,
          title: s.title,
          duration: s.duration,
          // BE có Description nhưng FE type cũ chưa khai báo, nên để fallback
          description: (s as any).description ?? '',
        })) ?? []
      setSessions(mappedSessions)
      setSessionsToDelete([])
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Không tải được chi tiết môn học'
      message.error(msg)

      // fallback: vẫn cho sửa theo dữ liệu từ list (không đủ skill name)
      setEditingSubject(s)
      setSubjectCode(s.subjectCode ?? '')
      setSubjectName(s.subjectName ?? '')
      setDescription(s.description ?? '')
      setSelectedTopicId(s.topicId ?? null)

      const ids = (s.subjectSkills ?? []).map((x) => x.skillId)
      setCurrentSubjectSkillIds(ids)
      setSelectedSkillIds(ids)
      setSessions([])
      setSessionsToDelete([])
    } finally {
      setOpenEdit(true)
    }
  }

  const closeEditModal = () => {
    if (submitting) return
    setOpenEdit(false)
  }

  const openCreateModal = () => {
    setIsCreating(true)
    setEditingSubject(null)
    setSubjectCode('')
    setSubjectName('')
    setDescription('')
    setSelectedTopicId(null)
    setSelectedSkillIds([])
    setCurrentSubjectSkillIds([])
    setSessions([])
    setSessionsToDelete([])
    setOpenEdit(true)
  }

  const handleRemoveSessionLocal = (sessionId?: number, sessionNo?: number) => {
    if (!sessionId && !sessionNo) return
    if (sessionId) {
      setSessionsToDelete((prev) =>
        prev.includes(sessionId) ? prev : [...prev, sessionId],
      )
    }
    setSessions((prev) =>
      prev.filter((s) =>
        sessionId ? s.subjectSessionId !== sessionId : s.sessionNo !== sessionNo,
      ),
    )
  }

  const handleAddSessionLocal = () => {
    const nextNo =
      sessions.length > 0 ? Math.max(...sessions.map((s) => s.sessionNo)) + 1 : 1
    setSessions((prev) => [
      ...prev,
      {
        subjectSessionId: undefined,
        sessionNo: nextNo,
        title: `Tiêu đề buổi ${nextNo}`,
        duration: '01:00:00', // mặc định 1 giờ
        description: '',
      },
    ])
  }

  const handleSubmitEdit = async () => {
    const payloadBase: SubjectUpsertPayload = {
      subjectCode: subjectCode.trim(),
      subjectName: subjectName.trim(),
      description: description.trim(),
      topicId: isCreating ? null : selectedTopicId,
    }

    if (!payloadBase.subjectCode || !payloadBase.subjectName) {
      message.warning('Vui lòng nhập đầy đủ mã và tên môn học')
      return
    }

    try {
      setSubmitting(true)

      if (isCreating) {
        if (sessions.length === 0) {
          message.warning('Vui lòng thêm ít nhất 1 buổi học cho môn.')
          return
        }

        const subjectSessions = sessions.map((s) => {
          const durationForApi =
            typeof s.duration === 'string' && /^\d{1,2}:\d{2}:\d{2}$/.test(s.duration)
              ? s.duration
              : '01:00:00'

          return {
            title: s.title || `Buổi ${s.sessionNo}`,
            description: s.description ?? '',
            sessionNo: s.sessionNo,
            duration: durationForApi,
          }
        })

        const payload: SubjectUpsertPayload = {
          ...payloadBase,
          subjectSessions,
        }

        await subjectApi.create(payload)
        message.success('Tạo môn học thành công')
        setOpenEdit(false)
        await refetch()
        return
      }

      if (!editingSubject) return

      await subjectApi.update(editingSubject.subjectId, payloadBase)

      // cập nhật lại skills cho môn học, giống member
      const toAdd = selectedSkillIds.filter((id) => !currentSubjectSkillIds.includes(id))
      const toRemove = currentSubjectSkillIds.filter((id) => !selectedSkillIds.includes(id))

      if (toRemove.length > 0) {
        await subjectSkillApi.removeMany(editingSubject.subjectId, toRemove)
      }
      if (toAdd.length > 0) {
        await subjectSkillApi.assignBulk(editingSubject.subjectId, toAdd)
      }

      // Gán chủ đề (nếu đổi) dùng API assign topic
      const currentTopicId = editingSubject.topicId ?? null
      if (selectedTopicId !== currentTopicId) {
        await subjectApi.assignTopic(editingSubject.subjectId, selectedTopicId)
      }

      // xoá các subjectSession đã uncheck
      for (const id of sessionsToDelete) {
        await subjectSessionApi.delete(id)
      }

      // thêm các subjectSession mới (chưa có id) với title/description/duration người dùng nhập
      const newSessions = sessions.filter((s) => !s.subjectSessionId)
      for (const s of newSessions) {
        const durationForApi =
          typeof s.duration === 'string' && /^\d{1,2}:\d{2}:\d{2}$/.test(s.duration)
            ? s.duration
            : '01:00:00'

        await subjectSessionApi.create({
          title: s.title || `Buổi ${s.sessionNo}`,
          description: s.description ?? '',
          subjectId: editingSubject.subjectId,
          duration: durationForApi,
          sessionNo: s.sessionNo,
        })
      }

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

  const handleView = async (s: SubjectListItem) => {
    try {
      const detail = await subjectApi.getById(s.subjectId)

      Modal.info({
        title: `Môn học ${detail.subjectCode}`,
        width: 720,
        content: (
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            <div>
              <div className="text-xs text-gray-500">Tên môn học</div>
              <div className="text-sm font-medium">{detail.subjectName || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Mô tả</div>
              <div className="text-sm">{detail.description || '—'}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-md border p-2">
                <div className="text-xs text-gray-500">Chủ đề</div>
                <div className="text-sm font-medium">{detail.topicName ?? detail.topicId ?? '—'}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-gray-500">Số buổi</div>
                <div className="text-sm font-medium">{detail.numberOfSession}</div>
              </div>
            </div>
            <div className="pt-2">
              <div className="text-xs text-gray-500">Trạng thái</div>
              <div className="text-sm">{detail.isActive ? 'Đang hoạt động' : 'Vô hiệu hóa'}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-md border p-2">
                <div className="text-xs text-gray-500">Số khóa học đang dùng môn này</div>
                <div className="text-sm font-medium">
                  {detail.courseSubjects ? detail.courseSubjects.length : 0}
                </div>
              </div>
              {detail.subjectSkills && detail.subjectSkills.length > 0 && (
                <div className="rounded-md border p-2">
                  <div className="text-xs text-gray-500 mb-1">Kỹ năng liên quan</div>
                  <div className="flex flex-wrap gap-1">
                    {detail.subjectSkills.map((ss) => (
                      <span
                        key={`${ss.subjectId}-${ss.skillId}`}
                        className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs border border-blue-100"
                      >
                        {ss.skill?.skillName ?? `Skill #${ss.skillId}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {detail.subjectSessions && detail.subjectSessions.length > 0 && (
              <div className="pt-3 space-y-2">
                <div className="text-xs font-semibold text-gray-600 uppercase">
                  Danh sách buổi học trong môn
                </div>
                <div className="border rounded-md divide-y">
                  {detail.subjectSessions.map((session) => (
                    <div key={session.subjectSessionId} className="px-3 py-2 flex gap-3 items-start">
                      <div className="w-10 text-xs font-semibold text-gray-700">
                        Buổi {session.sessionNo}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="text-sm font-medium">{session.title}</div>
                        <div className="text-xs text-gray-500">
                          Thời lượng: {session.duration || '—'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ),
        okText: 'Đóng',
      })
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Không tải được chi tiết môn học'
      message.error(msg)
    }
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
        <Button
          className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
          onClick={openCreateModal}
        >
          Thêm môn học
        </Button>
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
        title={isCreating ? 'Tạo môn học' : 'Cập nhật môn học'}
        description={
          isCreating
            ? 'Tạo mới một môn học trong hệ thống.'
            : 'Chỉnh sửa thông tin cơ bản của môn học.'
        }
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

          {!isCreating && (
            <div className="space-y-2">
              <Label>Chủ đề</Label>
              <select
                value={selectedTopicId ?? ''}
                onChange={(e) =>
                  setSelectedTopicId(e.target.value === '' ? null : Number(e.target.value))
                }
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">— Không chọn chủ đề —</option>
                {allTopics.map((t) => (
                  <option key={t.topicId} value={t.topicId}>
                    {t.topicName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!isCreating && (
            <div className="space-y-2">
              <Label>Kỹ năng của môn học</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border p-3">
                {allSkills.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Đang tải kỹ năng...</p>
                ) : (
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {allSkills.map((skill) => (
                      <label
                        key={skill.skillId}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedSkillIds.includes(skill.skillId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSkillIds((prev) => [...prev, skill.skillId])
                            } else {
                              setSelectedSkillIds((prev) =>
                                prev.filter((id) => id !== skill.skillId),
                              )
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span>{skill.skillName}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Các buổi học trong môn</Label>
            <div className="max-h-56 overflow-y-auto rounded-md border p-3 space-y-2">
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Chưa có buổi học nào. Nhấn "Thêm buổi" để tạo.
                </p>
              ) : (
                sessions
                  .slice()
                  .sort((a, b) => a.sessionNo - b.sessionNo)
                  .map((s) => (
                    <div
                      key={s.subjectSessionId ?? `new-${s.sessionNo}`}
                      className="flex items-start justify-between gap-3 border rounded-md px-3 py-2"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="text-xs text-gray-500 mb-1">Buổi {s.sessionNo}</div>
                        <Input
                          value={s.title}
                          onChange={(e) =>
                            setSessions((prev) =>
                              prev.map((it) =>
                                it === s ? { ...it, title: e.target.value } : it,
                              ),
                            )
                          }
                          placeholder={`Tiêu đề buổi ${s.sessionNo}`}
                          className="text-sm mb-1"
                        />
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label className="text-xs text-gray-500">
                              Thời lượng 
                            </Label>
                            <Input
                              value={s.duration}
                              onChange={(e) =>
                                setSessions((prev) =>
                                  prev.map((it) =>
                                    it === s ? { ...it, duration: e.target.value } : it,
                                  ),
                                )
                              }
                              placeholder="Ví dụ: 01:30:00"
                              className="text-xs"
                            />
                          </div>
                        </div>
                        <div className="mt-1">
                          <Label className="text-xs text-gray-500">Mô tả</Label>
                          <textarea
                            value={s.description}
                            onChange={(e) =>
                              setSessions((prev) =>
                                prev.map((it) =>
                                  it === s ? { ...it, description: e.target.value } : it,
                                ),
                              )
                            }
                            rows={2}
                            className="w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            placeholder="Mô tả nội dung buổi học"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSessionLocal(s.subjectSessionId, s.sessionNo)}
                        title="Xoá buổi"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 flex items-center gap-2"
                onClick={handleAddSessionLocal}
              >
                <Plus className="w-4 h-4" />
                Thêm buổi
              </Button>
            </div>
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
            {submitting ? (isCreating ? 'Đang tạo...' : 'Đang lưu...') : isCreating ? 'Tạo' : 'Lưu'}
          </Button>
        </div>
      </Dialog>
    </div>
  )
}