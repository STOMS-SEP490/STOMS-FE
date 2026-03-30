import { useEffect, useMemo, useRef, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { Eye, Pencil, Power, PowerOff, Trash2, Plus } from 'lucide-react'
import { DataTable } from '@/shared/components/common/DataTable'
import { TableTextAction } from '@/shared/components/common/TableTextAction'
import { Badge } from '@/shared/components/ui/badge'
import HoverSearch from '@/shared/components/ui/search'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Switch } from '@/shared/components/ui/switch'
import { Drawer, message, Modal } from 'antd'
import { useAuth } from '@/app/providers/AuthProvider'
import type { SkillListItem } from '@/modules/skill/skill'
import skillApi from '@/modules/skill/api/skillApi'
import type { TopicListItem } from '@/modules/topic/topic'
import topicApi from '@/modules/topic/api/topicApi'
import type { SubjectListItem, SubjectUpsertPayload } from '../subject'
import { useSubjects } from '../hooks/useSubjects'
import subjectApi from '../api/subjectApi'
import subjectSkillApi, { type SubjectSkillItem } from '../api/subjectSkillApi'
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

  const { user } = useAuth()
  const roleId = Number(user?.role ?? 0)
  const isManager = roleId === 1

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

  const [searchParams, setSearchParams] = useSearchParams()
  const openDetailFromUrl = searchParams.get('openDetail')
  const subjectIdFromUrl = searchParams.get('subjectId')

  // Prevent: user closes detail, but URL params update async -> effect runs once more and re-opens.
  const skipNextAutoOpenRef = useRef(false)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailSubject, setDetailSubject] = useState<SubjectListItem | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const lastOpenedSubjectIdRef = useRef<number | null>(null)

  const closeDetailFromUrl = () => {
    if (openDetailFromUrl === '1') {
      skipNextAutoOpenRef.current = true
    }
    setDetailOpen(false)
    setDetailSubject(null)
    setDetailLoading(false)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('openDetail')
      next.delete('subjectId')
      return next
    })
  }

  const openDetailById = async (id: number) => {
    try {
      setDetailLoading(true)
      const full = await subjectApi.getById(id)
      setDetailSubject(full)
      lastOpenedSubjectIdRef.current = id
      setDetailOpen(true)
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? ((e as { response?: { data?: { message?: string } } }).response?.data?.message ??
              null)
          : null
      message.error(msg ?? 'Không tải được chi tiết môn học')
    } finally {
      setDetailLoading(false)
    }
  }

  const activeSubjectSkills = useMemo(() => {
    if (!detailSubject) return []
    return (detailSubject.subjectSkills ?? []).filter((ss) =>
      ss?.isActive === undefined ? true : ss.isActive === true,
    )
  }, [detailSubject])

  const skillDisplayName = (
    ss: NonNullable<SubjectListItem['subjectSkills']>[number],
  ) => ss.skillName ?? ss.skill?.skillName ?? `Skill #${ss.skillId}`

  const [openEdit, setOpenEdit] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingSubject, setEditingSubject] = useState<SubjectListItem | null>(null)

  const [subjectCode, setSubjectCode] = useState('')
  const [subjectName, setSubjectName] = useState('')
  const [description, setDescription] = useState('')
  const [allSkills, setAllSkills] = useState<SkillListItem[]>([])
  const [subjectSkills, setSubjectSkills] = useState<SubjectSkillItem[]>([])
  const [initialSubjectSkills, setInitialSubjectSkills] = useState<SubjectSkillItem[]>([])
  const [showAddSkill, setShowAddSkill] = useState(false)
  /** Kỹ năng chọn thêm (chưa gọi API); chỉ gọi assignBulk khi bấm Lưu */
  const [pendingSkillIdsToAdd, setPendingSkillIdsToAdd] = useState<number[]>([])
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
    if (!isManager) {
      message.warning('Bạn không có quyền chỉnh sửa môn học.')
      return
    }
    setIsCreating(false)
    setShowAddSkill(false)
    try {
      // luôn lấy bản chi tiết mới nhất để có đủ subjectSkills
      const detail = await subjectApi.getById(s.subjectId)

      setEditingSubject(detail)
      setSubjectCode(detail.subjectCode ?? '')
      setSubjectName(detail.subjectName ?? '')
      setDescription(detail.description ?? '')
      setSelectedTopicId(detail.topicId ?? null)

      // Lấy danh sách subject-skill chi tiết (kèm isActive) từ API filter
      const ssItems = await subjectSkillApi.getBySubject(detail.subjectId)
      // gắn thêm tên kỹ năng để tiện hiển thị
      const withName: SubjectSkillItem[] = ssItems.map((it) => {
        const skill = (detail.subjectSkills ?? []).find((s) => s.skillId === it.skillId)
        return {
          ...it,
          skillName:
            skill?.skillName ??
            skill?.skill?.skillName ??
            `Skill #${it.skillId}`,
        }
      })
      setSubjectSkills(withName)
      setInitialSubjectSkills(withName)
      setPendingSkillIdsToAdd([])

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

      setSubjectSkills([])
      setInitialSubjectSkills([])
      setPendingSkillIdsToAdd([])
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
    if (!isManager) {
      message.warning('Bạn không có quyền thêm môn học.')
      return
    }
    setIsCreating(true)
    setEditingSubject(null)
    setShowAddSkill(false)
    setSubjectCode('')
    setSubjectName('')
    setDescription('')
    setSelectedTopicId(null)
    setSubjectSkills([])
    setPendingSkillIdsToAdd([])
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

        const created = await subjectApi.create(payload)

        // Gán kỹ năng đã chọn khi tạo môn (pendingSkillIdsToAdd)
        if (pendingSkillIdsToAdd.length > 0) {
          const toAddSkillIds = Array.from(new Set(pendingSkillIdsToAdd))
          await subjectSkillApi.assignBulk(created.subjectId, toAddSkillIds)
        }

        message.success('Tạo môn học thành công')
        setPendingSkillIdsToAdd([])
        setOpenEdit(false)
        await refetch()
        return
      }

      if (!editingSubject) return
      await subjectApi.update(editingSubject.subjectId, payloadBase)

      // Gán hàng loạt kỹ năng mới (chỉ khi bấm Lưu)
      const toAddSkillIds = Array.from(
        new Set(
          pendingSkillIdsToAdd.filter(
            (id) => !subjectSkills.some((ss) => ss.skillId === id),
          ),
        ),
      )
      if (toAddSkillIds.length > 0) {
        await subjectSkillApi.assignBulk(editingSubject.subjectId, toAddSkillIds)
        const ssItems = await subjectSkillApi.getBySubject(editingSubject.subjectId)
        const withName: SubjectSkillItem[] = ssItems.map((it) => {
          const s = allSkills.find((x) => x.skillId === it.skillId)
          return {
            ...it,
            skillName: s?.skillName ?? `Skill #${it.skillId}`,
          }
        })
        setSubjectSkills(withName)
        setPendingSkillIdsToAdd([])
      }

      // Cập nhật trạng thái IsActive cho các kỹ năng của môn bằng bulk API
      if (subjectSkills.length > 0 || initialSubjectSkills.length > 0) {
        const originalMap = new Map<number, boolean>(
          initialSubjectSkills.map((ss) => [ss.skillId, ss.isActive ?? true]),
        )
        const currentMap = new Map<number, boolean>(
          subjectSkills.map((ss) => [ss.skillId, ss.isActive ?? true]),
        )

        const allSkillIds = new Set<number>([
          ...Array.from(originalMap.keys()),
          ...Array.from(currentMap.keys()),
        ])

        const toDeactivate: number[] = []
        const toActivate: number[] = []

        allSkillIds.forEach((id) => {
          // chỉ xét các skill đã tồn tại lúc mở modal; skill mới thêm đã được assignBulk riêng
          if (!originalMap.has(id)) return
          const orig = originalMap.get(id) ?? true
          const cur = currentMap.get(id) ?? orig
          if (orig && !cur) toDeactivate.push(id)
          else if (!orig && cur) toActivate.push(id)
        })

        if (toDeactivate.length > 0) {
          await subjectSkillApi.deactivateMany(editingSubject.subjectId, toDeactivate)
        }
        if (toActivate.length > 0) {
          await subjectSkillApi.activateMany(editingSubject.subjectId, toActivate)
        }
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

  const handleView = (s: SubjectListItem) => {
    void openDetailById(s.subjectId)
  }

  useEffect(() => {
    if (openDetailFromUrl !== '1') return
    if (!subjectIdFromUrl) return
    if (skipNextAutoOpenRef.current) {
      skipNextAutoOpenRef.current = false
      return
    }

    const id = Number(subjectIdFromUrl)
    if (!id || Number.isNaN(id)) return

    if (detailOpen && lastOpenedSubjectIdRef.current === id) return

    void openDetailById(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDetailFromUrl, subjectIdFromUrl])

  const columns = useMemo<ColumnDef<SubjectListItem>[]>(() => [
    {
      accessorKey: 'subjectCode',
      header: 'MÃ MÔN HỌC',
      cell: ({ row }) => <div className="text-sm font-medium">{row.original.subjectCode}</div>,
    },
    {
      accessorKey: 'subjectName',
      header: 'TÊN MÔN HỌC',
    },
    {
      accessorKey: 'isActive',
      header: 'TRẠNG THÁI',
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge className="bg-green-100 text-green-700">Hoạt động</Badge>
        ) : (
          <Badge className="bg-orange-100 text-orange-600">Ngừng hoạt động</Badge>
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
          {isManager ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleView(row.original)}
              aria-label="Xem chi tiết"
            >
              <Eye size={16} className="text-gray-800" />
            </Button>
          ) : (
            <TableTextAction onClick={() => handleView(row.original)} />
          )}

          {isManager && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openEditModal(row.original)}
                title="Sửa"
              >
                <Pencil className="w-4 h-4 text-blue-600" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleToggleActive(row.original)}
                title={row.original.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
              >
                {row.original.isActive ? (
                  <PowerOff className="w-4 h-4 text-red-500" />
                ) : (
                  <Power className="w-4 h-4 text-green-600" />
                )}
              </Button>
            </>
          )}
        </div>
      ),
    },
  ], [isManager])

  if (context.position === 'toolbar') {
    return (
      <div className="flex gap-3">
        <HoverSearch
          placeholder="Tìm môn học..."
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPageNumber(1)
          }}
        />
      </div>
    )
  }

  return (
    <div className="stoms-scrollbar h-full overflow-y-auto p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-black">Quản lý môn học</h2>
          <p className="text-xs text-gray-500">Danh sách môn học trong hệ thống</p>
        </div>
        {isManager && (
          <Button
            className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
            onClick={openCreateModal}
          >
            Thêm môn học
          </Button>
        )}
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

      <Drawer
        open={detailOpen}
        onClose={closeDetailFromUrl}
        placement="right"
        width={720}
        title={detailSubject ? `Môn học ${detailSubject.subjectCode}` : 'Chi tiết môn học'}
      >
        {detailLoading && !detailSubject ? (
          <div className="text-sm text-gray-500">Đang tải chi tiết...</div>
        ) : detailSubject ? (
          <div className="stoms-scrollbar space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            <div>
              <div className="text-xs text-gray-500">Tên môn học</div>
              <div className="text-sm font-medium">{detailSubject.subjectName || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Mô tả</div>
              <div className="text-sm">{detailSubject.description || '—'}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-md border p-2">
                <div className="text-xs text-gray-500">Chủ đề</div>
                <div className="text-sm font-medium">
                  {detailSubject.topicName ?? detailSubject.topicId ?? '—'}
                </div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-xs text-gray-500">Số buổi</div>
                <div className="text-sm font-medium">{detailSubject.numberOfSession}</div>
              </div>
            </div>

            <div className="pt-2">
              <div className="text-xs text-gray-500">Trạng thái</div>
              <div className="text-sm">{detailSubject.isActive ? 'Đang hoạt động' : 'Vô hiệu hóa'}</div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-md border p-2">
                <div className="text-xs text-gray-500">Số khóa học đang dùng môn này</div>
                <div className="text-sm font-medium">
                  {detailSubject.courseSubjects ? detailSubject.courseSubjects.length : 0}
                </div>
              </div>

              {activeSubjectSkills.length > 0 && (
                <div className="rounded-md border p-2">
                  <div className="text-xs text-gray-500 mb-1">Kỹ năng liên quan</div>
                  <div className="flex flex-wrap gap-1">
                    {activeSubjectSkills.map((ss) => (
                      <span
                        key={`${ss.subjectId}-${ss.skillId}`}
                        className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs border border-blue-100"
                      >
                        {skillDisplayName(ss)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {detailSubject.subjectSessions && detailSubject.subjectSessions.length > 0 && (
              <div className="pt-3 space-y-2">
                <div className="text-xs font-semibold text-gray-600 uppercase">
                  Danh sách buổi học trong môn
                </div>
                <div className="border rounded-md divide-y">
                  {detailSubject.subjectSessions.map((session) => (
                    <div
                      key={session.subjectSessionId}
                      className="px-3 py-2 flex gap-3 items-start"
                    >
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
        ) : (
          <div className="text-sm text-gray-500">Không có dữ liệu.</div>
        )}
      </Drawer>

      <Drawer
        open={openEdit}
        onClose={closeEditModal}
        placement="right"
        width={520}
        title={isCreating ? 'Tạo môn học' : 'Cập nhật môn học'}
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

          {(isCreating || editingSubject) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Kỹ năng của môn học</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => setShowAddSkill(true)}
                  disabled={allSkills.length === 0}
                >
                  <Plus className="w-4 h-4" />
                  Thêm kỹ năng
                </Button>
              </div>

              {isCreating ? (
                <div className="stoms-scrollbar max-h-40 overflow-y-auto rounded-md border bg-muted/20 p-3 pr-2">
                  {pendingSkillIdsToAdd.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Chưa chọn kỹ năng nào. Nhấn &quot;Thêm kỹ năng&quot; để gán.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {pendingSkillIdsToAdd.map((id) => {
                        const skillName =
                          allSkills.find((s) => s.skillId === id)?.skillName ?? `Skill #${id}`
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs border border-blue-100"
                          >
                            {skillName}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="stoms-scrollbar max-h-40 overflow-y-auto rounded-md border bg-muted/20 p-3 pr-2">
                  {subjectSkills.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Môn học chưa có kỹ năng nào. Nhấn &quot;Thêm kỹ năng&quot; để gán.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {subjectSkills.map((ss) => {
                        const skillName =
                          ss.skillName ??
                          allSkills.find((s) => s.skillId === ss.skillId)?.skillName ??
                          `Skill #${ss.skillId}`;
                        const isActive = ss.isActive ?? true;
                        return (
                          <div
                            key={`${ss.subjectId}-${ss.skillId}`}
                            className="flex items-center justify-between rounded-md border bg-white px-3 py-2"
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-black">{skillName}</span>
                              <span className="text-xs text-gray-500">ID: {ss.skillId}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {isActive ? 'Đang dùng' : 'Đang tắt'}
                              </span>
                              <Switch
                                checked={isActive}
                                onCheckedChange={(checked) => {
                                  setSubjectSkills((prev) =>
                                    prev.map((item) =>
                                      item.subjectId === ss.subjectId &&
                                      item.skillId === ss.skillId
                                        ? { ...item, isActive: checked }
                                        : item,
                                    ),
                                  );
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Popup thêm kỹ năng: chọn nhiều, bấm Lưu mới gọi assignBulk */}
          {showAddSkill && (isCreating || editingSubject) && (
            <div className="space-y-2 rounded-md border bg-white p-3">
              <div className="flex items-center justify-between">
                <Label>Thêm kỹ năng cho môn</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddSkill(false);
                  }}
                >
                  Đóng
                </Button>
              </div>
              <div className="text-xs text-gray-500 mb-1">
                Chọn một hoặc nhiều kỹ năng chưa gán; bấm <strong>Lưu</strong> để gán hàng loạt.
              </div>
              <div className="stoms-scrollbar max-h-40 overflow-y-auto rounded-md border bg-muted/20 p-3 pr-2">
                {allSkills.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Đang tải kỹ năng...</p>
                ) : (
                  <div className="space-y-2">
                    {(isCreating
                      ? allSkills
                      : allSkills.filter(
                          (skill) =>
                            !subjectSkills.some((ss) => ss.skillId === skill.skillId),
                        )
                    ).map((skill) => {
                        const checked = pendingSkillIdsToAdd.includes(skill.skillId);
                        return (
                          <label
                            key={skill.skillId}
                            className="flex w-full cursor-pointer items-center gap-3 rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300"
                              checked={checked}
                              onChange={(e) => {
                                setPendingSkillIdsToAdd((prev) =>
                                  e.target.checked
                                    ? [...prev, skill.skillId]
                                    : prev.filter((id) => id !== skill.skillId),
                                );
                              }}
                            />
                            <span className="flex-1">{skill.skillName}</span>
                            <span className="text-xs text-gray-400">#{skill.skillId}</span>
                          </label>
                        );
                      })}
                    {!isCreating && allSkills.filter(
                      (skill) => !subjectSkills.some((ss) => ss.skillId === skill.skillId),
                    ).length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Tất cả kỹ năng đã được gán cho môn này.
                      </p>
                    )}
                  </div>
                )}
              </div>
              {pendingSkillIdsToAdd.length > 0 && (
                <p className="text-xs text-[#2197C0]">
                  Đã chọn {pendingSkillIdsToAdd.length} kỹ năng — sẽ gán khi bấm Lưu.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Các buổi học trong môn</Label>
            <div className="stoms-scrollbar max-h-56 overflow-y-auto rounded-md border bg-muted/20 p-3 pr-2 space-y-2">
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
      </Drawer>
    </div>
  )
}