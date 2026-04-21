import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { useSearchParams } from 'react-router-dom'
import { Eye, Loader2, Pencil, Power, PowerOff, Plus, Layers, CalendarDays, Sigma, TrendingUp, RotateCcw } from 'lucide-react'
import { DataTable } from '@/shared/components/common/DataTable'
import { Badge } from '@/shared/components/ui/badge'
import HoverSearch from '@/shared/components/ui/search'
import { Button } from '@/shared/components/ui/button'
import { message, Modal } from 'antd'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { useAuth } from '@/app/providers/AuthProvider'
import { StatCard } from '@/shared/components/common/StatCard'
import type { SkillListItem } from '@/modules/skill/skill'
import skillApi from '@/modules/skill/api/skillApi'
import type { TopicListItem } from '@/modules/topic/topic'
import topicApi from '@/modules/topic/api/topicApi'
import type { SubjectListItem, SubjectUpsertPayload } from '../subject'
import { useSubjects } from '../hooks/useSubjects'
import subjectApi from '../api/subjectApi'
import subjectSkillApi, { type SubjectSkillItem } from '../api/subjectSkillApi'
import subjectSessionApi from '../api/subjectSessionApi'
import { SubjectDetailDrawer } from '../components/SubjectDetailDrawer'
import { SubjectEditPanel } from '../components/SubjectEditPanel'
import { dashboardCoursesSummaryQueryKey } from '@/modules/dashboard/api/dashboardApi'
import { dashboardApi } from '@/modules/dashboard/api/dashboardApi'
import { useQuery } from '@tanstack/react-query'

type EditableSession = {
  subjectSessionId?: number
  sessionNo: number
  title: string
  duration: string
  description: string
}

export default function SubjectsManagement() {
  const queryClient = useQueryClient()

  const { user } = useAuth()
  const roleId = Number(user?.role ?? 0)
  const isManager = roleId === 1

  const {
    data,
    isListBlocking,
    search,
    setSearch,
    topicId: topicFilterId,
    setTopicId: setTopicFilterId,
    statusFilter,
    setStatusFilter,
    pageNumber,
    pageSize,
    totalItems,
    setPageNumber,
    refetch,
  } = useSubjects({ activeOnly: false })

  const [searchParams, setSearchParams] = useSearchParams()
  const openDetailFromUrl = searchParams.get('openDetail')
  const subjectIdFromUrl = searchParams.get('subjectId')
  const openCreateFromUrl = searchParams.get('openSubjectCreate')

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

  const { data: subjectSessionStats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'subject-session-statistics'],
    queryFn: () => dashboardApi.getSubjectSessionStatistics(),
    staleTime: 60_000,
  })

  const totalSubjectsStat = subjectSessionStats?.totalSubjects ?? 0
  const totalSubjectSessionsStat = subjectSessionStats?.totalSubjectSessions ?? 0
  const avgSessionsPerSubject = subjectSessionStats?.averageSessionsPerSubject ?? 0
  const maxSessionsPerSubject = subjectSessionStats?.maxSessionsPerSubject ?? 0
  const statValue = (loading: boolean, value: number | string) => (loading ? '—' : value)

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
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('openSubjectCreate')
      return next
    })
  }

  const openCreateModal = useCallback(() => {
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
  }, [isManager])

  useEffect(() => {
    if (openCreateFromUrl !== '1') return
    openCreateModal()
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('openSubjectCreate')
      return next
    })
  }, [openCreateFromUrl, openCreateModal, setSearchParams])

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
      topicId: selectedTopicId,
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
        void queryClient.invalidateQueries({ queryKey: dashboardCoursesSummaryQueryKey })
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

      // Gán chủ đề đã được gộp vào payload update ở trên (topicId trong SubjectUpdateRequest)

      // xoá các subjectSession đã uncheck
      for (const id of sessionsToDelete) {
        await subjectSessionApi.delete(id)
      }

      // cập nhật các session đã có id (title/description/duration thay đổi)
      const existingSessions = sessions.filter((s) => s.subjectSessionId)
      for (const s of existingSessions) {
        const durationForApi =
          typeof s.duration === 'string' && /^\d{1,3}:\d{2}:\d{2}$/.test(s.duration)
            ? s.duration
            : '01:00:00'
        await subjectSessionApi.update(s.subjectSessionId!, {
          title: s.title || `Buổi ${s.sessionNo}`,
          description: s.description ?? '',
          duration: durationForApi,
        })
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
      void queryClient.invalidateQueries({ queryKey: dashboardCoursesSummaryQueryKey })
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Có lỗi xảy ra'
      message.error(msg)
      // Yêu cầu: nếu cập nhật lỗi thì đóng popup
      if (!isCreating) {
        setOpenEdit(false)
      }
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
          void queryClient.invalidateQueries({ queryKey: dashboardCoursesSummaryQueryKey })
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
      header: 'Mã môn học',
      cell: ({ row }) => (
        <span className="text-sm font-semibold text-[#1a7a99]">{row.original.subjectCode}</span>
      ),
    },
    {
      accessorKey: 'subjectName',
      header: 'Tên môn học',
      cell: ({ row }) => (
        <div className="min-w-0 truncate text-sm font-medium text-[#1a7a99]">
          {row.original.subjectName}
        </div>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Trạng thái',
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge className="border bg-green-100 text-green-700">Hoạt động</Badge>
        ) : (
          <Badge className="border bg-orange-100 text-orange-600">Ngừng hoạt động</Badge>
        ),
    },
    {
      accessorKey: 'updatedAt',
      header: 'Cập nhật',
      cell: ({ row }) =>
        row.original.updatedAt
          ? new Date(row.original.updatedAt).toLocaleString('vi-VN')
          : '—',
    },
    {
      id: 'actions',
      header: () => <span className="block w-full text-center">Thao tác</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const s = row.original
        return (
          <div className="flex items-center justify-center gap-2">
            <span title="Xem chi tiết">
              <Eye
                size={16}
                className="cursor-pointer text-gray-800"
                onClick={() => handleView(s)}
              />
            </span>
            {isManager ? (
              <>
                <span title="Chỉnh sửa">
                  <Pencil
                    size={16}
                    className="cursor-pointer text-blue-600"
                    onClick={() => void openEditModal(s)}
                  />
                </span>
                {s.isActive ? (
                  <span title="Vô hiệu hóa">
                    <PowerOff
                      size={16}
                      className="cursor-pointer text-red-500"
                      onClick={() => void handleToggleActive(s)}
                    />
                  </span>
                ) : (
                  <span title="Kích hoạt">
                    <Power
                      size={16}
                      className="cursor-pointer text-green-600"
                      onClick={() => void handleToggleActive(s)}
                    />
                  </span>
                )}
              </>
            ) : null}
          </div>
        )
      },
    },
  ], [isManager, handleView, openEditModal, handleToggleActive])

  return (
    <div className="relative flex min-h-[var(--content-height)] flex-col gap-2 app-page-bg p-6 pl-8 pb-8">
      <div className="flex shrink-0 items-center justify-between rounded-xl border bg-white px-6 py-4 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-[#1a7a99]">Quản lý môn học</h2>
          <p className="text-xs text-slate-500">Quản lý môn học và buổi học trong hệ thống</p>
        </div>
        {isManager ? (
          <Button
            onClick={openCreateModal}
            className="gap-2 bg-[#2197C0] hover:bg-[#208AAE] text-white px-3 py-2 rounded-md"
          >
            <Plus size={16} />
            Thêm môn học
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 shrink-0">
        <StatCard
          icon={<Layers className="h-6 w-6" strokeWidth={2} />}
          label="Tổng môn học"
          value={statValue(statsLoading, totalSubjectsStat)}
          sub="Tất cả môn trong hệ thống"
          variant="violet"
        />
        <StatCard
          icon={<CalendarDays className="h-6 w-6" strokeWidth={2} />}
          label="Tổng số buổi"
          value={statValue(statsLoading, totalSubjectSessionsStat)}
          sub="Tổng số buổi theo môn"
          variant="orange"
        />
        <StatCard
          icon={<Sigma className="h-6 w-6" strokeWidth={2} />}
          label="Trung bình buổi/môn"
          value={statsLoading ? '—' : avgSessionsPerSubject.toLocaleString('vi-VN')}
          sub="Average sessions per subject"
          variant="blue"
        />
        <StatCard
          icon={<TrendingUp className="h-6 w-6" strokeWidth={2} />}
          label="Max buổi/môn"
          value={statValue(statsLoading, maxSessionsPerSubject)}
          sub="Giá trị lớn nhất"
          variant="amber"
        />
      </div>

      <div className="shrink-0 px-2 py-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <HoverSearch
            placeholder="Tìm môn học..."
            value={search}
            onChange={(value) => setSearch(value)}
          />
          <Select
            value={topicFilterId == null ? 'all' : String(topicFilterId)}
            onValueChange={(v) => {
              if (v === 'all') setTopicFilterId(null)
              else setTopicFilterId(Number(v))
            }}
          >
            <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[180px] border-slate-200">
              <SelectValue placeholder="Chủ đề" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả chủ đề</SelectItem>
              {allTopics.map((t) => (
                <SelectItem key={t.topicId} value={String(t.topicId)}>
                  {t.topicName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-3">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'inactive')}
            >
              <SelectTrigger className="text-gray-500 text-sm gap-2 bg-white w-[190px] border-slate-200">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="inactive">Ngừng hoạt động</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0 bg-white border-slate-200 text-gray-600 hover:bg-gray-50"
              type="button"
              onClick={() => {
                setSearch('')
                setTopicFilterId(null)
                setStatusFilter('all')
                setPageNumber(1)
              }}
              title="Đặt lại bộ lọc"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col rounded-xl border bg-white p-4 shadow-sm">
      <div className="relative min-h-[200px]">
        <DataTable
          columns={columns}
          data={data}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(page) => setPageNumber(page)}
          comfortable
        />
        {isListBlocking ? (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-md bg-white/75 backdrop-blur-[1px]"
            aria-busy="true"
            aria-live="polite"
          >
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-hidden />
            <span className="text-sm text-slate-500">Đang tải...</span>
          </div>
        ) : null}
      </div>
      </div>

      <SubjectDetailDrawer
        open={detailOpen}
        onClose={closeDetailFromUrl}
        detailSubject={detailSubject}
        detailLoading={detailLoading}
      />

      <SubjectEditPanel
        open={openEdit}
        isCreating={isCreating}
        submitting={submitting}
        editingSubject={editingSubject}
        subjectCode={subjectCode}
        setSubjectCode={setSubjectCode}
        subjectName={subjectName}
        setSubjectName={setSubjectName}
        description={description}
        setDescription={setDescription}
        selectedTopicId={selectedTopicId}
        setSelectedTopicId={setSelectedTopicId}
        allTopics={allTopics}
        subjectSkills={subjectSkills}
        setSubjectSkills={setSubjectSkills}
        allSkills={allSkills}
        showAddSkill={showAddSkill}
        setShowAddSkill={setShowAddSkill}
        pendingSkillIdsToAdd={pendingSkillIdsToAdd}
        setPendingSkillIdsToAdd={setPendingSkillIdsToAdd}
        sessions={sessions}
        setSessions={setSessions}
        handleAddSessionLocal={handleAddSessionLocal}
        handleRemoveSessionLocal={handleRemoveSessionLocal}
        onClose={closeEditModal}
        onSubmit={handleSubmitEdit}
      />
    </div>
  )
}