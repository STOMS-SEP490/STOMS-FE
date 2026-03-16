import { useEffect, useState } from 'react'
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
} from '@/constants/equipment'
import { Dialog } from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
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
  const [handoverMinute, setHandoverMinute] = useState('')
  const [status, setStatus] = useState<string>('AVAILABLE')
  const [description, setDescription] = useState('')
  const [imgLink, setImgLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<CategoryListItem[]>([])
  const [error, setError] = useState('')

  // Chuẩn hóa status từ API (có thể là số 1-5 hoặc chuỗi) về enum dùng cho Select
  const normalizeStatusValue = (rawStatus: string | number | null | undefined): string => {
    const s = String(rawStatus ?? '').trim()
    if (!s) return EQUIPMENT_STATUS.AVAILABLE
    if (s === '1') return EQUIPMENT_STATUS.AVAILABLE
    if (s === '2') return EQUIPMENT_STATUS.BORROWED
    if (s === '3') return EQUIPMENT_STATUS.DAMAGED
    if (s === '4') return EQUIPMENT_STATUS.LOST
    if (s === '5') return EQUIPMENT_STATUS.UNAVAILABLE
    const upper = s.toUpperCase()
    if (
      upper === EQUIPMENT_STATUS.AVAILABLE ||
      upper === EQUIPMENT_STATUS.BORROWED ||
      upper === EQUIPMENT_STATUS.DAMAGED ||
      upper === EQUIPMENT_STATUS.LOST ||
      upper === EQUIPMENT_STATUS.UNAVAILABLE
    ) {
      return upper
    }
    return EQUIPMENT_STATUS.AVAILABLE
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
      setEquipmentName(equipment.equipmentName ?? '')
      setEquipmentCode(equipment.equipmentCode ?? '')
      setCategoryId(String(equipment.categoryId ?? ''))
      setSponsoredBy(equipment.sponsoredBy ?? '')
      setHandoverMinute(equipment.handoverMinute ?? '')
      setStatus(normalizeStatusValue(equipment.status ?? EQUIPMENT_STATUS.AVAILABLE))
      setDescription(equipment.description ?? '')
      setImgLink(equipment.imgLink ?? '')
      setError('')
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
        handoverMinute: handoverMinute.trim(),
        description: description.trim(),
        imgLink: imgLink.trim() || null,
      })

      const originalStatus = normalizeStatusValue(
        equipment.status ?? EQUIPMENT_STATUS.AVAILABLE
      )
      const nextStatus = normalizeStatusValue(status)
      // Chỉ khóa khi đang Đang mượn; Không khả dụng vẫn cho đổi qua modal
      if (originalStatus !== EQUIPMENT_STATUS.BORROWED && nextStatus && nextStatus !== originalStatus) {
        await equipmentApi.updateStatus(equipment.equipmentId, { status: nextStatus })
      }

      message.success('Cập nhật thiết bị thành công')
      onClose()
      onUpdated?.()
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : null
      message.error(msg || 'Cập nhật thiết bị thất bại')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setError('')
    onClose()
  }

  if (!equipment) return null
  const statusValue = normalizeStatusValue(
    status || equipment.status || EQUIPMENT_STATUS.AVAILABLE
  )
  const isBorrowed = statusValue === EQUIPMENT_STATUS.BORROWED
  const isUnavailable = statusValue === EQUIPMENT_STATUS.UNAVAILABLE
  const categoryValue = categoryId || String(equipment.categoryId ?? '')

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Chỉnh sửa thiết bị"
      description={`Cập nhật thông tin thiết bị (${equipment.equipmentCode})`}
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
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

        <div className="space-y-1.5">
          <Label htmlFor="edit-handoverMinute" className="text-black font-medium">
            Biên bản bàn giao (link)
          </Label>
          <Input
            id="edit-handoverMinute"
            value={handoverMinute}
            onChange={(e) => setHandoverMinute(e.target.value)}
            placeholder="https://..."
            type="url"
            className="h-9 text-black placeholder:text-gray-500 border-gray-200"
          />
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
                Thiết bị đang được mượn. Thay đổi trạng thái “Đang mượn”/kết thúc mượn vui
                lòng thao tác qua phiếu mượn.
              </p>
            </>
          ) : (
            <Select value={statusValue} onValueChange={setStatus}>
              <SelectTrigger
                className={`relative h-9 w-full border-0 pr-8 text-sm font-medium rounded-md ${
                  isUnavailable
                    ? 'justify-start text-left [&>span]:text-left [&>span]:justify-start'
                    : 'justify-center text-center [&>span]:text-center'
                } [&>span]:w-full [&>svg]:absolute [&>svg]:right-3 [&>svg]:top-1/2 [&>svg]:-translate-y-1/2 ${getEquipmentStatusColor(
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
                  <SelectItem key={opt.value} value={opt.value}>
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
            rows={2}
            className="flex w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="edit-imgLink" className="text-black font-medium">
            Hình ảnh (link)
          </Label>
          <Input
            id="edit-imgLink"
            value={imgLink}
            onChange={(e) => setImgLink(e.target.value)}
            placeholder="https://..."
            className="h-9 text-black placeholder:text-gray-500 border-gray-200"
          />
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

