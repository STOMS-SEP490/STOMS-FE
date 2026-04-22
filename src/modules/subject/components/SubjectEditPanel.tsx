import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  FileText,
  Hash,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/lib/utils'
import type { SubjectListItem } from '../subject'
import type { SubjectSkillItem } from '../api/subjectSkillApi'
import type { SkillListItem } from '@/modules/skill/skill'
import type { TopicListItem } from '@/modules/topic/topic'

type EditableSession = {
  subjectSessionId?: number
  sessionNo: number
  title: string
  duration: string
  description: string
}

type Props = {
  open: boolean
  isCreating: boolean
  submitting: boolean
  editingSubject: SubjectListItem | null

  subjectCode: string
  setSubjectCode: (v: string) => void
  subjectName: string
  setSubjectName: (v: string) => void
  description: string
  setDescription: (v: string) => void
  selectedTopicId: number | null
  setSelectedTopicId: (v: number | null) => void
  allTopics: TopicListItem[]

  subjectSkills: SubjectSkillItem[]
  setSubjectSkills: (fn: (prev: SubjectSkillItem[]) => SubjectSkillItem[]) => void
  allSkills: SkillListItem[]
  showAddSkill: boolean
  setShowAddSkill: (v: boolean) => void
  pendingSkillIdsToAdd: number[]
  setPendingSkillIdsToAdd: (fn: (prev: number[]) => number[]) => void

  sessions: EditableSession[]
  setSessions: (fn: (prev: EditableSession[]) => EditableSession[]) => void
  handleAddSessionLocal: () => void
  handleRemoveSessionLocal: (sessionId?: number, sessionNo?: number) => void

  onClose: () => void
  onSubmit: () => void
}

export function SubjectEditPanel({
  open,
  isCreating,
  submitting,
  editingSubject,
  subjectCode, setSubjectCode,
  subjectName, setSubjectName,
  description, setDescription,
  selectedTopicId, setSelectedTopicId,
  allTopics,
  subjectSkills, setSubjectSkills,
  allSkills,
  showAddSkill, setShowAddSkill,
  pendingSkillIdsToAdd, setPendingSkillIdsToAdd,
  sessions, setSessions,
  handleAddSessionLocal,
  handleRemoveSessionLocal,
  onClose,
  onSubmit,
}: Props) {
  if (!open) return null

  const title = isCreating ? 'Tạo môn học mới' : (editingSubject?.subjectName ?? 'Cập nhật môn học')
  const subLabel = isCreating ? 'MÔN HỌC MỚI' : `CẬP NHẬT • ${editingSubject?.subjectCode ?? ''}`

  return (
    <>
      <div className="fixed inset-0 z-40 h-full bg-black/35" onClick={onClose} aria-hidden />

      <div className={cn(
        'fixed right-0 top-0 z-50 h-full w-[680px] max-w-[96vw]',
        'border-l border-slate-200 bg-white shadow-2xl',
        'flex flex-col overflow-hidden',
      )}>
        {/* ── HEADER ── */}
        <header className="w-full shrink-0 border-b border-slate-200 bg-white">
          <div className="flex w-full items-start justify-between gap-3 px-5 pb-3 pt-4">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-xs font-medium uppercase tracking-widest text-slate-400">{subLabel}</p>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold text-[#1a7a99] truncate">
                  {title}
                </h2>
                {!isCreating && editingSubject && (
                  <Badge className={cn(
                    'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium border-0',
                    editingSubject.isActive
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-700',
                  )}>
                    {editingSubject.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                  </Badge>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* meta bar */}
          {!isCreating && editingSubject ? (
            <div className="grid grid-cols-3 divide-x divide-slate-200 border-t border-slate-200 bg-slate-50">
              <div className="px-5 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Mã môn</p>
                <p className="text-sm font-semibold text-slate-900">{editingSubject.subjectCode || '—'}</p>
              </div>
              <div className="px-5 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Số buổi</p>
                <p className="text-sm font-semibold text-slate-900">{sessions.length}</p>
              </div>
              <div className="px-5 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Kỹ năng</p>
                <p className="text-sm font-semibold text-slate-900">{subjectSkills.length}</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 divide-x divide-slate-200 border-t border-slate-200 bg-slate-50">
              <div className="px-5 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Số buổi</p>
                <p className="text-sm font-semibold text-slate-900">{sessions.length}</p>
              </div>
              <div className="px-5 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#2197C0]">Kỹ năng đã chọn</p>
                <p className="text-sm font-semibold text-slate-900">{pendingSkillIdsToAdd.length}</p>
              </div>
            </div>
          )}
        </header>

        {/* ── BODY ── */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-white px-5 py-4 space-y-5">

          {/* Thông tin chung */}
          <Section icon={Hash} title="Thông tin chung">
            <div className="pl-4 space-y-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[#2197C0]">Mã môn học <span className="text-red-500">*</span></Label>
                  <Input
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value)}
                    placeholder="VD: CS101"
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-[#2197C0]">Chủ đề</Label>
                  <select
                    value={selectedTopicId ?? ''}
                    onChange={(e) => setSelectedTopicId(e.target.value === '' ? null : Number(e.target.value))}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">— Không chọn —</option>
                    {allTopics.map((t) => (
                      <option key={t.topicId} value={t.topicId}>{t.topicName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#2197C0]">Tên môn học <span className="text-red-500">*</span></Label>
                <Input
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="Tên đầy đủ của môn học"
                  className="text-sm"
                />
              </div>
            </div>
          </Section>

          {/* Mô tả */}
          <Section icon={FileText} title="Mô tả">
            <div className="pl-4">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                placeholder="Mô tả ngắn về môn học"
              />
            </div>
          </Section>

          {/* Kỹ năng */}
          <Section icon={Sparkles} title="Kỹ năng">
            <div className="pl-4 space-y-2">
              {/* Danh sách kỹ năng hiện tại (edit mode) */}
              {!isCreating && subjectSkills.length > 0 && (
                <div className="divide-y divide-slate-200 rounded-md border bg-white">
                  {subjectSkills.map((ss) => {
                    const skillName = ss.skillName ?? allSkills.find((s) => s.skillId === ss.skillId)?.skillName ?? `Skill #${ss.skillId}`
                    const isActive = ss.isActive ?? true
                    return (
                      <div key={`${ss.subjectId}-${ss.skillId}`} className="flex items-center justify-between px-3 py-2">
                        <div>
                          <span className="text-sm font-medium text-[#1a7a99]">{skillName}</span>
                          <span className="ml-2 text-xs text-slate-400">#{ss.skillId}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">{isActive ? 'Đang dùng' : 'Tắt'}</span>
                          <Switch
                            checked={isActive}
                            onCheckedChange={(checked) => {
                              setSubjectSkills((prev) =>
                                prev.map((item) =>
                                  item.subjectId === ss.subjectId && item.skillId === ss.skillId
                                    ? { ...item, isActive: checked }
                                    : item,
                                ),
                              )
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Kỹ năng pending (create mode) */}
              {isCreating && pendingSkillIdsToAdd.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {pendingSkillIdsToAdd.map((id) => {
                    const skillName = allSkills.find((s) => s.skillId === id)?.skillName ?? `Skill #${id}`
                    return (
                      <span key={id} className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 text-xs border border-blue-100">
                        {skillName}
                        <button
                          type="button"
                          onClick={() => setPendingSkillIdsToAdd((prev) => prev.filter((x) => x !== id))}
                          className="ml-0.5 text-blue-400 hover:text-blue-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}

              {!isCreating && subjectSkills.length === 0 && !showAddSkill && (
                <p className="py-1 text-sm text-slate-500">Chưa có kỹ năng nào.</p>
              )}

              {/* Popup thêm kỹ năng */}
              {showAddSkill ? (
                <div className="rounded-md border bg-slate-50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">Chọn kỹ năng để thêm</span>
                    <button type="button" onClick={() => setShowAddSkill(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="stoms-scrollbar max-h-40 overflow-y-auto rounded-md border bg-white p-2 space-y-1">
                    {(isCreating
                      ? allSkills
                      : allSkills.filter((skill) => !subjectSkills.some((ss) => ss.skillId === skill.skillId))
                    ).map((skill) => {
                      const checked = pendingSkillIdsToAdd.includes(skill.skillId)
                      return (
                        <label key={skill.skillId} className="flex w-full cursor-pointer items-center gap-3 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300"
                            checked={checked}
                            onChange={(e) => {
                              setPendingSkillIdsToAdd((prev) =>
                                e.target.checked ? [...prev, skill.skillId] : prev.filter((id) => id !== skill.skillId),
                              )
                            }}
                          />
                          <span className="flex-1">{skill.skillName}</span>
                          <span className="text-xs text-slate-400">#{skill.skillId}</span>
                        </label>
                      )
                    })}
                    {!isCreating && allSkills.filter((skill) => !subjectSkills.some((ss) => ss.skillId === skill.skillId)).length === 0 && (
                      <p className="text-sm text-slate-500 px-2 py-1">Tất cả kỹ năng đã được gán.</p>
                    )}
                  </div>
                  {pendingSkillIdsToAdd.length > 0 && (
                    <p className="text-xs text-[#2197C0]">Đã chọn {pendingSkillIdsToAdd.length} kỹ năng — sẽ gán khi bấm Lưu.</p>
                  )}
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1.5 text-xs"
                  onClick={() => setShowAddSkill(true)}
                  disabled={allSkills.length === 0}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Thêm kỹ năng
                </Button>
              )}
            </div>
          </Section>

          {/* Buổi học */}
          <Section icon={BookOpen} title="Các buổi trong môn">
            <div className="pl-4 space-y-2">
              {sessions.length === 0 ? (
                <p className="py-1 text-sm text-slate-500">Chưa có buổi nào. Nhấn "Thêm buổi" để tạo.</p>
              ) : (
                <div className="space-y-2">
                  {sessions
                    .slice()
                    .sort((a, b) => a.sessionNo - b.sessionNo)
                    .map((s) => (
                      <div
                        key={s.subjectSessionId ?? `new-${s.sessionNo}`}
                        className="rounded-md border bg-white px-3 py-2.5 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium uppercase tracking-wide text-[#2197C0]">Buổi {s.sessionNo}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSessionLocal(s.subjectSessionId, s.sessionNo)}
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Xoá buổi"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs text-slate-500">Tiêu đề</Label>
                            <Input
                              value={s.title}
                              onChange={(e) =>
                                setSessions((prev) => prev.map((it) => it === s ? { ...it, title: e.target.value } : it))
                              }
                              placeholder={`Tiêu đề buổi ${s.sessionNo}`}
                              className="text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-500">Thời lượng</Label>
                            <Input
                              value={s.duration}
                              onChange={(e) =>
                                setSessions((prev) => prev.map((it) => it === s ? { ...it, duration: e.target.value } : it))
                              }
                              placeholder="01:30:00"
                              className="text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-500">Mô tả</Label>
                            <Input
                              value={s.description}
                              onChange={(e) =>
                                setSessions((prev) => prev.map((it) => it === s ? { ...it, description: e.target.value } : it))
                              }
                              placeholder="Nội dung buổi"
                              className="text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 text-xs"
                onClick={handleAddSessionLocal}
              >
                <Plus className="h-3.5 w-3.5" />
                Thêm buổi
              </Button>
            </div>
          </Section>
        </div>

        {/* ── FOOTER ── */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-3 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Hủy
          </Button>
          <Button
            className="bg-[#2197C0] hover:bg-[#208AAE] text-white"
            onClick={onSubmit}
            disabled={submitting}
          >
            {submitting ? (isCreating ? 'Đang tạo...' : 'Đang lưu...') : isCreating ? 'Tạo môn học' : 'Lưu thay đổi'}
          </Button>
        </div>
      </div>
    </>
  )
}

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1.5">
        <Icon className="h-4 w-4 shrink-0 text-[#2197C0]" strokeWidth={2} aria-hidden />
        <h3 className="text-sm font-semibold text-black">{title}</h3>
      </div>
      <div>{children}</div>
    </section>
  )
}
