import { useEffect, useRef, useState } from 'react'
import { message } from 'antd'
import equipmentApi from '../api/equipmentApi'
import categoryApi from '@/modules/category/api/categoryApi'
import type { CategoryListItem } from '@/modules/category/category'
import type { EquipmentListItem } from '../equipment'
import {
  EQUIPMENT_STATUS,
  EQUIPMENT_STATUS_OPTIONS,
  getEquipmentStatusColor,
  getEquipmentStatusDisplay,
} from '@/constants/status'
import { Dialog } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { getErrorMessage } from '@/shared/lib/errorMessage'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'

type Props = {
  open: boolean
  onClose: () => void
  equipment: EquipmentListItem | null
  onUpdated?: () => void
}

export default function EditEquipmentModal({
  open,
  onClose,
  equipment,
  onUpdated,
}: Props) {
  const [equipmentName, setEquipmentName] = useState('')
  const [equipmentCode, setEquipmentCode] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [sponsoredBy, setSponsoredBy] = useState('')
  const [status, setStatus] = useState<string>('AVAILABLE')
  const [description, setDescription] = useState('')
  const [handoverMinuteImgFile, setHandoverMinuteImgFile] = useState<File | null>(null)
  const [imgFile, setImgFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<CategoryListItem[]>([])
  const [error, setError] = useState('')

  const handoverMinuteInputRef = useRef<HTMLInputElement | null>(null)
  const imgInputRef = useRef<HTMLInputElement | null>(null)

  // Chuẩn hóa status từ API (có thể là số 1-5 hoặc chuỗi) về string để dùng cho Select
  const normalizeStatusValue = (rawStatus: string | number | null | undefined): string => {
    if (rawStatus === null || rawStatus === undefined) {
      console.warn('Status is null/undefined, defaulting to AVAILABLE')
      return String(EQUIPMENT_STATUS.AVAILABLE)
    }
    
    // Convert to number first
    const numStatus = Number(rawStatus)
    
    // If it's a valid number between 1-5, return it as string
    if (!Number.isNaN(numStatus) && numStatus >= 1 && numStatus <= 5) {
      return String(numStatus)
    }
    
    // Try string matching as fallback
    const s = String(rawStatus).trim().toUpperCase()
    if (s === 'AVAILABLE') return String(EQUIPMENT_STATUS.AVAILABLE)
    if (s === 'BORROWED') return String(EQUIPMENT_STATUS.BORROWED)
    if (s === 'DAMAGED') return String(EQUIPMENT_STATUS.DAMAGED)
    if (s === 'LOST') return String(EQUIPMENT_STATUS.LOST)
    if (s === 'UNAVAILABLE') return String(EQUIPMENT_STATUS.UNAVAILABLE)
    
    console.warn('Unknown status value:', rawStatus, 'defaulting to AVAILABLE')
    return String(EQUIPMENT_STATUS.AVAILABLE)
  }

  useEffect(() => {
    if (open) {
      categoryApi
        .getCategories({ pageNumber: 1, pageSize: 500 })
        .then((res) => setCategories(res.items ?? []))
    }
  }, [open])

  useEffect(() => {
    if (open && equipment) {
      console.log('Equipment status from API:', equipment.status, 'Type:', typeof equipment.status)
      setEquipmentName(equipment.equipmentName ?? '')
      setEquipmentCode(equipment.equipmentCode ?? '')
      setCategoryId(String(equipment.categoryId ?? ''))
      setSponsoredBy(equipment.sponsoredBy ?? '')
      // Sửa: Lấy đúng status hiện tại của thiết bị
      const normalizedStatus = normalizeStatusValue(equipment.status)
      console.log('Normalized status:', normalizedStatus)
      setStatus(normalizedStatus)
      setDescription(equipment.description ?? '')
      setHandoverMinuteImgFile(null)
      setImgFile(null)
      setError('')
      if (handoverMinuteInputRef.current) handoverMinuteInputRef.current.value = ''
      if (imgInputRef.current) imgInputRef.current.value = ''
    }
  }, [open, equipment])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!equipment) return

    const name = equipmentName.trim()
    const code = equipmentCode.trim()
    const sponsor = sponsoredBy.trim()
    const effectiveCategoryId = categoryId || String(equipment.categoryId ?? '')
    const catId = Number(effectiveCategoryId)

    if (!name) return setError('Vui lòng nhập tên thiết bị')
    if (!code) return setError('Vui lòng nhập mã thiết bị')
    if (!effectiveCategoryId || !catId) return setError('Vui lòng chọn danh mục')
    if (!sponsor) return setError('Vui lòng nhập bên cung cấp')

    try {
      setLoading(true)

      await equipmentApi.updateInfo(equipment.equipmentId, {
        categoryId: catId,
        equipmentName: name,
        equipmentCode: code,
        sponsoredBy: sponsor,
        description: description.trim() || undefined,
        imgFile: imgFile ?? null,
        handoverMinuteImgFile: handoverMinuteImgFile ?? null,
      })

      const originalStatus = normalizeStatusValue(equipment.status)
      const nextStatus = normalizeStatusValue(status)
      // Chỉ khóa khi đang Đang mượn; Không khả dụng vẫn cho đổi qua modal
      if (originalStatus !== String(EQUIPMENT_STATUS.BORROWED) && nextStatus && nextStatus !== originalStatus) {
        await equipmentApi.updateStatus(equipment.equipmentId, { status: nextStatus })
      }

      message.success('Cập nhật thiết bị thành công')
      onClose()
      onUpdated?.()
    } catch (err: unknown) {
      const data =
        err && typeof err === 'object' && err != null && 'response' in err
          ? (err as { response?: { data?: unknown } }).response?.data
          : undefined

      const msgFromBe = (() => {
        if (!data) return null
        if (typeof data === 'string') return data.trim() || null
        if (typeof data !== 'object') return null

        const d = data as Record<string, unknown>
        const direct =
          (typeof d.message === 'string' && d.message) ||
          (typeof d.Message === 'string' && d.Message) ||
          (typeof d.error === 'string' && d.error) ||
          (typeof d.title === 'string' && d.title) ||
          null
        if (direct) return String(direct).trim() || null

        const errors = d.errors
        if (Array.isArray(errors)) {
          const first = errors.find((x) => typeof x === 'string' && x.trim())
          return typeof first === 'string' ? first.trim() : null
        }

        return null
      })()

      message.error(msgFromBe || getErrorMessage(err) || 'Cập nhật thiết bị thất bại')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setError('')
    setHandoverMinuteImgFile(null)
    setImgFile(null)
    if (handoverMinuteInputRef.current) handoverMinuteInputRef.current.value = ''
    if (imgInputRef.current) imgInputRef.current.value = ''
    onClose()
  }

  if (!equipment) return null
  const statusValue = normalizeStatusValue(status || equipment.status)
  const isBorrowed = statusValue === String(EQUIPMENT_STATUS.BORROWED)
  const categoryValue = categoryId || String(equipment.categoryId ?? '')

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Chỉnh sửa thiết bị"
      description={`Cập nhật thông tin thiết bị (${equipment.equipmentCode})`}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-equipmentName" className="text-black font-medium">
              Tên thiết bị <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-equipmentName"
              value={equipmentName}
              onChange={(e) => setEquipmentName(e.target.value)}
              className="h-9 text-black placeholder:text-gray-500 border-gray-200"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-equipmentCode" className="text-black font-medium">
              Mã thiết bị <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-equipmentCode"
              value={equipmentCode}
              onChange={(e) => setEquipmentCode(e.target.value)}
              className="h-9 text-black placeholder:text-gray-500 border-gray-200"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-black font-medium">
              Danh mục <span className="text-red-500">*</span>
            </Label>
            <Select
              value={categoryValue || undefined}
              onValueChange={setCategoryId}
            >
              <SelectTrigger className="h-9 w-full text-black border-gray-200">
                <SelectValue placeholder="Chọn danh mục" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem
                    key={c.categoryId}
                    value={String(c.categoryId)}
                    className="text-black"
                  >
                    {c.categoryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-sponsoredBy" className="text-black font-medium">
              Bên cung cấp <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-sponsoredBy"
              value={sponsoredBy}
              onChange={(e) => setSponsoredBy(e.target.value)}
              className="h-9 text-black placeholder:text-gray-500 border-gray-200"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-handoverMinuteImg" className="text-black font-medium">
            Biên bản bàn giao
          </Label>
          <div className="relative">
            <input
              id="edit-handoverMinuteImg"
              ref={handoverMinuteInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (!file) { setHandoverMinuteImgFile(null); return; }
                if (file.size > 10 * 1024 * 1024) {
                  message.warning('Ảnh biên bản bàn giao tối đa 10MB.');
                  e.target.value = '';
                  return;
                }
                setHandoverMinuteImgFile(file);
              }}
              className="hidden"
            />
            <label
              htmlFor="edit-handoverMinuteImg"
              className="flex h-9 w-full cursor-pointer items-center rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50"
            >
              <span className="inline-flex items-center justify-center rounded-md bg-[#2197C0] px-3 py-1 text-xs font-medium text-white hover:bg-[#208AAE] mr-3">
                Chọn tệp
              </span>
              <span className="text-gray-500 text-sm">
                {handoverMinuteImgFile ? handoverMinuteImgFile.name : 'Chưa chọn tệp'}
              </span>
            </label>
          </div>
          <p className="text-xs text-gray-500 break-all">
            Hiện tại: {equipment.handoverMinute}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-black font-medium">Trạng thái</Label>
          {isBorrowed ? (
            <>
              <div
                className={`inline-flex items-center justify-center h-9 w-full px-3 rounded-md text-sm font-medium ${getEquipmentStatusColor(
                  statusValue
                )}`}
                title="Thiết bị đang được mượn (chỉ thay đổi qua phiếu mượn)"
              >
                {getEquipmentStatusDisplay(statusValue)}
              </div>
              <p className="text-xs text-gray-500">
                Thiết bị đang được mượn. Thay đổi trạng thái "Đang mượn" vui
                lòng thao tác qua phiếu mượn.
              </p>
            </>
          ) : (
            <Select value={statusValue} onValueChange={setStatus}>
              <SelectTrigger
                className={`h-9 w-full border-0 text-sm font-medium rounded-md justify-center text-center [&>span]:text-center [&>span]:w-full ${getEquipmentStatusColor(
                  statusValue
                )}`}
              >
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                {EQUIPMENT_STATUS_OPTIONS.filter(
                  (opt) =>
                    // Không cho chọn Đang mượn (chỉ qua phiếu mượn)
                    opt.value !== EQUIPMENT_STATUS.BORROWED
                ).map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-description" className="text-black font-medium">
            Mô tả
          </Label>
          <textarea
            id="edit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-img" className="text-black font-medium">
            Hình ảnh
          </Label>
          <div className="relative">
            <input
              id="edit-img"
              ref={imgInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (!file) { setImgFile(null); return; }
                if (file.size > 10 * 1024 * 1024) {
                  message.warning('Ảnh thiết bị tối đa 10MB.');
                  e.target.value = '';
                  return;
                }
                setImgFile(file);
              }}
              className="hidden"
            />
            <label
              htmlFor="edit-img"
              className="flex h-9 w-full cursor-pointer items-center rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50"
            >
              <span className="inline-flex items-center justify-center rounded-md bg-[#2197C0] px-3 py-1 text-xs font-medium text-white hover:bg-[#208AAE] mr-3">
                Chọn tệp
              </span>
              <span className="text-gray-500 text-sm">
                {imgFile ? imgFile.name : 'Chưa chọn tệp'}
              </span>
            </label>
          </div>
          {equipment.imgLink ? (
            <p className="text-xs text-gray-500 break-all">
              Hiện tại: {equipment.imgLink}
            </p>
          ) : (
            <p className="text-xs text-gray-400 italic">Hiện tại: Không có ảnh</p>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleClose}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-[#2197C0] hover:bg-[#208AAE] text-white"
            disabled={loading}
          >
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
